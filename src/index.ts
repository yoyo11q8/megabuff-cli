#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import * as readline from "readline/promises";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as clipboardy from "clipboardy";
import { getApiKeyInfo, setApiKey, removeApiKey, hasApiKey, getConfig, getProvider, setProvider, setModel, getModel, normalizeProvider, getProviderForModel, MODEL_PROVIDER_MAP, PROVIDERS, type Provider } from "./config.js";
import { getDefaultModel } from "./models.js";

const program = new Command();

function isDevMode(): boolean {
    // `npm run dev` sets npm_lifecycle_event=dev
    if (process.env.npm_lifecycle_event === "dev") return true;
    if (process.env.NODE_ENV === "development") return true;
    if (process.env.MEGABUFF_DEBUG === "1" || process.env.MEGABUFF_DEBUG === "true") return true;
    return false;
}

function debugLog(...args: unknown[]) {
    if (!isDevMode()) return;
    // stderr to avoid polluting stdout output/pipes
    console.error("[megabuff:debug]", ...args);
}

function maskSecret(secret: string | undefined): string {
    if (!secret) return "<none>";
    if (secret.length <= 10) return "<redacted>";
    return `${secret.slice(0, 3)}…${secret.slice(-2)}`;
}

program
    .name("megabuff")
    .description("AI prompt optimizer CLI")
    .version("Beta");

/**
 * Get input from various sources with priority:
 * 1. Inline argument
 * 2. File input (--file flag)
 * 3. Stdin pipe
 * 4. Interactive prompt
 */
async function getInput(inlinePrompt: string | undefined, options: { file?: string }): Promise<string> {
    // Priority 1: Inline argument
    if (inlinePrompt) {
        debugLog("input.source=inline", { length: inlinePrompt.length });
        return inlinePrompt;
    }

    // Priority 2: File input
    if (options.file) {
        try {
            debugLog("input.source=file", { path: options.file });
            return await fs.readFile(options.file, "utf-8");
        } catch (error) {
            throw new Error(`Failed to read file: ${options.file}`);
        }
    }

    // Priority 3: Check if stdin is piped
    if (!process.stdin.isTTY) {
        debugLog("input.source=stdin");
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString("utf-8").trim();
    }

    // Priority 4: Interactive prompt
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    debugLog("input.source=interactive");
    console.log("Enter your prompt (press Ctrl+D when done):");
    const lines: string[] = [];

    rl.on("line", (line) => {
        lines.push(line);
    });

    return new Promise((resolve) => {
        rl.on("close", () => {
            resolve(lines.join("\n"));
        });
    });
}

/**
 * Optimize a prompt using OpenAI
 */
async function optimizePromptOpenAI(prompt: string, apiKey: string, model?: string): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const selectedModel = model ?? getDefaultModel("openai");

    const systemPrompt = `You are an expert prompt engineer. Your task is to analyze and optimize prompts for AI language models.

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for clarity
4. Specify expected output format if not present
5. Make the prompt more specific and actionable

Return ONLY the optimized prompt, without explanations or meta-commentary.`;

    try {
        debugLog("openai.request.start", { model: selectedModel, promptLength: prompt.length });
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Optimize this prompt:\n\n${prompt}` }
            ],
            temperature: 0.7,
        });

        debugLog("openai.request.done", { choices: response.choices?.length });
        return response.choices[0]?.message?.content || "Error: No response from OpenAI";
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Optimize a prompt using Anthropic Claude
 */
async function optimizePromptAnthropic(prompt: string, apiKey: string, model?: string): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const selectedModel = model ?? getDefaultModel("anthropic");

    const systemPrompt = `You are an expert prompt engineer. Your task is to analyze and optimize prompts for AI language models.

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for better clarity
4. Ensure the prompt follows best practices
5. Make it more specific and actionable

Return ONLY the optimized prompt without explanations or meta-commentary.`;

    try {
        debugLog("anthropic.request.start", { model: selectedModel, promptLength: prompt.length });
        const response = await anthropic.messages.create({
            model: selectedModel,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: `Optimize this prompt:\n\n${prompt}`
                }
            ]
        });

        debugLog("anthropic.request.done", { contentItems: response.content?.length });
        const content = response.content?.[0];
        if (content?.type === "text") {
            return content.text;
        }

        throw new Error("Unexpected response format from Anthropic API");
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Anthropic API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Optimize a prompt using Google Gemini
 */
async function optimizePromptGemini(prompt: string, apiKey: string, modelName?: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedModel = modelName ?? getDefaultModel("google");

    const systemPrompt = `You are an expert prompt engineer. Your task is to analyze and optimize prompts for AI language models.

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for better clarity
4. Ensure the prompt follows best practices
5. Make it more specific and actionable

Return ONLY the optimized prompt without explanations or meta-commentary.`;

    try {
        debugLog("gemini.request.start", { model: selectedModel, promptLength: prompt.length });
        const model = genAI.getGenerativeModel({
            model: selectedModel,
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(`Optimize this prompt:\n\n${prompt}`);
        const response = result.response;
        const text = response.text();

        debugLog("gemini.request.done", { responseLength: text.length });

        if (!text) {
            throw new Error("No response from Gemini API");
        }

        return text;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Gemini API error: ${error.message}`);
        }
        throw error;
    }
}

