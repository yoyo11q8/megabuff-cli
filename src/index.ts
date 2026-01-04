#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import * as readline from "readline/promises";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { xai } from "@ai-sdk/xai";
import { generateText } from "ai";
import * as clipboardy from "clipboardy";
import chalk from "chalk";
import { getApiKeyInfo, setApiKey, removeApiKey, hasApiKey, getConfig, getProvider, setProvider, setModel, getModel, normalizeProvider, getProviderForModel, MODEL_PROVIDER_MAP, PROVIDERS, type Provider, getThemeName, setThemeName } from "./config.js";
import { getDefaultModel } from "./models.js";
import { themes, getAllThemeNames, isValidTheme, type ThemeName } from "./themes.js";
import { getCurrentTheme, clearThemeCache } from "./theme-utils.js";

const program = new Command();

// Initialize theme at startup
let theme = await getCurrentTheme();

// Configure help to use theme colors
program.configureHelp({
    styleTitle: (str) => theme.colors.highlight(str),
    styleCommandText: (str) => theme.colors.primary(str),
    styleCommandDescription: (str) => theme.colors.secondary(str),
    styleDescriptionText: (str) => theme.colors.secondary(str),
    styleOptionText: (str) => theme.colors.info(str),
    styleArgumentText: (str) => theme.colors.accent(str),
    styleSubcommandText: (str) => theme.colors.primary(str),
});

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
    console.error(theme.colors.dim("[megabuff:debug]"), ...args);
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
    console.log(theme.colors.primary("Enter your prompt (press Ctrl+D when done):"));
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
 * Optimization style presets
 */
type OptimizationStyle = "balanced" | "concise" | "detailed" | "technical" | "creative" | "formal" | "casual";

/**
 * Get style-specific optimization instructions
 */
function getStyleInstructions(style: OptimizationStyle): string {
    const styleInstructions: Record<OptimizationStyle, string> = {
        "balanced": "",  // Default behavior, no special instructions

        "concise": `

OPTIMIZATION STYLE: CONCISE
- Prioritize brevity and clarity
- Remove unnecessary words while maintaining precision
- Use direct, action-oriented language
- Keep the optimized prompt as short as possible without losing essential information`,

        "detailed": `

OPTIMIZATION STYLE: DETAILED
- Add comprehensive context and background information
- Include specific examples and edge cases
- Provide detailed guidance on expected outputs
- Elaborate on requirements and constraints`,

        "technical": `

OPTIMIZATION STYLE: TECHNICAL
- Use precise technical terminology
- Include specific implementation details and requirements
- Add technical constraints and specifications
- Structure for code generation or technical tasks`,

        "creative": `

OPTIMIZATION STYLE: CREATIVE
- Encourage imaginative and original outputs
- Add inspiration and creative direction
- Allow for flexibility and exploration
- Focus on generating unique, innovative results`,

        "formal": `

OPTIMIZATION STYLE: FORMAL
- Use professional, formal language
- Structure with clear sections and hierarchy
- Emphasize precision and academic/professional tone
- Suitable for business or academic contexts`,

        "casual": `

OPTIMIZATION STYLE: CASUAL
- Use conversational, friendly language
- Keep instructions approachable and easy to understand
- Maintain clarity without excessive formality
- Make the prompt feel natural and accessible`
    };

    return styleInstructions[style];
}

/**
 * Generate a system prompt optimized for the specific provider and model
 */
function getSystemPrompt(
    provider: Provider,
    model: string,
    style: OptimizationStyle = "balanced",
    customPrompt?: string
): string {
    // If custom prompt is provided, use it directly
    if (customPrompt) {
        return customPrompt;
    }

    const basePrompt = `You are an expert prompt engineer. Your task is to analyze and optimize prompts for AI language models.

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for better clarity
4. Ensure specificity and actionable requests
5. Maintain the original intent while enhancing effectiveness

Return ONLY the optimized prompt without explanations or meta-commentary.`;

    // Add style-specific instructions
    const styleInstructions = getStyleInstructions(style);

    // Provider-specific enhancements
    const providerEnhancements: Record<Provider, string> = {
        "openai": `

Special considerations for OpenAI models:
- Emphasize clear, structured outputs with numbered lists or step-by-step instructions
- Include explicit format specifications (JSON, markdown, etc.) when relevant
- Front-load important context and instructions for better attention`,

        "anthropic": `

Special considerations for Claude (Anthropic):
- Leverage Claude's strong reasoning by including "think step-by-step" guidance when appropriate
- Use XML tags for structured sections when complex parsing is needed
- Emphasize nuanced, detailed instructions that benefit from deep analysis
- Include relevant examples when demonstrating complex tasks`,

        "google": `

Special considerations for Gemini:
- Emphasize concise, clear instructions with specific goals
- Structure prompts with clear headings and logical sections
- Include concrete examples when demonstrating desired output format`,

        "xai": `

Special considerations for Grok:
- Focus on direct, actionable instructions
- Emphasize clarity and specificity
- Structure complex information hierarchically`,

        "deepseek": `

Special considerations for DeepSeek:
- For reasoning tasks: Include analytical thinking prompts and step-by-step breakdown requests
- For conversational tasks: Emphasize clear but precise instructions
- Structure complex tasks into logical sequential steps`,

        "azure-openai": `

Special considerations for Azure OpenAI:
- Follow OpenAI best practices with enterprise-focused clarity
- Emphasize structured outputs and explicit format requirements`
    };

    // Model-specific enhancements
    let modelEnhancement = "";

    // DeepSeek reasoner gets special treatment for analytical tasks
    if (model === "deepseek-reasoner") {
        modelEnhancement = `

IMPORTANT: This is a reasoning-focused model. When optimizing:
- Add explicit instructions to "think through the problem step by step"
- Structure the prompt to encourage analytical breakdown and verification
- Include reasoning checkpoints or self-verification steps where appropriate`;
    }

    // Claude Opus models excel at complex reasoning
    else if (model.includes("opus")) {
        modelEnhancement = `

IMPORTANT: This is a highly capable reasoning model. When optimizing:
- Don't hesitate to add complexity and nuance for sophisticated tasks
- Include multi-step reasoning requirements when beneficial
- Add quality checks or self-verification steps for complex outputs`;
    }

    // Fast/efficient models benefit from conciseness
    else if (model.includes("mini") || model.includes("flash") || model.includes("haiku") || model.includes("lite")) {
        modelEnhancement = `

IMPORTANT: This is a fast, efficient model. When optimizing:
- Keep prompts concise but complete - avoid unnecessary verbosity
- Front-load the most critical instructions and requirements
- Maintain clarity while optimizing for token efficiency`;
    }

    // Vision models need special handling
    else if (model.includes("vision")) {
        modelEnhancement = `

IMPORTANT: This model supports vision capabilities. When optimizing:
- If the prompt involves images, include specific guidance about what to analyze
- Structure image analysis requests with clear focus areas
- Specify desired output format for visual information extraction`;
    }

    return basePrompt + styleInstructions + providerEnhancements[provider] + modelEnhancement;
}

