#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import * as readline from "readline/promises";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import * as clipboardy from "clipboardy";
import { getApiKeyInfo, setApiKey, removeApiKey, hasApiKey, getConfig, getProvider, normalizeProvider, PROVIDERS, type Provider } from "./config.js";

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
async function optimizePromptOpenAI(prompt: string, apiKey: string): Promise<string> {

    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are an expert prompt engineer. Your task is to analyze and optimize prompts for AI language models.

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for clarity
4. Specify expected output format if not present
5. Make the prompt more specific and actionable

Return ONLY the optimized prompt, without explanations or meta-commentary.`;

    try {
        debugLog("openai.request.start", { model: "gpt-4o-mini", promptLength: prompt.length });
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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
async function optimizePromptAnthropic(prompt: string, apiKey: string): Promise<string> {
    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are an expert prompt engineer. Your task is to analyze and optimize prompts for AI language models.

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for better clarity
4. Ensure the prompt follows best practices
5. Make it more specific and actionable

Return ONLY the optimized prompt without explanations or meta-commentary.`;

    try {
        debugLog("anthropic.request.start", { model: "claude-sonnet-4-5-20250929", promptLength: prompt.length });
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
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
    if (p === "google") return "Google Gemini (coming soon)";
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

// Config command
const configCmd = program
    .command("config")
    .description("Manage configuration");

configCmd
    .command("set")
    .description("Set your BYOK token for a provider")
    .argument("<token>", "Your provider API key / token")
    .option("-p, --provider <provider>", `Provider (${PROVIDERS.join(", ")})`, "openai")
    .option("--keychain", "Store in system keychain (more secure)")
    .action(async (token, options) => {
        try {
            const provider = normalizeProvider(options.provider) || "openai";
            await setApiKey(provider, token, options.keychain || false);
            if (options.keychain) {
                console.log(`✓ ${provider} token saved securely in system keychain`);
            } else {
                console.log(`✓ ${provider} token saved to config file at ~/.megabuff/config.json`);
                console.log("  Tip: Use --keychain flag for more secure storage");
            }
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
            const providerStatuses = await Promise.all(
                PROVIDERS.map(async (p) => [p, await hasApiKey(p)] as const)
            );

            console.log("Current configuration:");
            console.log(`  Provider: ${selectedProvider}`);
            for (const [p, ok] of providerStatuses) {
                console.log(`  ${p} token: ${ok ? "✓ Configured" : "✗ Not configured"}`);
            }
            console.log(`  Storage: ${config.useKeychain ? "System Keychain" : "Config File"}`);
            console.log(`  Model: ${config.model || "gpt-4o-mini (default)"}`);
            console.log(`\nConfig location: ~/.megabuff/config.json`);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

configCmd
    .command("remove")
    .description("Remove saved token")
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

            // Route to the appropriate provider's optimization function
            const spinner = createSpinner(`Optimizing with ${formatProviderName(provider)}...`);
            spinner.start();

            let optimized: string;
            const t0 = Date.now();
            try {
                if (provider === "openai") {
                    optimized = await optimizePromptOpenAI(original, apiKey);
                } else if (provider === "anthropic") {
                    optimized = await optimizePromptAnthropic(original, apiKey);
                } else {
                    throw new Error(
                        `Provider '${provider}' is not supported yet in optimize. ` +
                        `Supported providers: openai, anthropic`
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