function formatProviderName(provider: Provider): string {
    if (provider === "openai") return "OpenAI";
    if (provider === "anthropic") return "Anthropic";
    if (provider === "google") return "Google";
    if (provider === "azure-openai") return "Azure OpenAI";
    return provider;
}

function createSpinner(message: string) {
    // Only show spinners in interactive terminals (don't break pipes/logs)
    const enabled = !!process.stderr.isTTY;
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;
    let timer: NodeJS.Timeout | undefined;
    let lastLen = 0;

    const render = (text: string) => {
        const frame = frames[i++ % frames.length];
        const line = `${frame} ${text}`;
        const padded = line + " ".repeat(Math.max(0, lastLen - line.length));
        lastLen = Math.max(lastLen, line.length);
        process.stderr.write(`\r${padded}`);
    };

    return {
        start() {
            if (!enabled) return;
            render(message);
            timer = setInterval(() => render(message), 80);
        },
        stop(finalText?: string) {
            if (!enabled) return;
            if (timer) clearInterval(timer);
            timer = undefined;
            const text = finalText ?? message;
            const padded = text + " ".repeat(Math.max(0, lastLen - text.length));
            process.stderr.write(`\r${padded}\n`);
        },
        fail(finalText?: string) {
            if (!enabled) return;
            if (timer) clearInterval(timer);
            timer = undefined;
            const text = finalText ?? message;
            const padded = text + " ".repeat(Math.max(0, lastLen - text.length));
            process.stderr.write(`\r${padded}\n`);
        }
    };
}

function formatProviderLabel(p: Provider): string {
    if (p === "openai") return "OpenAI";
    if (p === "anthropic") return "Anthropic";
    if (p === "google") return "Google Gemini";
    if (p === "azure-openai") return "Azure OpenAI (coming soon)";
    return p;
}

async function promptFirstRunConfig(): Promise<{ provider: Provider; apiKey: string; useKeychain: boolean }> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        console.log("\nNo BYOK token configured yet.");
        console.log("Select the provider that will supply the token:\n");

        PROVIDERS.forEach((p, idx) => {
            console.log(`  ${idx + 1}) ${formatProviderLabel(p)}`);
        });

        let provider: Provider | undefined;
        while (!provider) {
            const raw = await rl.question("\nProvider (number or name): ");
            const trimmed = raw.trim();
            const asNum = Number(trimmed);
            if (Number.isFinite(asNum) && asNum >= 1 && asNum <= PROVIDERS.length) {
                provider = PROVIDERS[asNum - 1];
                break;
            }
            provider = normalizeProvider(trimmed);
            if (!provider) {
                console.log(`Please choose one of: ${PROVIDERS.join(", ")}`);
            }
        }

        const apiKey = (await rl.question("Enter your BYOK token: ")).trim();
        if (!apiKey) {
            throw new Error("No token provided.");
        }

        const store = (await rl.question("Store in system keychain? (Y/n): ")).trim().toLowerCase();
        const useKeychain = store === "" || store === "y" || store === "yes";

        if (!provider) {
            throw new Error("No provider selected.");
        }

        return { provider, apiKey, useKeychain };
    } finally {
        rl.close();
    }
}