/**
 * Optimize a prompt using OpenAI
 */
async function optimizePromptOpenAI(
    prompt: string,
    apiKey: string,
    model?: string,
    style: OptimizationStyle = "balanced",
    customPrompt?: string
): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const selectedModel = model ?? getDefaultModel("openai");
    const systemPrompt = getSystemPrompt("openai", selectedModel, style, customPrompt);

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
async function optimizePromptAnthropic(
    prompt: string,
    apiKey: string,
    model?: string,
    style: OptimizationStyle = "balanced",
    customPrompt?: string
): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const selectedModel = model ?? getDefaultModel("anthropic");
    const systemPrompt = getSystemPrompt("anthropic", selectedModel, style, customPrompt);

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
async function optimizePromptGemini(
    prompt: string,
    apiKey: string,
    modelName?: string,
    style: OptimizationStyle = "balanced",
    customPrompt?: string
): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const selectedModel = modelName ?? getDefaultModel("google");
    const systemPrompt = getSystemPrompt("google", selectedModel, style, customPrompt);

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

/**
 * Optimize a prompt using xAI (Grok)
 */
async function optimizePromptXAI(
    prompt: string,
    apiKey: string,
    modelName?: string,
    style: OptimizationStyle = "balanced",
    customPrompt?: string
): Promise<string> {
    const selectedModel = modelName ?? getDefaultModel("xai");
    const systemPrompt = getSystemPrompt("xai", selectedModel, style, customPrompt);

    try {
        debugLog("xai.request.start", { model: selectedModel, promptLength: prompt.length });

        // xAI SDK requires the API key to be set as an environment variable
        const originalKey = process.env.XAI_API_KEY;
        process.env.XAI_API_KEY = apiKey;

        try {
            const result = await generateText({
                model: xai(selectedModel),
                system: systemPrompt,
                prompt: `Optimize this prompt:\n\n${prompt}`,
            });

            debugLog("xai.request.done", { textLength: result.text.length });

            if (!result.text) {
                throw new Error("No response from xAI API");
            }

            return result.text;
        } finally {
            // Restore original environment variable
            if (originalKey !== undefined) {
                process.env.XAI_API_KEY = originalKey;
            } else {
                delete process.env.XAI_API_KEY;
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`xAI API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Optimize a prompt using DeepSeek
 */
async function optimizePromptDeepSeek(
    prompt: string,
    apiKey: string,
    modelName?: string,
    style: OptimizationStyle = "balanced",
    customPrompt?: string
): Promise<string> {
    // DeepSeek uses OpenAI-compatible API
    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.deepseek.com"
    });
    const selectedModel = modelName ?? getDefaultModel("deepseek");
    const systemPrompt = getSystemPrompt("deepseek", selectedModel, style, customPrompt);

    try {
        debugLog("deepseek.request.start", { model: selectedModel, promptLength: prompt.length });
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `Optimize this prompt:\n\n${prompt}`
                }
            ]
        });

        debugLog("deepseek.request.done", { choices: response.choices?.length });
        const content = response.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No response from DeepSeek API");
        }

        return content;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`DeepSeek API error: ${error.message}`);
        }
        throw error;
    }
}

function formatProviderName(provider: Provider): string {
    if (provider === "openai") return "OpenAI";
    if (provider === "anthropic") return "Anthropic";
    if (provider === "google") return "Google";
    if (provider === "xai") return "xAI";
    if (provider === "deepseek") return "DeepSeek";
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
        const frame = theme.colors.primary(frames[i++ % frames.length]);
        const line = `${frame} ${theme.colors.dim(text)}`;
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
            const padded = theme.colors.success(`✓ ${text}`) + " ".repeat(Math.max(0, lastLen - text.length));
            process.stderr.write(`\r${padded}\n`);
        },
        fail(finalText?: string) {
            if (!enabled) return;
            if (timer) clearInterval(timer);
            timer = undefined;
            const text = finalText ?? message;
            const padded = theme.colors.error(`✗ ${text}`) + " ".repeat(Math.max(0, lastLen - text.length));
            process.stderr.write(`\r${padded}\n`);
        }
    };
}

function formatProviderLabel(p: Provider): string {
    if (p === "openai") return "OpenAI";
    if (p === "anthropic") return "Anthropic";
    if (p === "google") return "Google Gemini";
    if (p === "xai") return "xAI (Grok)";
    if (p === "deepseek") return "DeepSeek";
    if (p === "azure-openai") return "Azure OpenAI (coming soon)";
    return p;
}

async function promptFirstRunConfig(): Promise<{ provider: Provider; apiKey: string; useKeychain: boolean }> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        console.log(theme.colors.warning("\n⚡ No BYOK token configured yet."));
        console.log(theme.colors.primary("Select the provider that will supply the token:\n"));

        PROVIDERS.forEach((p, idx) => {
            console.log(theme.colors.secondary(`  ${chalk.bold(idx + 1)}) ${formatProviderLabel(p)}`));
        });

        let provider: Provider | undefined;
        while (!provider) {
            const raw = await rl.question(theme.colors.primary("\nProvider (number or name): "));
            const trimmed = raw.trim();
            const asNum = Number(trimmed);
            if (Number.isFinite(asNum) && asNum >= 1 && asNum <= PROVIDERS.length) {
                provider = PROVIDERS[asNum - 1];
                break;
            }
            provider = normalizeProvider(trimmed);
            if (!provider) {
                console.log(theme.colors.warning(`Please choose one of: ${PROVIDERS.join(", ")}`));
            }
        }

        const apiKey = (await rl.question(theme.colors.primary("Enter your BYOK token: "))).trim();
        if (!apiKey) {
            throw new Error("No token provided.");
        }

        const store = (await rl.question(theme.colors.primary("Store in system keychain? (Y/n): "))).trim().toLowerCase();
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
    // Calculate statistics
    const originalWords = original.trim().split(/\s+/).length;
    const optimizedWords = optimized.trim().split(/\s+/).length;
    const wordDiff = optimizedWords - originalWords;
    const wordDiffPercent = originalWords > 0 ? ((wordDiff / originalWords) * 100).toFixed(1) : "0";
    const wordDiffSign = wordDiff > 0 ? "+" : "";

    // Copy to clipboard by default (unless --no-copy is used)
    if (options.copy !== false) {
        try {
            await clipboardy.default.write(optimized);
            console.error("");
            console.error(theme.colors.primary("╭─────────────────────────────────────────────────╮"));
            console.error(theme.colors.primary("│") + theme.colors.success("  ✓ Copied to clipboard!                       ") + theme.colors.primary("│"));
            console.error(theme.colors.primary("╰─────────────────────────────────────────────────╯"));
            console.error(theme.colors.dim("  Press ") + theme.colors.accent("Ctrl+V") + theme.colors.dim(" to paste your optimized prompt"));
            console.error("");
            console.error(theme.colors.dim("  📊 Stats: ") + theme.colors.info(`${originalWords} → ${optimizedWords} words `) +
                theme.colors.dim("(") + (wordDiff > 0 ? theme.colors.warning : theme.colors.success)(`${wordDiffSign}${wordDiffPercent}%`) + theme.colors.dim(")"));
            console.error("");
            console.error(theme.colors.primary("─".repeat(50)));
            console.error("");
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error(theme.colors.warning(`⚠ Failed to copy to clipboard: ${errMsg}`));
        }
    }

    // If output file specified, write to file
    if (options.output) {
        await fs.writeFile(options.output, optimized, "utf-8");
        console.error("");
        console.error(theme.colors.success(`✓ Optimized prompt saved to: `) + theme.colors.highlight(options.output));
        console.error(theme.colors.dim(`  ${optimizedWords} words • ${optimized.length} characters`));
        console.error("");
        // Still print to stdout for piping
        if (!options.interactive) {
            console.log(optimized);
        }
        return;
    }

    // If interactive mode, show comparison
    if (options.interactive) {
        const termWidth = process.stdout.columns || 80;
        const boxWidth = Math.min(termWidth - 4, 100);

        console.log("");
        console.log(theme.colors.primary("╭" + "─".repeat(boxWidth - 2) + "╮"));
        console.log(theme.colors.primary("│") + theme.colors.highlight(" 📝 ORIGINAL PROMPT ".padEnd(boxWidth - 2)) + theme.colors.primary("│"));
        console.log(theme.colors.primary("╰" + "─".repeat(boxWidth - 2) + "╯"));
        console.log("");

        // Word wrap the original prompt
        const originalLines = wrapText(original, boxWidth - 4);
        originalLines.forEach(line => {
            console.log(theme.colors.dim("  ") + theme.colors.secondary(line));
        });

        console.log("");
        console.log(theme.colors.dim("  📊 ") + theme.colors.info(`${originalWords} words`) + theme.colors.dim(" • ") + theme.colors.info(`${original.length} chars`));
        console.log("");

        console.log(theme.colors.success("╭" + "─".repeat(boxWidth - 2) + "╮"));
        console.log(theme.colors.success("│") + theme.colors.highlight(" ✨ OPTIMIZED PROMPT ".padEnd(boxWidth - 2)) + theme.colors.success("│"));
        console.log(theme.colors.success("╰" + "─".repeat(boxWidth - 2) + "╯"));
        console.log("");

        // Word wrap the optimized prompt
        const optimizedLines = wrapText(optimized, boxWidth - 4);
        optimizedLines.forEach(line => {
            console.log(theme.colors.dim("  ") + theme.colors.primary(line));
        });

        console.log("");
        console.log(theme.colors.dim("  📊 ") + theme.colors.info(`${optimizedWords} words`) + theme.colors.dim(" • ") + theme.colors.info(`${optimized.length} chars`) +
            theme.colors.dim(" • ") + (wordDiff > 0 ? theme.colors.warning : theme.colors.success)(`${wordDiffSign}${wordDiff} words (${wordDiffSign}${wordDiffPercent}%)`));
        console.log("");

        return;
    }

    // Default: print to stdout (pipeable)
    console.log(optimized);
    console.error("");
    console.error(theme.colors.primary("─".repeat(50)));
    console.error("");
}

/**
 * Simple word wrap utility
 */
function wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxWidth) {
            currentLine += (currentLine ? " " : "") + word;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
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
        console.log(theme.colors.primary("\n╭─────────────────────────────────────╮"));
        console.log(theme.colors.primary("│") + theme.colors.highlight("   MegaBuff Configuration Setup     ") + theme.colors.primary("│"));
        console.log(theme.colors.primary("╰─────────────────────────────────────╯\n"));
        console.log(theme.colors.secondary("What would you like to configure?\n"));
        console.log(theme.colors.secondary(`  ${chalk.bold("1)")} Set API token for a provider`));
        console.log(theme.colors.secondary(`  ${chalk.bold("2)")} Set default provider`));
        console.log(theme.colors.secondary(`  ${chalk.bold("3)")} Set model (auto-selects provider)`));
        console.log(theme.colors.secondary(`  ${chalk.bold("4)")} View current configuration`));
        console.log(theme.colors.secondary(`  ${chalk.bold("5)")} Exit\n`));

        const choice = await rl.question(theme.colors.primary("Enter your choice (1-5): "));

        switch (choice.trim()) {
            case "1": {
                // Set token
                console.log(theme.colors.primary("\nSelect provider:\n"));
                PROVIDERS.forEach((p, idx) => {
                    console.log(theme.colors.secondary(`  ${chalk.bold(idx + 1)}) ${formatProviderLabel(p)}`));
                });

                const providerChoice = await rl.question(theme.colors.primary("\nProvider (number or name): "));
                const providerNum = Number(providerChoice);
                let provider: Provider | undefined;

                if (Number.isFinite(providerNum) && providerNum >= 1 && providerNum <= PROVIDERS.length) {
                    provider = PROVIDERS[providerNum - 1];
                } else {
                    provider = normalizeProvider(providerChoice);
                }

                if (!provider) {
                    console.error(theme.colors.error(`Error: Invalid provider. Valid options: ${PROVIDERS.join(", ")}`));
                    process.exit(1);
                }

                const token = (await rl.question(theme.colors.primary("Enter your API token: "))).trim();
                if (!token) {
                    console.error(theme.colors.error("Error: No token provided"));
                    process.exit(1);
                }

                const store = (await rl.question(theme.colors.primary("Store in system keychain? (Y/n): "))).trim().toLowerCase();
                const useKeychain = store === "" || store === "y" || store === "yes";

                await setApiKey(provider, token, useKeychain);
                console.log(theme.colors.success(`\n✓ ${provider} token saved`) + theme.colors.dim(useKeychain ? " securely in system keychain" : " to config file"));
                if (!useKeychain) {
                    console.log(theme.colors.dim("  Tip: Run with --keychain flag next time for more secure storage"));
                }
                break;
            }

            case "2": {
                // Set default provider
                console.log(theme.colors.primary("\nSelect default provider:\n"));
                PROVIDERS.forEach((p, idx) => {
                    console.log(theme.colors.secondary(`  ${chalk.bold(idx + 1)}) ${formatProviderLabel(p)}`));
                });

                const providerChoice = await rl.question(theme.colors.primary("\nProvider (number or name): "));
                const providerNum = Number(providerChoice);
                let provider: Provider | undefined;

                if (Number.isFinite(providerNum) && providerNum >= 1 && providerNum <= PROVIDERS.length) {
                    provider = PROVIDERS[providerNum - 1];
                } else {
                    provider = normalizeProvider(providerChoice);
                }

                if (!provider) {
                    console.error(theme.colors.error(`Error: Invalid provider. Valid options: ${PROVIDERS.join(", ")}`));
                    process.exit(1);
                }

                await setProvider(provider);
                console.log(theme.colors.success(`\n✓ Default provider set to: `) + theme.colors.highlight(provider));
                break;
            }

            case "3": {
                // Set model (auto-selects provider)
                console.log(theme.colors.primary("\nAvailable models by provider:\n"));

                PROVIDERS.forEach((provider) => {
                    const models = getModelsByProvider(provider);
                    if (models.length > 0) {
                        console.log(theme.colors.warning(`${formatProviderName(provider)}:`));
                        models.forEach(model => console.log(theme.colors.secondary(`  - ${model}`)));
                        console.log();
                    }
                });

                const modelInput = (await rl.question(theme.colors.primary("Enter model name: "))).trim();
                if (!modelInput) {
                    console.error(theme.colors.error("Error: No model provided"));
                    process.exit(1);
                }

                const provider = getProviderForModel(modelInput);
                if (!provider) {
                    console.error(theme.colors.error(`Error: Unknown model '${modelInput}'`));
                    console.error(theme.colors.warning("Tip: Use one of the models listed above"));
                    process.exit(1);
                }

                await setModel(modelInput);
                console.log(theme.colors.success(`\n✓ Model set to: `) + theme.colors.highlight(modelInput));
                console.log(theme.colors.success(`✓ Provider auto-set to: `) + theme.colors.highlight(provider));
                break;
            }

            case "4": {
                // Show config
                const config = await getConfig();
                const currentProvider = await getProvider();
                const currentModel = await getModel();
                const effectiveModel = currentModel ?? getDefaultModel(currentProvider);
                const currentThemeName = await getThemeName();
                const currentTheme = themes[currentThemeName];
                const providerStatuses = await Promise.all(
                    PROVIDERS.map(async (p) => [p, await hasApiKey(p)] as const)
                );

                console.log(theme.colors.primary("\n╭─────────────────────────────────────╮"));
                console.log(theme.colors.primary("│") + theme.colors.highlight("      Current Configuration          ") + theme.colors.primary("│"));
                console.log(theme.colors.primary("╰─────────────────────────────────────╯\n"));
                console.log(theme.colors.secondary(`Provider: `) + theme.colors.highlight(currentProvider));
                console.log(theme.colors.secondary(`Model: `) + theme.colors.highlight(currentModel ? effectiveModel : `${effectiveModel}`) + theme.colors.dim(currentModel ? "" : " (default for provider)"));
                console.log(theme.colors.secondary(`Storage: `) + theme.colors.highlight(config.useKeychain ? "System Keychain" : "Config File"));
                console.log(theme.colors.secondary(`Theme: `) + theme.colors.highlight(currentTheme.name));
                console.log(theme.colors.secondary("\nAPI Tokens:"));
                for (const [p, ok] of providerStatuses) {
                    console.log(`  ${theme.colors.secondary(p)}: ${ok ? theme.colors.success("✓ Configured") : theme.colors.dim("✗ Not configured")}`);
                }
                console.log(theme.colors.dim(`\nConfig file: ~/.megabuff/config.json`));
                break;
            }

            case "5": {
                console.log(theme.colors.primary("\nExiting..."));
                break;
            }

            default: {
                console.error(theme.colors.error("Invalid choice. Please enter 1-5."));
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
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning("Interactive mode requires a TTY"));
            console.error("");
            console.error(theme.colors.dim("   Use these subcommands instead:"));
            console.error(theme.colors.accent("     megabuff config token <token> --provider <provider>"));
            console.error(theme.colors.accent("     megabuff config provider <provider>"));
            console.error(theme.colors.accent("     megabuff config model <model>"));
            console.error(theme.colors.accent("     megabuff config show"));
            console.error("");
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
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid provider '${options.provider}'`));
                console.error("");
                console.error(theme.colors.dim("   Valid providers: ") + theme.colors.info(PROVIDERS.join(", ")));
                console.error("");
                process.exit(1);
            }

            let finalToken = token;
            if (!finalToken) {
                if (!process.stdin.isTTY) {
                    console.error("");
                    console.error(theme.colors.error("❌ Error: ") + theme.colors.warning("Missing token argument"));
                    console.error("");
                    console.error(theme.colors.dim("   Provide it inline or run in an interactive terminal"));
                    console.error("");
                    process.exit(1);
                }
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                try {
                    finalToken = (await rl.question(theme.colors.primary("🔑 Enter your API token: "))).trim();
                } finally {
                    rl.close();
                }
            }

            if (!finalToken) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning("No token provided"));
                console.error("");
                process.exit(1);
            }

            await setApiKey(provider, finalToken, options.keychain || false);
            console.error("");
            if (options.keychain) {
                console.log(theme.colors.success(`✓ ${formatProviderName(provider)} token saved securely! 🔐`));
                console.log(theme.colors.dim("  Stored in system keychain for maximum security"));
            } else {
                console.log(theme.colors.success(`✓ ${formatProviderName(provider)} token saved! 💾`));
                console.log(theme.colors.dim("  Stored in ") + theme.colors.accent("~/.megabuff/config.json"));
                console.log("");
                console.log(theme.colors.info("  💡 Tip: ") + theme.colors.dim("Use ") + theme.colors.accent("--keychain") + theme.colors.dim(" flag for more secure storage"));
            }
            console.error("");
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
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
                const providerEmoji = p === "openai" ? "🤖" : p === "anthropic" ? "🧠" : p === "google" ? "✨" : p === "xai" ? "🚀" : p === "deepseek" ? "🔮" : "🔧";
                console.log("");
                console.log(theme.colors.dim("  Current default provider:"));
                console.log(theme.colors.primary(`  ${providerEmoji} `) + theme.colors.highlight(formatProviderName(p)));
                console.log("");
                return;
            }

            const p = normalizeProvider(providerArg);
            if (!p) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid provider '${providerArg}'`));
                console.error("");
                console.error(theme.colors.dim("   Valid providers: ") + theme.colors.info(PROVIDERS.join(", ")));
                console.error("");
                process.exit(1);
            }

            await setProvider(p);
            const providerEmoji = p === "openai" ? "🤖" : p === "anthropic" ? "🧠" : p === "google" ? "✨" : p === "xai" ? "🚀" : p === "deepseek" ? "🔮" : "🔧";
            console.log("");
            console.log(theme.colors.success(`✓ Default provider updated!`));
            console.log(theme.colors.dim("  Now using: ") + theme.colors.highlight(`${providerEmoji} ${formatProviderName(p)}`));
            console.log("");
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
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
                const providerEmoji = p === "openai" ? "🤖" : p === "anthropic" ? "🧠" : p === "google" ? "✨" : p === "xai" ? "🚀" : p === "deepseek" ? "🔮" : "🔧";
                console.log("");
                console.log(theme.colors.dim("  Current configuration:"));
                console.log(theme.colors.primary(`  ${providerEmoji} Model: `) + theme.colors.highlight(effectiveModel) + theme.colors.dim(m ? "" : " (default)"));
                console.log(theme.colors.dim(`     Provider: `) + theme.colors.info(formatProviderName(p)));
                console.log("");
                return;
            }

            const provider = getProviderForModel(modelArg);
            if (!provider) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Unknown model '${modelArg}'`));
                console.error("");
                console.error(theme.colors.dim("   Available models:"));
                console.error("");
                PROVIDERS.forEach(p => {
                    const models = getModelsByProvider(p);
                    if (models.length > 0) {
                        const providerEmoji = p === "openai" ? "🤖" : p === "anthropic" ? "🧠" : p === "google" ? "✨" : p === "xai" ? "🚀" : p === "deepseek" ? "🔮" : "🔧";
                        console.error(theme.colors.primary(`   ${providerEmoji} ${formatProviderName(p)}:`));
                        models.forEach(m => console.error(theme.colors.dim(`      • `) + theme.colors.info(m)));
                        console.error("");
                    }
                });
                process.exit(1);
            }

            await setModel(modelArg);
            const providerEmoji = provider === "openai" ? "🤖" : provider === "anthropic" ? "🧠" : provider === "google" ? "✨" : provider === "xai" ? "🚀" : provider === "deepseek" ? "🔮" : "🔧";
            console.log("");
            console.log(theme.colors.success(`✓ Configuration updated!`));
            console.log(theme.colors.dim("  Model: ") + theme.colors.highlight(modelArg));
            console.log(theme.colors.dim("  Provider: ") + theme.colors.highlight(`${providerEmoji} ${formatProviderName(provider)}`));
            console.log("");
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
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
            const currentThemeName = await getThemeName();
            const currentTheme = themes[currentThemeName];
            const providerStatuses = await Promise.all(
                PROVIDERS.map(async (p) => [p, await hasApiKey(p)] as const)
            );

            const providerEmoji = selectedProvider === "openai" ? "🤖" : selectedProvider === "anthropic" ? "🧠" : selectedProvider === "google" ? "✨" : selectedProvider === "xai" ? "🚀" : selectedProvider === "deepseek" ? "🔮" : "🔧";

            console.log("");
            console.log(theme.colors.primary("╭────────────────────────────────────────────╮"));
            console.log(theme.colors.primary("│") + theme.colors.highlight("  ⚙️  MegaBuff Configuration              ") + theme.colors.primary("│"));
            console.log(theme.colors.primary("╰────────────────────────────────────────────╯"));
            console.log("");

            console.log(theme.colors.dim("  Active Settings:"));
            console.log(theme.colors.primary(`  ${providerEmoji} Provider: `) + theme.colors.highlight(formatProviderName(selectedProvider)));
            console.log(theme.colors.primary(`  🎯 Model: `) + theme.colors.highlight(effectiveModel) + theme.colors.dim(selectedModel ? "" : " (default)"));
            console.log(theme.colors.primary(`  💾 Storage: `) + theme.colors.highlight(config.useKeychain ? "System Keychain 🔐" : "Config File"));
            console.log(theme.colors.primary(`  🎨 Theme: `) + theme.colors.highlight(currentTheme.name));

            console.log("");
            console.log(theme.colors.dim("  API Token Status:"));
            for (const [p, ok] of providerStatuses) {
                const emoji = p === "openai" ? "🤖" : p === "anthropic" ? "🧠" : p === "google" ? "✨" : "🔧";
                console.log(`  ${emoji} ${theme.colors.secondary(formatProviderName(p).padEnd(16))}: ${ok ? theme.colors.success("✓ Configured") : theme.colors.dim("✗ Not configured")}`);
            }

            console.log("");
            console.log(theme.colors.dim("  📁 Config location: ") + theme.colors.accent("~/.megabuff/config.json"));
            console.log("");
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
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
            console.log("");
            console.log(theme.colors.success(`✓ ${formatProviderName(provider)} token removed successfully! 🗑️`));
            console.log(theme.colors.dim("  Cleared from config file and system keychain"));
            console.log("");
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
            process.exit(1);
        }
    });