/**
 * Output the result based on options
 */
async function outputResult(
    original: string,
    optimized: string,
    options: { output?: string; interactive?: boolean; copy?: boolean }
): Promise<void> {
    // Copy to clipboard by default (unless --no-copy is used)
    if (options.copy !== false) {
        try {
            await clipboardy.default.write(optimized);
            console.error("✓ Copied to clipboard — press Ctrl+V (or Paste) to use the optimized prompt");
            console.error("");
            console.error("──────────────────────────────────────────────────");
            console.error("");
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error(`⚠ Failed to copy to clipboard: ${errMsg}`);
        }
    }

    // If output file specified, write to file
    if (options.output) {
        await fs.writeFile(options.output, optimized, "utf-8");
        console.error(`✓ Optimized prompt saved to: ${options.output}`);
        // Still print to stdout for piping
        if (!options.interactive) {
            console.log(optimized);
        }
        return;
    }

    // If interactive mode, show comparison
    if (options.interactive) {
        console.log("\n" + "=".repeat(50));
        console.log("ORIGINAL PROMPT:");
        console.log("=".repeat(50));
        console.log(original);
        console.log("\n" + "=".repeat(50));
        console.log("OPTIMIZED PROMPT:");
        console.log("=".repeat(50));
        console.log(optimized);
        console.log("=".repeat(50) + "\n");
        return;
    }

    // Default: print to stdout (pipeable)
    console.log(optimized);
}

// Helper function to get available models by provider
function getModelsByProvider(provider: Provider): string[] {
    return Object.entries(MODEL_PROVIDER_MAP)
        .filter(([_, p]) => p === provider)
        .map(([model]) => model);
}

// Interactive config setup
async function interactiveConfig(): Promise<void> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        console.log("\n╭─────────────────────────────────────╮");
        console.log("│   MegaBuff Configuration Setup     │");
        console.log("╰─────────────────────────────────────╯\n");
        console.log("What would you like to configure?\n");
        console.log("  1) Set API token for a provider");
        console.log("  2) Set default provider");
        console.log("  3) Set model (auto-selects provider)");
        console.log("  4) View current configuration");
        console.log("  5) Exit\n");

        const choice = await rl.question("Enter your choice (1-5): ");

        switch (choice.trim()) {
            case "1": {
                // Set token
                console.log("\nSelect provider:\n");
                PROVIDERS.forEach((p, idx) => {
                    console.log(`  ${idx + 1}) ${formatProviderLabel(p)}`);
                });

                const providerChoice = await rl.question("\nProvider (number or name): ");
                const providerNum = Number(providerChoice);
                let provider: Provider | undefined;

                if (Number.isFinite(providerNum) && providerNum >= 1 && providerNum <= PROVIDERS.length) {
                    provider = PROVIDERS[providerNum - 1];
                } else {
                    provider = normalizeProvider(providerChoice);
                }

                if (!provider) {
                    console.error(`Error: Invalid provider. Valid options: ${PROVIDERS.join(", ")}`);
                    process.exit(1);
                }

                const token = (await rl.question("Enter your API token: ")).trim();
                if (!token) {
                    console.error("Error: No token provided");
                    process.exit(1);
                }

                const store = (await rl.question("Store in system keychain? (Y/n): ")).trim().toLowerCase();
                const useKeychain = store === "" || store === "y" || store === "yes";

                await setApiKey(provider, token, useKeychain);
                console.log(`\n✓ ${provider} token saved${useKeychain ? " securely in system keychain" : " to config file"}`);
                if (!useKeychain) {
                    console.log("  Tip: Run with --keychain flag next time for more secure storage");
                }
                break;
            }

            case "2": {
                // Set default provider
                console.log("\nSelect default provider:\n");
                PROVIDERS.forEach((p, idx) => {
                    console.log(`  ${idx + 1}) ${formatProviderLabel(p)}`);
                });

                const providerChoice = await rl.question("\nProvider (number or name): ");
                const providerNum = Number(providerChoice);
                let provider: Provider | undefined;

                if (Number.isFinite(providerNum) && providerNum >= 1 && providerNum <= PROVIDERS.length) {
                    provider = PROVIDERS[providerNum - 1];
                } else {
                    provider = normalizeProvider(providerChoice);
                }

                if (!provider) {
                    console.error(`Error: Invalid provider. Valid options: ${PROVIDERS.join(", ")}`);
                    process.exit(1);
                }

                await setProvider(provider);
                console.log(`\n✓ Default provider set to: ${provider}`);
                break;
            }

            case "3": {
                // Set model (auto-selects provider)
                console.log("\nAvailable models by provider:\n");

                PROVIDERS.forEach((provider) => {
                    const models = getModelsByProvider(provider);
                    if (models.length > 0) {
                        console.log(`${formatProviderName(provider)}:`);
                        models.forEach(model => console.log(`  - ${model}`));
                        console.log();
                    }
                });

                const modelInput = (await rl.question("Enter model name: ")).trim();
                if (!modelInput) {
                    console.error("Error: No model provided");
                    process.exit(1);
                }

                const provider = getProviderForModel(modelInput);
                if (!provider) {
                    console.error(`Error: Unknown model '${modelInput}'`);
                    console.error("Tip: Use one of the models listed above");
                    process.exit(1);
                }

                await setModel(modelInput);
                console.log(`\n✓ Model set to: ${modelInput}`);
                console.log(`✓ Provider auto-set to: ${provider}`);
                break;
            }

            case "4": {
                // Show config
                const config = await getConfig();
                const currentProvider = await getProvider();
                const currentModel = await getModel();
                const effectiveModel = currentModel ?? getDefaultModel(currentProvider);
                const providerStatuses = await Promise.all(
                    PROVIDERS.map(async (p) => [p, await hasApiKey(p)] as const)
                );

                console.log("\n╭─────────────────────────────────────╮");
                console.log("│      Current Configuration          │");
                console.log("╰─────────────────────────────────────╯\n");
                console.log(`Provider: ${currentProvider}`);
                console.log(`Model: ${currentModel ? effectiveModel : `${effectiveModel} (default for provider)`}`);
                console.log(`Storage: ${config.useKeychain ? "System Keychain" : "Config File"}`);
                console.log("\nAPI Tokens:");
                for (const [p, ok] of providerStatuses) {
                    console.log(`  ${p}: ${ok ? "✓ Configured" : "✗ Not configured"}`);
                }
                console.log(`\nConfig file: ~/.megabuff/config.json`);
                break;
            }

            case "5": {
                console.log("\nExiting...");
                break;
            }

            default: {
                console.error("Invalid choice. Please enter 1-5.");
                process.exit(1);
            }
        }
    } finally {
        rl.close();
    }
}

// Config command
const configCmd = program
    .command("config")
    .description("Manage configuration (run without arguments for interactive setup)")
    .action(async () => {
        // Interactive mode when no subcommand
        if (process.stdin.isTTY && process.stdout.isTTY) {
            await interactiveConfig();
        } else {
            console.error("Error: Interactive mode requires a TTY. Use subcommands instead:");
            console.error("  megabuff config token <token> --provider <provider>");
            console.error("  megabuff config provider <provider>");
            console.error("  megabuff config model <model>");
            console.error("  megabuff config show");
            process.exit(1);
        }
    });