// Theme command
const themeCmd = program
    .command("theme")
    .description("Manage color themes")
    .action(async () => {
        // Show current theme when no subcommand
        const currentThemeName = await getThemeName();
        const currentTheme = themes[currentThemeName];
        const { colors } = currentTheme;

        console.log("");
        console.log(theme.colors.primary("╭────────────────────────────────────────────╮"));
        console.log(theme.colors.primary("│") + theme.colors.highlight("  🎨 Current Theme                       ") + theme.colors.primary("│"));
        console.log(theme.colors.primary("╰────────────────────────────────────────────╯"));
        console.log("");
        console.log(theme.colors.primary(`  Theme: `) + theme.colors.highlight(currentTheme.name));
        console.log(theme.colors.dim(`  ${currentTheme.description}`));
        console.log("");
        console.log(theme.colors.dim("  Color preview:"));
        const preview = [
            colors.primary("primary"),
            colors.success("success"),
            colors.error("error"),
            colors.warning("warning"),
            colors.info("info"),
            colors.accent("accent")
        ].join(" ");
        console.log(`  ${preview}`);
        console.log("");
        console.log(theme.colors.dim("  💡 Commands:"));
        console.log(theme.colors.accent("     megabuff theme list") + theme.colors.dim(" - See all themes"));
        console.log(theme.colors.accent("     megabuff theme set <name>") + theme.colors.dim(" - Change theme"));
        console.log("");
    });