configCmd
    .command("token")
    .description("Set API token for a provider")
    .argument("[token]", "API token (omit to be prompted)")
    .option("-p, --provider <provider>", `Provider (${PROVIDERS.join(", ")})`, "openai")
    .option("--keychain", "Store in system keychain (more secure)")
    .action(async (token: string | undefined, options) => {
        try {
            const provider = normalizeProvider(options.provider);
            if (!provider) {
                console.error(`Error: Invalid provider '${options.provider}'. Valid options: ${PROVIDERS.join(", ")}`);
                process.exit(1);
            }

            let finalToken = token;
            if (!finalToken) {
                if (!process.stdin.isTTY) {
                    console.error("Error: Missing token argument. Provide it inline or run in an interactive terminal.");
                    process.exit(1);
                }
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                try {
                    finalToken = (await rl.question("Enter your API token: ")).trim();
                } finally {
                    rl.close();
                }
            }

            if (!finalToken) {
                console.error("Error: No token provided");
                process.exit(1);
            }

            await setApiKey(provider, finalToken, options.keychain || false);
            if (options.keychain) {
                console.log(`✓ ${provider} token saved securely in system keychain`);
            } else {
                console.log(`✓ ${provider} token saved to config file`);
                console.log("  Tip: Use --keychain flag for more secure storage");
            }
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

configCmd
    .command("provider")
    .description("Get or set the default provider")
    .argument("[provider]", `Provider (${PROVIDERS.join(", ")})`)
    .action(async (providerArg: string | undefined) => {
        try {
            if (!providerArg) {
                const p = await getProvider();
                console.log(`Default provider: ${p}`);
                return;
            }

            const p = normalizeProvider(providerArg);
            if (!p) {
                console.error(`Error: Invalid provider '${providerArg}'. Valid options: ${PROVIDERS.join(", ")}`);
                process.exit(1);
            }

            await setProvider(p);
            console.log(`✓ Default provider set to: ${p}`);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

configCmd
    .command("model")
    .description("Get or set the model (auto-sets provider)")
    .argument("[model]", "Model name (e.g., gpt-4o, claude-sonnet-4-5)")
    .action(async (modelArg: string | undefined) => {
        try {
            if (!modelArg) {
                const m = await getModel();
                const p = await getProvider();
                const effectiveModel = m ?? getDefaultModel(p);
                console.log(`Current model: ${m ? effectiveModel : `${effectiveModel} (default for provider)`}`);
                console.log(`Current provider: ${p}`);
                return;
            }

            const provider = getProviderForModel(modelArg);
            if (!provider) {
                console.error(`Error: Unknown model '${modelArg}'`);
                console.error("\nAvailable models:");
                PROVIDERS.forEach(p => {
                    const models = getModelsByProvider(p);
                    if (models.length > 0) {
                        console.error(`\n${formatProviderName(p)}:`);
                        models.forEach(m => console.error(`  - ${m}`));
                    }
                });
                process.exit(1);
            }

            await setModel(modelArg);
            console.log(`✓ Model set to: ${modelArg}`);
            console.log(`✓ Provider auto-set to: ${provider}`);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

configCmd
    .command("show")
    .description("Show current configuration")
    .action(async () => {
        try {
            const config = await getConfig();
            const selectedProvider = await getProvider();
            const selectedModel = await getModel();
            const effectiveModel = selectedModel ?? getDefaultModel(selectedProvider);
            const providerStatuses = await Promise.all(
                PROVIDERS.map(async (p) => [p, await hasApiKey(p)] as const)
            );

            console.log("Current configuration:");
            console.log(`  Provider: ${selectedProvider}`);
            console.log(`  Model: ${selectedModel ? effectiveModel : `${effectiveModel} (default for provider)`}`);
            console.log(`  Storage: ${config.useKeychain ? "System Keychain" : "Config File"}`);
            console.log("\nAPI Tokens:");
            for (const [p, ok] of providerStatuses) {
                console.log(`  ${p}: ${ok ? "✓ Configured" : "✗ Not configured"}`);
            }
            console.log(`\nConfig location: ~/.megabuff/config.json`);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

configCmd
    .command("remove")
    .description("Remove saved token for a provider")
    .option("-p, --provider <provider>", `Provider (${PROVIDERS.join(", ")})`)
    .action(async (options) => {
        try {
            const provider = await getProvider(options.provider);
            await removeApiKey(provider);
            console.log(`✓ ${provider} token removed from config and keychain`);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

// Optimize command
program
    .command("optimize")
    .description("Optimize an AI prompt")
    .argument("[prompt]", "The prompt to optimize (or omit to use other input methods)")
    .option("-f, --file <path>", "Read prompt from file")
    .option("-o, --output <path>", "Write optimized prompt to file")
    .option("-i, --interactive", "Show interactive comparison view")
    .option("--no-copy", "Don't copy optimized prompt to clipboard (copy is default)")
    .option("-k, --api-key <key>", "Provider API key/token (overrides saved config)")
    .option("-p, --provider <provider>", `Provider (${PROVIDERS.join(", ")})`)
    .action(async (inlinePrompt, options) => {
        try {
            debugLog("optimize.invoked", {
                argv: process.argv.slice(2),
                tty: { stdin: !!process.stdin.isTTY, stdout: !!process.stdout.isTTY, stderr: !!process.stderr.isTTY },
                options: { file: options.file, output: options.output, interactive: !!options.interactive, copy: options.copy !== false, provider: options.provider, hasApiKeyFlag: !!options.apiKey }
            });
            const original = await getInput(inlinePrompt, options);

            if (!original.trim()) {
                console.error("Error: No prompt provided");
                process.exit(1);
            }

            let provider = await getProvider(options.provider);
            debugLog("provider.selected", { provider });

            // Get API key with priority: CLI flag > env var > keychain > config file
            let { apiKey, source } = await getApiKeyInfo(provider, options.apiKey);
            debugLog("token.resolved", { provider, source, token: maskSecret(apiKey) });

            // Interactive first-run setup (TTY only)
            if (!apiKey && process.stdin.isTTY && process.stdout.isTTY) {
                debugLog("token.missing.firstRunPrompt.start");
                const firstRun = await promptFirstRunConfig();
                debugLog("token.missing.firstRunPrompt.done", { provider: firstRun.provider, useKeychain: firstRun.useKeychain, token: maskSecret(firstRun.apiKey) });
                await setApiKey(firstRun.provider, firstRun.apiKey, firstRun.useKeychain);
                provider = firstRun.provider;
                ({ apiKey, source } = await getApiKeyInfo(provider));
                debugLog("token.resolved.afterFirstRun", { provider, source, token: maskSecret(apiKey) });
            }

            if (!apiKey) {
                throw new Error(
                    `No token configured for provider '${provider}'. ` +
                    `Run: megabuff config set --provider ${provider} <token> ` +
                    `or set the appropriate environment variable.`
                );
            }

            // Get the configured model (if any) for this provider
            const configuredModel = await getModel();
            const modelToUse = configuredModel && getProviderForModel(configuredModel) === provider ? configuredModel : undefined;
            debugLog("model.selected", { configuredModel, modelToUse, provider });

            // Route to the appropriate provider's optimization function
            const spinner = createSpinner(`Optimizing with ${formatProviderName(provider)}${modelToUse ? ` (${modelToUse})` : ""}...`);
            spinner.start();

            let optimized: string;
            const t0 = Date.now();
            try {
                if (provider === "openai") {
                    optimized = await optimizePromptOpenAI(original, apiKey, modelToUse);
                } else if (provider === "anthropic") {
                    optimized = await optimizePromptAnthropic(original, apiKey, modelToUse);
                } else if (provider === "google") {
                    optimized = await optimizePromptGemini(original, apiKey, modelToUse);
                } else {
                    throw new Error(
                        `Provider '${provider}' is not supported yet in optimize. ` +
                        `Supported providers: openai, anthropic, google`
                    );
                }
                debugLog("optimize.done", { provider, ms: Date.now() - t0, optimizedLength: optimized.length });
                spinner.stop(`✓ Optimized with ${formatProviderName(provider)}`);
            } catch (e) {
                debugLog("optimize.error", { provider, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) });
                spinner.fail(`✗ Optimization failed (${formatProviderName(provider)})`);
                throw e;
            }

            await outputResult(original, optimized, options);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

program.parse();