themeCmd
    .command("list")
    .description("List all available themes")
    .action(async () => {
        const currentTheme = await getThemeName();
        const themeNames = getAllThemeNames();

        console.log("");
        console.log(theme.colors.primary("╭────────────────────────────────────────────────────────────────────╮"));
        console.log(theme.colors.primary("│") + theme.colors.highlight("  🎨 Available Themes                                             ") + theme.colors.primary("│"));
        console.log(theme.colors.primary("╰────────────────────────────────────────────────────────────────────╯"));
        console.log("");

        for (const themeName of themeNames) {
            const t = themes[themeName];
            const isCurrent = themeName === currentTheme;
            const { colors } = t;

            // Theme name with indicator if current
            if (isCurrent) {
                console.log(colors.success(`  ● ${t.name}`) + theme.colors.dim(" ⭐ (active)"));
            } else {
                console.log(colors.primary(`    ${t.name}`));
            }
            console.log(colors.dim(`    ${t.description}`));

            // Show color preview
            const preview = [
                colors.primary("primary"),
                colors.success("success"),
                colors.error("error"),
                colors.warning("warning"),
                colors.info("info"),
                colors.accent("accent")
            ].join(" ");
            console.log(`    ${preview}`);
            console.log();
        }

        console.log(theme.colors.dim(`  To change theme: `) + theme.colors.accent(`megabuff theme set <theme-name>`));
        console.log(theme.colors.dim(`  To preview theme: `) + theme.colors.accent(`megabuff theme preview <theme-name>`));
        console.log("");
    });

themeCmd
    .command("set")
    .description("Set the active theme")
    .argument("<theme>", "Theme name")
    .action(async (themeName: string) => {
        try {
            const normalizedTheme = themeName.toLowerCase() as ThemeName;

            if (!isValidTheme(normalizedTheme)) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Unknown theme '${themeName}'`));
                console.error("");
                console.error(theme.colors.dim("   Available themes:"));
                getAllThemeNames().forEach(name => {
                    console.error(theme.colors.info(`     • ${name}`));
                });
                console.error("");
                process.exit(1);
            }

            await setThemeName(normalizedTheme);
            clearThemeCache(); // Clear cache so next command uses new theme

            const newTheme = themes[normalizedTheme];
            const { colors } = newTheme;

            console.log("");
            console.log(colors.success(`✓ Theme changed successfully! 🎨`));
            console.log(colors.dim(`  Now using: `) + colors.highlight(newTheme.name));
            console.log(colors.dim(`  ${newTheme.description}`));

            // Show preview
            console.log("");
            console.log(colors.dim("  Color preview:"));
            const preview = [
                colors.primary("primary"),
                colors.success("success"),
                colors.error("error"),
                colors.warning("warning"),
                colors.info("info"),
                colors.accent("accent")
            ].join(" ");
            console.log(`  ${preview}`);
            console.log("");
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
            process.exit(1);
        }
    });

themeCmd
    .command("preview")
    .description("Preview a theme without setting it")
    .argument("<theme>", "Theme name to preview")
    .action(async (themeName: string) => {
        try {
            const normalizedTheme = themeName.toLowerCase() as ThemeName;

            if (!isValidTheme(normalizedTheme)) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Unknown theme '${themeName}'`));
                console.error("");
                console.error(theme.colors.dim("   Available themes:"));
                getAllThemeNames().forEach(name => {
                    console.error(theme.colors.info(`     • ${name}`));
                });
                console.error("");
                process.exit(1);
            }

            const previewTheme = themes[normalizedTheme];
            const { colors } = previewTheme;

            console.log("");
            console.log(colors.primary("╭────────────────────────────────────────────────────────╮"));
            console.log(colors.primary("│") + colors.highlight(`  🎨 ${previewTheme.name} Theme Preview                   `.padEnd(55)) + colors.primary("│"));
            console.log(colors.primary("╰────────────────────────────────────────────────────────╯"));
            console.log("");

            console.log(colors.dim(`  ${previewTheme.description}`));
            console.log("");

            console.log(colors.dim("  Color Palette:"));
            console.log("");
            console.log(colors.primary("  ● Primary text and headings"));
            console.log(colors.secondary("  ● Secondary text and descriptions"));
            console.log(colors.success("  ✓ Success messages and confirmations"));
            console.log(colors.error("  ✗ Error messages and warnings"));
            console.log(colors.warning("  ⚠ Warning and important notes"));
            console.log(colors.info("  ℹ Info messages and details"));
            console.log(colors.highlight("  ★ Highlighted and emphasized text"));
            console.log(colors.accent("  ◆ Accent colors and special elements"));
            console.log(colors.dim("  ○ Dimmed and secondary information"));
            console.log("");

            const currentTheme = await getThemeName();
            if (currentTheme !== normalizedTheme) {
                console.log(colors.dim("  To activate this theme: ") + colors.accent(`megabuff theme set ${normalizedTheme}`));
                console.log("");
            } else {
                console.log(colors.success("  ⭐ This is your current active theme!"));
                console.log("");
            }
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
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
    .option("-s, --style <style>", "Optimization style (balanced, concise, detailed, technical, creative, formal, casual)", "balanced")
    .option("--system-prompt <prompt>", "Custom system prompt (overrides all other prompts)")
    .option("--iterations <number>", "Number of optimization passes (1-5, default: 1)", "1")
    .action(async (inlinePrompt, options) => {
        try {
            debugLog("optimize.invoked", {
                argv: process.argv.slice(2),
                tty: { stdin: !!process.stdin.isTTY, stdout: !!process.stdout.isTTY, stderr: !!process.stderr.isTTY },
                options: { file: options.file, output: options.output, interactive: !!options.interactive, copy: options.copy !== false, provider: options.provider, hasApiKeyFlag: !!options.apiKey }
            });
            const original = await getInput(inlinePrompt, options);

            if (!original.trim()) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning("No prompt provided"));
                console.error(theme.colors.dim("   Provide a prompt inline, via --file, or through stdin"));
                console.error("");
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
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`No API key configured for ${formatProviderName(provider)}`));
                console.error("");
                console.error(theme.colors.dim("   Configure your API key using:"));
                console.error(theme.colors.accent(`   megabuff config set --provider ${provider} <your-api-key>`));
                console.error("");
                console.error(theme.colors.dim("   Or set an environment variable for this provider"));
                console.error("");
                process.exit(1);
            }

            // Get the configured model (if any) for this provider
            const configuredModel = await getModel();
            const modelToUse = configuredModel && getProviderForModel(configuredModel) === provider ? configuredModel : undefined;
            debugLog("model.selected", { configuredModel, modelToUse, provider });

            // Validate optimization style
            const validStyles: OptimizationStyle[] = ["balanced", "concise", "detailed", "technical", "creative", "formal", "casual"];
            const style = options.style as OptimizationStyle;
            if (!validStyles.includes(style)) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid style '${options.style}'`));
                console.error("");
                console.error(theme.colors.dim("   Valid styles: ") + theme.colors.info(validStyles.join(", ")));
                console.error("");
                process.exit(1);
            }

            const customPrompt = options.systemPrompt;
            if (customPrompt) {
                debugLog("customPrompt.provided", { length: customPrompt.length });
            }

            // Validate and parse iterations
            const iterations = parseInt(options.iterations, 10);
            if (isNaN(iterations) || iterations < 1 || iterations > 5) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid iterations '${options.iterations}'`));
                console.error("");
                console.error(theme.colors.dim("   Iterations must be between 1 and 5"));
                console.error("");
                process.exit(1);
            }

            if (iterations > 1) {
                debugLog("iterations.enabled", { count: iterations });
            }

            // Route to the appropriate provider's optimization function
            const providerEmoji = provider === "openai" ? "🤖" : provider === "anthropic" ? "🧠" : provider === "google" ? "✨" : provider === "xai" ? "🚀" : provider === "deepseek" ? "🔮" : "🔧";

            let optimized: string = original;
            const t0 = Date.now();

            try {
                // Iterative optimization loop
                for (let i = 1; i <= iterations; i++) {
                    const iterationLabel = iterations > 1 ? ` (iteration ${i}/${iterations})` : "";
                    const spinner = createSpinner(`${providerEmoji} Optimizing your prompt with ${formatProviderName(provider)}${modelToUse ? ` (${modelToUse})` : ""}${iterationLabel}...`);
                    spinner.start();

                    const iterationStart = Date.now();
                    let currentResult: string;

                    if (provider === "openai") {
                        currentResult = await optimizePromptOpenAI(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "anthropic") {
                        currentResult = await optimizePromptAnthropic(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "google") {
                        currentResult = await optimizePromptGemini(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "xai") {
                        currentResult = await optimizePromptXAI(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "deepseek") {
                        currentResult = await optimizePromptDeepSeek(optimized, apiKey, modelToUse, style, customPrompt);
                    } else {
                        spinner.fail();
                        console.error("");
                        console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Provider '${provider}' is not supported for optimization`));
                        console.error("");
                        console.error(theme.colors.dim("   Supported providers: ") + theme.colors.info("openai, anthropic, google, xai, deepseek"));
                        console.error("");
                        process.exit(1);
                    }

                    const iterationDuration = ((Date.now() - iterationStart) / 1000).toFixed(1);
                    debugLog("optimize.iteration.done", { provider, iteration: i, ms: Date.now() - iterationStart, length: currentResult.length });

                    if (iterations > 1) {
                        spinner.stop(`✨ Iteration ${i}/${iterations} complete in ${iterationDuration}s`);
                    } else {
                        spinner.stop(`✨ Optimization complete in ${iterationDuration}s!`);
                    }

                    optimized = currentResult;
                }

                const totalDuration = ((Date.now() - t0) / 1000).toFixed(1);
                if (iterations > 1) {
                    console.log(theme.colors.success(`🎉 All ${iterations} iterations complete in ${totalDuration}s!`));
                }
                debugLog("optimize.done", { provider, iterations, totalMs: Date.now() - t0, finalLength: optimized.length });
            } catch (e) {
                debugLog("optimize.error", { provider, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) });
                console.error("");
                throw e;
            }

            await outputResult(original, optimized, options);
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
            process.exit(1);
        }
    });

program.parse();