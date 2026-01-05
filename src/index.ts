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
import { estimateOptimizationCost, estimateAnalysisCost, formatCost, formatTokens, getDefaultModelForProvider, calculateCost, getPricingBreakdown } from "./cost.js";
import { startInteractiveShell } from "./shell.js";

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

CRITICAL: You are optimizing THE PROMPT ITSELF, not answering or executing it.

For example:
- Input: "Write a function to validate emails"
- Output: "Create a robust email validation function in JavaScript that checks for common email format rules including @ symbol, domain name, and TLD. Include edge case handling for special characters and provide clear error messages for invalid formats."

NOT: "Here's a function to validate emails: function validateEmail(email) { ... }"

When given a prompt, you should:
1. Identify ambiguities or unclear instructions
2. Add relevant context that would improve results
3. Structure the prompt for better clarity
4. Ensure specificity and actionable requests
5. Maintain the original intent while enhancing effectiveness

Return ONLY the optimized prompt without explanations, meta-commentary, or answers to the prompt itself.`;

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
 * Token usage information returned from API calls
 */
interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
}

/**
 * Result from optimization/analysis including token usage
 */
interface ResultWithUsage {
    result: string;
    usage: TokenUsage;
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
): Promise<ResultWithUsage> {
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

        debugLog("openai.request.done", {
            choices: response.choices?.length,
            usage: response.usage
        });

        const result = response.choices[0]?.message?.content || "Error: No response from OpenAI";
        const usage: TokenUsage = {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0
        };

        return { result, usage };
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
): Promise<ResultWithUsage> {
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

        debugLog("anthropic.request.done", {
            contentItems: response.content?.length,
            usage: response.usage
        });

        const content = response.content?.[0];
        if (content?.type === "text") {
            const usage: TokenUsage = {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
            };
            return { result: content.text, usage };
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
): Promise<ResultWithUsage> {
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

        // Extract token usage from response
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            inputTokens: usageMetadata?.promptTokenCount || 0,
            outputTokens: usageMetadata?.candidatesTokenCount || 0
        };

        debugLog("gemini.request.done", {
            responseLength: text.length,
            usage
        });

        if (!text) {
            throw new Error("No response from Gemini API");
        }

        return { result: text, usage };
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
): Promise<ResultWithUsage> {
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

            // Extract token usage from ai SDK response
            const usage: TokenUsage = {
                inputTokens: result.usage?.promptTokens || 0,
                outputTokens: result.usage?.completionTokens || 0
            };

            debugLog("xai.request.done", {
                textLength: result.text.length,
                usage
            });

            if (!result.text) {
                throw new Error("No response from xAI API");
            }

            return { result: result.text, usage };
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
): Promise<ResultWithUsage> {
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

        const content = response.choices[0]?.message?.content;
        const usage: TokenUsage = {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0
        };

        debugLog("deepseek.request.done", {
            choices: response.choices?.length,
            usage
        });

        if (!content) {
            throw new Error("No response from DeepSeek API");
        }

        return { result: content, usage };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`DeepSeek API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Generate a system prompt for prompt analysis
 */
function getAnalysisSystemPrompt(): string {
    return `You are an expert prompt engineer analyzing prompts for AI language models.

Your task is to provide a comprehensive analysis of the given prompt. Structure your analysis as follows:

## 📊 Overall Assessment
Provide a brief 2-3 sentence summary of the prompt's quality and primary purpose.

## ✅ Strengths
List 3-5 specific strengths of this prompt. Be concrete and explain why each strength matters.

## ⚠️ Weaknesses & Issues
Identify 3-5 specific problems, ambiguities, or areas for improvement. Explain the impact of each issue.

## 💡 Specific Suggestions
Provide 3-5 actionable recommendations for improvement. Be specific about what to change and why.

## 🎯 Key Improvements
Highlight the 2-3 most important changes that would have the biggest impact.

## 📈 Clarity Score
Rate the prompt's clarity on a scale of 1-10, with a brief justification.

Be direct, constructive, and specific in your analysis. Focus on actionable feedback that will genuinely improve the prompt's effectiveness.`;
}

/**
 * Analyze a prompt using OpenAI
 */
async function analyzePromptOpenAI(
    prompt: string,
    apiKey: string,
    model?: string
): Promise<ResultWithUsage> {
    const openai = new OpenAI({ apiKey });
    const selectedModel = model ?? getDefaultModel("openai");
    const systemPrompt = getAnalysisSystemPrompt();

    try {
        debugLog("openai.analyze.start", { model: selectedModel, promptLength: prompt.length });
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze this prompt:\n\n${prompt}` }
            ],
            temperature: 0.7,
        });

        const result = response.choices[0]?.message?.content || "Error: No response from OpenAI";
        const usage: TokenUsage = {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0
        };

        debugLog("openai.analyze.done", {
            choices: response.choices?.length,
            usage
        });

        return { result, usage };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Analyze a prompt using Anthropic Claude
 */
async function analyzePromptAnthropic(
    prompt: string,
    apiKey: string,
    model?: string
): Promise<ResultWithUsage> {
    const anthropic = new Anthropic({ apiKey });
    const selectedModel = model ?? getDefaultModel("anthropic");
    const systemPrompt = getAnalysisSystemPrompt();

    try {
        debugLog("anthropic.analyze.start", { model: selectedModel, promptLength: prompt.length });
        const response = await anthropic.messages.create({
            model: selectedModel,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: `Analyze this prompt:\n\n${prompt}`
                }
            ]
        });

        debugLog("anthropic.analyze.done", {
            contentItems: response.content?.length,
            usage: response.usage
        });

        const content = response.content?.[0];
        if (content?.type === "text") {
            const usage: TokenUsage = {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
            };
            return { result: content.text, usage };
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
 * Analyze a prompt using Google Gemini
 */
async function analyzePromptGemini(
    prompt: string,
    apiKey: string,
    model?: string
): Promise<ResultWithUsage> {
    const selectedModel = model ?? getDefaultModel("google");
    const systemPrompt = getAnalysisSystemPrompt();
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model: selectedModel });

    try {
        debugLog("google.analyze.start", { model: selectedModel, promptLength: prompt.length });
        const result = await gemini.generateContent(`${systemPrompt}\n\nAnalyze this prompt:\n\n${prompt}`);
        const response = result.response;
        const text = response.text();

        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            inputTokens: usageMetadata?.promptTokenCount || 0,
            outputTokens: usageMetadata?.candidatesTokenCount || 0
        };

        debugLog("google.analyze.done", {
            responseLength: text.length,
            usage
        });

        return { result: text, usage };
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Google Gemini API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Analyze a prompt using xAI (Grok)
 */
async function analyzePromptXAI(
    prompt: string,
    apiKey: string,
    model?: string
): Promise<ResultWithUsage> {
    const selectedModel = model ?? getDefaultModel("xai");
    const systemPrompt = getAnalysisSystemPrompt();

    try {
        debugLog("xai.analyze.start", { model: selectedModel, promptLength: prompt.length });

        // xAI SDK requires the API key to be set as an environment variable
        const originalKey = process.env.XAI_API_KEY;
        process.env.XAI_API_KEY = apiKey;

        try {
            const result = await generateText({
                model: xai(selectedModel),
                system: systemPrompt,
                prompt: `Analyze this prompt:\n\n${prompt}`,
            });

            const usage: TokenUsage = {
                inputTokens: result.usage?.promptTokens || 0,
                outputTokens: result.usage?.completionTokens || 0
            };

            debugLog("xai.analyze.done", {
                textLength: result.text.length,
                usage
            });

            if (!result.text) {
                throw new Error("No response from xAI API");
            }

            return { result: result.text, usage };
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
 * Analyze a prompt using DeepSeek
 */
async function analyzePromptDeepSeek(
    prompt: string,
    apiKey: string,
    model?: string
): Promise<ResultWithUsage> {
    const openai = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com"
    });
    const selectedModel = model ?? getDefaultModel("deepseek");
    const systemPrompt = getAnalysisSystemPrompt();

    try {
        debugLog("deepseek.analyze.start", { model: selectedModel, promptLength: prompt.length });
        const response = await openai.chat.completions.create({
            model: selectedModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze this prompt:\n\n${prompt}` }
            ],
            temperature: 0.7,
        });

        const result = response.choices[0]?.message?.content || "Error: No response from DeepSeek";
        const usage: TokenUsage = {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0
        };

        debugLog("deepseek.analyze.done", {
            choices: response.choices?.length,
            usage
        });

        return { result, usage };
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
    let currentMessage = message;

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
            render(currentMessage);
            timer = setInterval(() => render(currentMessage), 80);
        },
        update(newMessage: string) {
            if (!enabled) return;
            currentMessage = newMessage;
            render(currentMessage);
        },
        stop(finalText?: string) {
            if (!enabled) return;
            if (timer) clearInterval(timer);
            timer = undefined;
            const text = finalText ?? currentMessage;
            const padded = theme.colors.success(`✓ ${text}`) + " ".repeat(Math.max(0, lastLen - text.length));
            process.stderr.write(`\r${padded}\n`);
        },
        fail(finalText?: string) {
            if (!enabled) return;
            if (timer) clearInterval(timer);
            timer = undefined;
            const text = finalText ?? currentMessage;
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

// Comparison mode function
async function runComparisonMode(
    original: string,
    style: OptimizationStyle,
    customPrompt: string | undefined,
    iterations: number,
    options: any
): Promise<void> {
    console.log("");
    console.log(theme.colors.primary("🔍 Comparison Mode") + theme.colors.dim(" - Testing multiple providers..."));
    console.log("");

    // Parse requested providers if specified
    let requestedProviders: Provider[] | undefined;
    if (options.providers) {
        const providerList = options.providers.split(",").map((p: string) => p.trim().toLowerCase());
        requestedProviders = [];

        for (const p of providerList) {
            if (!PROVIDERS.includes(p)) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid provider '${p}'`));
                console.error("");
                console.error(theme.colors.dim("   Valid providers: ") + theme.colors.info(PROVIDERS.join(", ")));
                console.error("");
                process.exit(1);
            }
            requestedProviders.push(p as Provider);
        }
    }

    // Parse per-provider models if specified
    const providerModels: Record<string, string> = {};
    if (options.models) {
        const modelPairs = options.models.split(",").map((m: string) => m.trim());

        for (const pair of modelPairs) {
            const [providerStr, model] = pair.split(":").map((s: string) => s.trim());

            if (!providerStr || !model) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid model specification '${pair}'`));
                console.error("");
                console.error(theme.colors.dim("   Format: ") + theme.colors.info("provider:model (e.g., 'openai:gpt-4o,anthropic:claude-opus-4-5')"));
                console.error("");
                process.exit(1);
            }

            const provider = providerStr.toLowerCase();
            if (!PROVIDERS.includes(provider)) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Invalid provider '${provider}' in model specification`));
                console.error("");
                console.error(theme.colors.dim("   Valid providers: ") + theme.colors.info(PROVIDERS.join(", ")));
                console.error("");
                process.exit(1);
            }

            // Verify the model belongs to the provider
            const modelProvider = getProviderForModel(model);
            if (!modelProvider || modelProvider !== provider) {
                console.error("");
                console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Model '${model}' does not belong to provider '${provider}'`));
                console.error("");
                if (modelProvider) {
                    console.error(theme.colors.dim(`   '${model}' is a ${modelProvider} model`));
                } else {
                    console.error(theme.colors.dim(`   '${model}' is not a recognized model`));
                }
                console.error("");
                process.exit(1);
            }

            providerModels[provider] = model;
        }
    }

    // Get all available providers with configured API keys
    const availableProviders: Provider[] = [];
    const providerKeys: Record<Provider, string> = {} as Record<Provider, string>;

    const providersToCheck = requestedProviders || (PROVIDERS as readonly string[]);
    for (const p of providersToCheck) {
        try {
            const { apiKey } = await getApiKeyInfo(p as Provider, options.apiKey);
            if (apiKey) {
                availableProviders.push(p as Provider);
                providerKeys[p as Provider] = apiKey;
            }
        } catch {
            // Skip providers without API keys
        }
    }

    if (availableProviders.length === 0) {
        const errorMsg = requestedProviders
            ? `None of the requested providers (${requestedProviders.join(", ")}) have configured API keys`
            : "No providers have configured API keys";
        console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(errorMsg));
        console.error("");
        console.error(theme.colors.dim("   Configure API keys using:"));
        console.error(theme.colors.accent("   megabuff config set --provider <provider> <api-key>"));
        console.error("");
        process.exit(1);
    }

    if (availableProviders.length === 1) {
        const warningMsg = requestedProviders
            ? `Only one of the requested providers has a configured API key`
            : "Only one provider has a configured API key";
        console.error(theme.colors.warning("⚠️  Warning: ") + theme.colors.dim(warningMsg));
        console.error("");
        console.error(theme.colors.dim("   Comparison mode requires at least 2 providers"));
        if (requestedProviders) {
            console.error(theme.colors.dim("   Add more providers to the --providers list or configure more API keys"));
        } else {
            console.error(theme.colors.dim("   Configure more providers using:"));
            console.error(theme.colors.accent("   megabuff config set --provider <provider> <api-key>"));
        }
        console.error("");
        process.exit(1);
    }

    console.log(theme.colors.dim(`  Testing ${availableProviders.length} providers: ${availableProviders.map(formatProviderName).join(", ")}`));
    console.log("");

    // Show cost estimate for comparison mode if requested
    let totalEstimatedCost = 0; // Store for accuracy calculation later
    if (options.showCost) {
        console.log(theme.colors.primary("💰 Cost Estimate (All Providers)"));
        console.log(theme.colors.dim("─".repeat(80)));

        for (const provider of availableProviders) {
            // Determine which model to use for cost estimation
            // Priority: 1) --models flag, 2) global config, 3) provider default
            let modelToUse: string | undefined;
            if (providerModels[provider]) {
                modelToUse = providerModels[provider];
            } else {
                const configuredModel = await getModel();
                modelToUse = configuredModel && getProviderForModel(configuredModel) === provider ? configuredModel : undefined;
            }
            const modelForCost = modelToUse || getDefaultModelForProvider(provider);
            const costEstimate = estimateOptimizationCost(original, modelForCost, iterations);
            const pricingInfo = getPricingBreakdown(modelForCost);

            console.log(theme.colors.info(`   ${formatProviderName(provider)}: `) + theme.colors.secondary(formatCost(costEstimate.estimatedCost)) + theme.colors.dim(` (${modelForCost})`));

            if (pricingInfo) {
                console.log(theme.colors.dim(`      Input:  $${pricingInfo.inputPricePer1M.toFixed(2)}/1M tokens (${pricingInfo.inputPricePerToken}/token)`));
                console.log(theme.colors.dim(`      Output: $${pricingInfo.outputPricePer1M.toFixed(2)}/1M tokens (${pricingInfo.outputPricePerToken}/token)`));
            }

            totalEstimatedCost += costEstimate.estimatedCost;
        }

        console.log(theme.colors.dim("─".repeat(80)));
        console.log(theme.colors.info(`   Total estimated cost: `) + theme.colors.accent(formatCost(totalEstimatedCost)));
        console.log(theme.colors.dim("─".repeat(80)));
        console.log("");

        // Prompt user to confirm proceeding
        if (process.stdin.isTTY && process.stdout.isTTY) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await rl.question(theme.colors.warning("Do you want to proceed with this operation? (y/n): "));
            rl.close();

            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                console.log("");
                console.log(theme.colors.dim("Operation cancelled."));
                console.log("");
                return;
            }
            console.log("");
        }
    }

    // Run optimization for each provider
    // Use sequential execution if we need interactive prompts for iterations
    const needsSequentialExecution = options.showCost && iterations > 1 && process.stdin.isTTY && process.stdout.isTTY;

    const results: Array<{
        provider: Provider;
        result: string;
        duration: number;
        error?: string;
        totalInputTokens: number;
        totalOutputTokens: number;
        actualCost: number;
        model: string;
        iterationCosts?: Array<{
            iteration: number;
            inputTokens: number;
            outputTokens: number;
            cost: number;
        }>;
    }> = [];

    const processProvider = async (provider: Provider) => {
            const providerEmoji = provider === "openai" ? "🤖" : provider === "anthropic" ? "🧠" : provider === "google" ? "✨" : provider === "xai" ? "🚀" : provider === "deepseek" ? "🔮" : "🔧";
            const spinner = createSpinner(`${providerEmoji} Optimizing with ${formatProviderName(provider)}...`);
            spinner.start();

            const startTime = Date.now();
            let optimized = original;
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            const iterationCosts: Array<{ iteration: number; inputTokens: number; outputTokens: number; cost: number }> = [];

            try {
                const apiKey = providerKeys[provider];

                // Determine which model to use for this provider
                // Priority: 1) --models flag, 2) global config, 3) provider default
                let modelToUse: string | undefined;
                if (providerModels[provider]) {
                    // Use model specified in --models flag for this provider
                    modelToUse = providerModels[provider];
                } else {
                    // Fall back to global configured model if it matches this provider
                    const configuredModel = await getModel();
                    modelToUse = configuredModel && getProviderForModel(configuredModel) === provider ? configuredModel : undefined;
                }

                // Run iterations for this provider
                for (let i = 0; i < iterations; i++) {
                    // Update spinner to show current iteration
                    if (iterations > 1) {
                        spinner.update(`${providerEmoji} ${formatProviderName(provider)} - iteration ${i + 1}/${iterations}...`);
                    }

                    let response: ResultWithUsage;

                    if (provider === "openai") {
                        response = await optimizePromptOpenAI(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "anthropic") {
                        response = await optimizePromptAnthropic(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "google") {
                        response = await optimizePromptGemini(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "xai") {
                        response = await optimizePromptXAI(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "deepseek") {
                        response = await optimizePromptDeepSeek(optimized, apiKey, modelToUse, style, customPrompt);
                    } else {
                        throw new Error(`Unsupported provider: ${provider}`);
                    }

                    optimized = response.result;
                    totalInputTokens += response.usage.inputTokens;
                    totalOutputTokens += response.usage.outputTokens;

                    const actualModel = modelToUse || getDefaultModelForProvider(provider);
                    const iterationCost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, actualModel);

                    // Track cost per iteration
                    iterationCosts.push({
                        iteration: i + 1,
                        inputTokens: response.usage.inputTokens,
                        outputTokens: response.usage.outputTokens,
                        cost: iterationCost
                    });

                    // Stop spinner temporarily for iteration results
                    if (iterations > 1) {
                        spinner.stop();
                    }

                    // Show iteration output if verbose mode is enabled
                    if (options.verbose && iterations > 1) {
                        console.log("");
                        console.log(theme.colors.primary(`📝 ${formatProviderName(provider)} - Iteration ${i + 1}/${iterations} Output:`));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log(optimized);
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log("");
                    }

                    // Show cost for this iteration if --show-cost is enabled
                    if (options.showCost && iterations > 1) {
                        console.log("");
                        console.log(theme.colors.primary(`💰 ${formatProviderName(provider)} - Iteration ${i + 1}/${iterations} Actual Cost`));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log(theme.colors.info(`   Input tokens: `) + theme.colors.secondary(formatTokens(response.usage.inputTokens)));
                        console.log(theme.colors.info(`   Output tokens: `) + theme.colors.secondary(formatTokens(response.usage.outputTokens)));
                        console.log(theme.colors.info(`   Cost: `) + theme.colors.accent(formatCost(iterationCost)));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log("");
                    }

                    // Show cost estimate for NEXT iteration and prompt for confirmation (if not the last iteration)
                    if (options.showCost && iterations > 1 && i < iterations - 1) {
                        const nextIterationEstimate = estimateOptimizationCost(optimized, actualModel, 1);

                        console.log("");
                        console.log(theme.colors.primary(`💰 ${formatProviderName(provider)} - Iteration ${i + 2}/${iterations} Cost Estimate`));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log(theme.colors.info(`   Model: `) + theme.colors.secondary(actualModel));
                        console.log(theme.colors.info(`   Estimated cost: `) + theme.colors.accent(formatCost(nextIterationEstimate.estimatedCost)));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log("");

                        // Prompt user to confirm proceeding with next iteration
                        if (process.stdin.isTTY && process.stdout.isTTY) {
                            const rl = readline.createInterface({
                                input: process.stdin,
                                output: process.stdout
                            });

                            const answer = await rl.question(theme.colors.warning(`${formatProviderName(provider)}: Continue with iteration ${i + 2}/${iterations}? (y/n): `));
                            rl.close();

                            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                                console.log("");
                                console.log(theme.colors.dim(`${formatProviderName(provider)}: Stopped after ${i + 1} iteration(s).`));
                                console.log("");
                                break;
                            }
                            console.log("");
                        }
                    }

                    // Restart spinner for next iteration
                    if (iterations > 1 && i < iterations - 1) {
                        spinner.start();
                    }
                }

                const duration = Date.now() - startTime;
                const actualModel = modelToUse || getDefaultModelForProvider(provider);
                const actualCost = calculateCost(totalInputTokens, totalOutputTokens, actualModel);

                spinner.stop(`✨ ${formatProviderName(provider)} complete in ${(duration / 1000).toFixed(1)}s`);
                const resultData: any = {
                    provider,
                    result: optimized,
                    duration,
                    totalInputTokens,
                    totalOutputTokens,
                    actualCost,
                    model: actualModel
                };
                if (iterations > 1) {
                    resultData.iterationCosts = iterationCosts;
                }
                results.push(resultData);
            } catch (error) {
                const duration = Date.now() - startTime;
                const configuredModel = await getModel();
                const modelToUse = configuredModel && getProviderForModel(configuredModel) === provider ? configuredModel : undefined;
                const actualModel = modelToUse || getDefaultModelForProvider(provider);
                spinner.fail(`❌ ${formatProviderName(provider)} failed`);
                results.push({
                    provider,
                    result: "",
                    duration,
                    totalInputTokens: 0,
                    totalOutputTokens: 0,
                    actualCost: 0,
                    model: actualModel,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
    };

    // Execute providers sequentially if we need interactive prompts, otherwise run in parallel
    if (needsSequentialExecution) {
        for (const provider of availableProviders) {
            await processProvider(provider);
        }
    } else {
        await Promise.all(availableProviders.map(processProvider));
    }

    // Sort results by provider name for consistent display
    results.sort((a, b) => a.provider.localeCompare(b.provider));

    // Summary statistics
    const successfulResults = results.filter(r => !r.error);
    if (successfulResults.length > 0) {
        const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
        const avgLength = successfulResults.reduce((sum, r) => sum + r.result.length, 0) / successfulResults.length;
        const totalCost = successfulResults.reduce((sum, r) => sum + r.actualCost, 0);
        const totalInputTokens = successfulResults.reduce((sum, r) => sum + r.totalInputTokens, 0);
        const totalOutputTokens = successfulResults.reduce((sum, r) => sum + r.totalOutputTokens, 0);

        // Calculate estimate accuracy if cost tracking is enabled
        const estimateAccuracy = options.showCost && totalEstimatedCost > 0
            ? ((totalEstimatedCost / totalCost) * 100).toFixed(1)
            : null;

        // Pretty banner summary
        console.log("");
        console.log(theme.colors.primary("╔══════════════════════════════════════════════════════════════════════════════╗"));
        console.log(theme.colors.primary("║") + "                           " + theme.colors.accent("📈 COMPARISON SUMMARY") + "                              " + theme.colors.primary("║"));
        console.log(theme.colors.primary("╚══════════════════════════════════════════════════════════════════════════════╝"));
        console.log("");

        // Display detailed comparison results for each provider
        console.log(theme.colors.info("  📊 Comparison Results"));
        console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));
        console.log("");

        for (const { provider, result, duration, error, totalInputTokens, totalOutputTokens, actualCost, model } of results) {
            const providerEmoji = provider === "openai" ? "🤖" : provider === "anthropic" ? "🧠" : provider === "google" ? "✨" : provider === "xai" ? "🚀" : provider === "deepseek" ? "🔮" : "🔧";

            console.log(theme.colors.secondary(`  ${providerEmoji} ${formatProviderName(provider).toUpperCase()}`) + theme.colors.dim(` (${model})`));
            console.log(theme.colors.dim(`     Duration: ${(duration / 1000).toFixed(1)}s | Length: ${result.length} chars`));
            if (!error) {
                console.log(theme.colors.dim(`     Tokens: ${formatTokens(totalInputTokens)} in + ${formatTokens(totalOutputTokens)} out | Cost: ${formatCost(actualCost)}`));
            }
            console.log("");

            if (error) {
                console.log(theme.colors.error(`     ❌ Error: ${error}`));
            } else {
                console.log(theme.colors.dim("     Result:"));
                console.log(result.split("\n").map(line => `     ${line}`).join("\n"));
            }

            console.log("");
        }

        console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));
        console.log("");

        console.log(theme.colors.info("  📈 Statistics"));
        console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));
        console.log(theme.colors.dim(`     Successful providers: `) + theme.colors.success(`${successfulResults.length}/${results.length}`));
        console.log(theme.colors.dim(`     Average duration: `) + theme.colors.secondary(`${(avgDuration / 1000).toFixed(1)}s`));
        console.log(theme.colors.dim(`     Average length: `) + theme.colors.secondary(`${Math.round(avgLength)} chars`));
        console.log("");

        console.log(theme.colors.info("  🤖 Models Used"));
        console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));
        for (const result of successfulResults) {
            const providerEmoji = result.provider === "openai" ? "🤖" :
                                result.provider === "anthropic" ? "🧠" :
                                result.provider === "google" ? "✨" :
                                result.provider === "xai" ? "🚀" :
                                result.provider === "deepseek" ? "🔮" : "🔧";
            console.log(theme.colors.dim(`     ${providerEmoji} ${formatProviderName(result.provider)}: `) + theme.colors.secondary(result.model));
        }
        console.log("");

        if (options.showCost) {
            console.log(theme.colors.info("  💰 Cost Analysis"));
            console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));
            console.log(theme.colors.dim(`     Total tokens: `) + theme.colors.secondary(`${formatTokens(totalInputTokens)} in + ${formatTokens(totalOutputTokens)} out`));
            console.log(theme.colors.dim(`     Total cost: `) + theme.colors.accent(formatCost(totalCost)));
            console.log(theme.colors.dim(`     Average cost per provider: `) + theme.colors.secondary(formatCost(totalCost / successfulResults.length)));
            if (estimateAccuracy) {
                console.log(theme.colors.dim(`     Estimate accuracy: `) + theme.colors.info(`${estimateAccuracy}%`));
            }
            console.log("");

            // Show pricing details for each provider
            console.log(theme.colors.info("  📋 Model Pricing Details"));
            console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));
            for (const result of successfulResults) {
                const pricingInfo = getPricingBreakdown(result.model);
                const providerEmoji = result.provider === "openai" ? "🤖" :
                                    result.provider === "anthropic" ? "🧠" :
                                    result.provider === "google" ? "✨" :
                                    result.provider === "xai" ? "🚀" :
                                    result.provider === "deepseek" ? "🔮" : "🔧";

                console.log(theme.colors.dim(`     ${providerEmoji} ${formatProviderName(result.provider)} (${result.model}):`));
                if (pricingInfo) {
                    console.log(theme.colors.dim(`        Input:  $${pricingInfo.inputPricePer1M.toFixed(2)}/1M tokens ($${pricingInfo.inputPricePerToken}/token)`));
                    console.log(theme.colors.dim(`        Output: $${pricingInfo.outputPricePer1M.toFixed(2)}/1M tokens ($${pricingInfo.outputPricePerToken}/token)`));
                }
                console.log(theme.colors.dim(`        Cost: `) + theme.colors.accent(formatCost(result.actualCost)));
            }
            console.log("");

            // Show per-iteration cost breakdown if there are multiple iterations
            if (iterations > 1) {
                console.log(theme.colors.info("  📊 Per-Iteration Cost Breakdown"));
                console.log(theme.colors.dim("  ────────────────────────────────────────────────────────────────────────────"));

                for (const result of successfulResults) {
                    if (!result.iterationCosts || result.iterationCosts.length === 0) continue;

                    const providerEmoji = result.provider === "openai" ? "🤖" :
                                        result.provider === "anthropic" ? "🧠" :
                                        result.provider === "google" ? "✨" :
                                        result.provider === "xai" ? "🚀" :
                                        result.provider === "deepseek" ? "🔮" : "🔧";

                    console.log(theme.colors.dim(`     ${providerEmoji} ${formatProviderName(result.provider)} (${result.model}):`));

                    for (const iterCost of result.iterationCosts) {
                        console.log(theme.colors.dim(`        Iteration ${iterCost.iteration}: `) +
                                  theme.colors.secondary(`${formatTokens(iterCost.inputTokens)} in + ${formatTokens(iterCost.outputTokens)} out`) +
                                  theme.colors.dim(` = `) + theme.colors.accent(formatCost(iterCost.cost)));
                    }
                    console.log("");
                }
            }
        }

        console.log(theme.colors.dim("  ════════════════════════════════════════════════════════════════════════════"));
        console.log("");
    }

    // Don't copy to clipboard or write to file in comparison mode
    console.log(theme.colors.dim("💡 Tip: Choose the result that best fits your needs and run optimization again with that specific provider"));
    console.log("");
}

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
    .option("-c, --compare", "Compare optimizations from multiple providers side-by-side")
    .option("--providers <providers>", "Comma-separated list of providers to compare (e.g., 'openai,anthropic,google')")
    .option("--models <models>", "Specify models per provider in comparison mode (e.g., 'openai:gpt-4o,anthropic:claude-opus-4-5')")
    .option("-v, --verbose", "Show output from each iteration (useful with --iterations)")
    .option("-a, --analyze-first", "Analyze the prompt before optimizing to see what will be improved")
    .option("--show-cost", "Display estimated cost before running and actual cost after")
    .option("--estimate-only", "Only show cost estimate without running optimization")
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

            // Cost estimation (only for non-comparison mode)
            let costEstimate: { inputTokens: number; outputTokens: number; estimatedCost: number } | undefined;
            if (!options.compare) {
                const modelForCost = modelToUse || getDefaultModelForProvider(provider);
                costEstimate = estimateOptimizationCost(original, modelForCost, iterations);

                if (options.showCost || options.estimateOnly) {
                    const pricingInfo = getPricingBreakdown(modelForCost);

                    console.log("");
                    console.log(theme.colors.primary("💰 Cost Estimate"));
                    console.log(theme.colors.dim("─".repeat(80)));
                    console.log(theme.colors.info(`   Model: `) + theme.colors.secondary(modelForCost));

                    if (pricingInfo) {
                        console.log(theme.colors.dim(`   Pricing:`));
                        console.log(theme.colors.dim(`      Input:  $${pricingInfo.inputPricePer1M.toFixed(2)}/1M tokens (${pricingInfo.inputPricePerToken}/token)`));
                        console.log(theme.colors.dim(`      Output: $${pricingInfo.outputPricePer1M.toFixed(2)}/1M tokens (${pricingInfo.outputPricePerToken}/token)`));
                        console.log("");
                    }

                    console.log(theme.colors.info(`   Input tokens: `) + theme.colors.secondary(formatTokens(costEstimate.inputTokens)));
                    console.log(theme.colors.info(`   Output tokens (est): `) + theme.colors.secondary(formatTokens(costEstimate.outputTokens)));
                    console.log(theme.colors.info(`   Estimated cost: `) + theme.colors.accent(formatCost(costEstimate.estimatedCost)));
                    console.log(theme.colors.dim("─".repeat(80)));
                    console.log("");

                    if (options.estimateOnly) {
                        console.log(theme.colors.dim("💡 Tip: Remove --estimate-only to run the actual optimization"));
                        console.log("");
                        return;
                    }

                    // Prompt user to confirm proceeding with the operation
                    if (process.stdin.isTTY && process.stdout.isTTY) {
                        const rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout
                        });

                        const answer = await rl.question(theme.colors.warning("Do you want to proceed with this operation? (y/n): "));
                        rl.close();

                        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                            console.log("");
                            console.log(theme.colors.dim("Operation cancelled."));
                            console.log("");
                            return;
                        }
                        console.log("");
                    }
                }
            }

            // Analyze first mode: show analysis before optimizing
            let analyzeInputTokens = 0;
            let analyzeOutputTokens = 0;
            if (options.analyzeFirst) {
                console.log("");
                console.log(theme.colors.primary("🔍 Step 1: Analyzing your prompt..."));
                console.log("");

                const analyzeSpinner = createSpinner(`Analyzing with ${formatProviderName(provider)}...`);
                analyzeSpinner.start();

                const analyzeStart = Date.now();
                let analysisResult: ResultWithUsage;

                try {
                    if (provider === "openai") {
                        analysisResult = await analyzePromptOpenAI(original, apiKey, modelToUse);
                    } else if (provider === "anthropic") {
                        analysisResult = await analyzePromptAnthropic(original, apiKey, modelToUse);
                    } else if (provider === "google") {
                        analysisResult = await analyzePromptGemini(original, apiKey, modelToUse);
                    } else if (provider === "xai") {
                        analysisResult = await analyzePromptXAI(original, apiKey, modelToUse);
                    } else if (provider === "deepseek") {
                        analysisResult = await analyzePromptDeepSeek(original, apiKey, modelToUse);
                    } else {
                        analyzeSpinner.fail();
                        console.error("");
                        console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Provider '${provider}' is not supported for analysis`));
                        console.error("");
                        process.exit(1);
                    }

                    analyzeInputTokens = analysisResult.usage.inputTokens;
                    analyzeOutputTokens = analysisResult.usage.outputTokens;

                    const analyzeDuration = ((Date.now() - analyzeStart) / 1000).toFixed(1);
                    analyzeSpinner.stop(`Analysis complete in ${analyzeDuration}s`);

                    console.log("");
                    console.log(theme.colors.dim("─".repeat(80)));
                    console.log("");
                    console.log(analysisResult.result);
                    console.log("");
                    console.log(theme.colors.dim("─".repeat(80)));
                    console.log("");
                    console.log(theme.colors.primary("🔧 Step 2: Proceeding with optimization..."));
                    console.log("");
                } catch (error) {
                    analyzeSpinner.fail("Analysis failed");
                    console.error("");
                    console.error(theme.colors.error("❌ Analysis Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
                    console.error("");
                    console.error(theme.colors.dim("   Proceeding with optimization anyway..."));
                    console.log("");
                }
            }

            // Comparison mode: run optimization across multiple providers
            if (options.compare) {
                await runComparisonMode(original, style, customPrompt, iterations, options);
                return;
            }

            // Route to the appropriate provider's optimization function
            const providerEmoji = provider === "openai" ? "🤖" : provider === "anthropic" ? "🧠" : provider === "google" ? "✨" : provider === "xai" ? "🚀" : provider === "deepseek" ? "🔮" : "🔧";

            let optimized: string = original;
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            const t0 = Date.now();

            try {
                // Iterative optimization loop
                for (let i = 1; i <= iterations; i++) {
                    const iterationLabel = iterations > 1 ? ` (iteration ${i}/${iterations})` : "";
                    const spinner = createSpinner(`${providerEmoji} Optimizing your prompt with ${formatProviderName(provider)}${modelToUse ? ` (${modelToUse})` : ""}${iterationLabel}...`);
                    spinner.start();

                    const iterationStart = Date.now();
                    let response: ResultWithUsage;

                    if (provider === "openai") {
                        response = await optimizePromptOpenAI(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "anthropic") {
                        response = await optimizePromptAnthropic(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "google") {
                        response = await optimizePromptGemini(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "xai") {
                        response = await optimizePromptXAI(optimized, apiKey, modelToUse, style, customPrompt);
                    } else if (provider === "deepseek") {
                        response = await optimizePromptDeepSeek(optimized, apiKey, modelToUse, style, customPrompt);
                    } else {
                        spinner.fail();
                        console.error("");
                        console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(`Provider '${provider}' is not supported for optimization`));
                        console.error("");
                        console.error(theme.colors.dim("   Supported providers: ") + theme.colors.info("openai, anthropic, google, xai, deepseek"));
                        console.error("");
                        process.exit(1);
                    }

                    optimized = response.result;
                    totalInputTokens += response.usage.inputTokens;
                    totalOutputTokens += response.usage.outputTokens;

                    const iterationDuration = ((Date.now() - iterationStart) / 1000).toFixed(1);
                    debugLog("optimize.iteration.done", { provider, iteration: i, ms: Date.now() - iterationStart, length: optimized.length });

                    if (iterations > 1) {
                        spinner.stop(`✨ Iteration ${i}/${iterations} complete in ${iterationDuration}s`);
                    } else {
                        spinner.stop(`✨ Optimization complete in ${iterationDuration}s!`);
                    }

                    // Show cost for this iteration if --show-cost is enabled
                    if (options.showCost && iterations > 1) {
                        const actualModel = modelToUse || getDefaultModelForProvider(provider);
                        const iterationCost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, actualModel);

                        console.log("");
                        console.log(theme.colors.primary(`💰 Iteration ${i}/${iterations} Actual Cost`));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log(theme.colors.info(`   Input tokens: `) + theme.colors.secondary(formatTokens(response.usage.inputTokens)));
                        console.log(theme.colors.info(`   Output tokens: `) + theme.colors.secondary(formatTokens(response.usage.outputTokens)));
                        console.log(theme.colors.info(`   Cost: `) + theme.colors.accent(formatCost(iterationCost)));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log("");
                    }

                    // Show iteration output if verbose mode is enabled
                    if (options.verbose && iterations > 1) {
                        console.log("");
                        console.log(theme.colors.primary(`📝 Iteration ${i}/${iterations} Output:`));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log(optimized);
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log("");
                    }

                    // Show cost estimate for NEXT iteration and prompt for confirmation (if not the last iteration)
                    if (options.showCost && iterations > 1 && i < iterations) {
                        const actualModel = modelToUse || getDefaultModelForProvider(provider);
                        const nextIterationEstimate = estimateOptimizationCost(optimized, actualModel, 1);
                        const pricingInfo = getPricingBreakdown(actualModel);

                        console.log("");
                        console.log(theme.colors.primary(`💰 Iteration ${i + 1}/${iterations} Cost Estimate`));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log(theme.colors.info(`   Model: `) + theme.colors.secondary(actualModel));

                        if (pricingInfo) {
                            console.log(theme.colors.dim(`   Pricing: $${pricingInfo.inputPricePer1M.toFixed(2)}/1M in, $${pricingInfo.outputPricePer1M.toFixed(2)}/1M out`));
                        }

                        console.log(theme.colors.info(`   Estimated cost: `) + theme.colors.accent(formatCost(nextIterationEstimate.estimatedCost)));
                        console.log(theme.colors.dim("─".repeat(80)));
                        console.log("");

                        // Prompt user to confirm proceeding with next iteration
                        if (process.stdin.isTTY && process.stdout.isTTY) {
                            const rl = readline.createInterface({
                                input: process.stdin,
                                output: process.stdout
                            });

                            const answer = await rl.question(theme.colors.warning(`Continue with iteration ${i + 1}/${iterations}? (y/n): `));
                            rl.close();

                            if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                                console.log("");
                                console.log(theme.colors.dim(`Stopped after ${i} iteration(s).`));
                                console.log("");
                                break;
                            }
                            console.log("");
                        }
                    }
                }

                const totalDuration = ((Date.now() - t0) / 1000).toFixed(1);
                if (iterations > 1) {
                    console.log(theme.colors.success(`🎉 All ${iterations} iterations complete in ${totalDuration}s!`));
                }
                debugLog("optimize.done", { provider, iterations, totalMs: Date.now() - t0, finalLength: optimized.length });

                // Display actual cost if requested
                if (options.showCost) {
                    const actualModel = modelToUse || getDefaultModelForProvider(provider);
                    const optimizationCost = calculateCost(totalInputTokens, totalOutputTokens, actualModel);
                    const totalCost = optimizationCost + (analyzeInputTokens > 0 ? calculateCost(analyzeInputTokens, analyzeOutputTokens, actualModel) : 0);

                    const pricingInfo = getPricingBreakdown(actualModel);

                    console.log("");
                    console.log(theme.colors.primary("💰 Actual Cost"));
                    console.log(theme.colors.dim("─".repeat(80)));
                    console.log(theme.colors.info(`   Model: `) + theme.colors.secondary(actualModel));

                    if (pricingInfo) {
                        console.log(theme.colors.dim(`   Pricing:`));
                        console.log(theme.colors.dim(`      Input:  $${pricingInfo.inputPricePer1M.toFixed(2)}/1M tokens ($${pricingInfo.inputPricePerToken}/token)`));
                        console.log(theme.colors.dim(`      Output: $${pricingInfo.outputPricePer1M.toFixed(2)}/1M tokens ($${pricingInfo.outputPricePerToken}/token)`));
                        console.log("");
                    }

                    if (analyzeInputTokens > 0) {
                        const analyzeCost = calculateCost(analyzeInputTokens, analyzeOutputTokens, actualModel);
                        console.log(theme.colors.info(`   Analysis tokens: `) + theme.colors.secondary(`${formatTokens(analyzeInputTokens)} in + ${formatTokens(analyzeOutputTokens)} out`));
                        console.log(theme.colors.info(`   Analysis cost: `) + theme.colors.secondary(formatCost(analyzeCost)));
                    }

                    console.log(theme.colors.info(`   Optimization tokens: `) + theme.colors.secondary(`${formatTokens(totalInputTokens)} in + ${formatTokens(totalOutputTokens)} out`));
                    console.log(theme.colors.info(`   Optimization cost: `) + theme.colors.secondary(formatCost(optimizationCost)));

                    if (analyzeInputTokens > 0) {
                        console.log(theme.colors.info(`   Total cost: `) + theme.colors.accent(formatCost(totalCost)));
                    } else {
                        console.log(theme.colors.info(`   Total cost: `) + theme.colors.accent(formatCost(optimizationCost)));
                    }

                    // Show comparison with estimate
                    if (costEstimate) {
                        const accuracy = ((costEstimate.estimatedCost / (analyzeInputTokens > 0 ? totalCost : optimizationCost)) * 100).toFixed(1);
                        console.log(theme.colors.dim(`   Estimate accuracy: ${accuracy}%`));
                    }

                    console.log(theme.colors.dim("─".repeat(80)));
                    console.log("");
                }
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

// Analyze command - get detailed feedback on a prompt
program
    .command("analyze")
    .description("Analyze a prompt and get detailed feedback")
    .argument("[prompt]", "The prompt to analyze (or omit to use other input methods)")
    .option("-f, --file <path>", "Read prompt from file")
    .option("-o, --output <path>", "Write analysis to file")
    .option("--no-copy", "Don't copy analysis to clipboard (copy is default)")
    .option("-k, --api-key <key>", "Provider API key/token (overrides saved config)")
    .option("-p, --provider <provider>", `Provider (${PROVIDERS.join(", ")})`)
    .option("--show-cost", "Display estimated cost before running")
    .option("--estimate-only", "Only show cost estimate without running analysis")
    .action(async (inlinePrompt, options) => {
        try {
            debugLog("analyze.invoked", {
                argv: process.argv.slice(2),
                tty: { stdin: !!process.stdin.isTTY, stdout: !!process.stdout.isTTY, stderr: !!process.stderr.isTTY },
                options: { file: options.file, output: options.output, copy: options.copy !== false, provider: options.provider, hasApiKeyFlag: !!options.apiKey }
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

            // Cost estimation
            const modelForCost = modelToUse || getDefaultModelForProvider(provider);
            const costEstimate = estimateAnalysisCost(original, modelForCost);

            if (options.showCost || options.estimateOnly) {
                const pricingInfo = getPricingBreakdown(modelForCost);

                console.log("");
                console.log(theme.colors.primary("💰 Cost Estimate"));
                console.log(theme.colors.dim("─".repeat(80)));
                console.log(theme.colors.info(`   Model: `) + theme.colors.secondary(modelForCost));

                if (pricingInfo) {
                    console.log(theme.colors.dim(`   Pricing:`));
                    console.log(theme.colors.dim(`      Input:  $${pricingInfo.inputPricePer1M.toFixed(2)}/1M tokens (${pricingInfo.inputPricePerToken}/token)`));
                    console.log(theme.colors.dim(`      Output: $${pricingInfo.outputPricePer1M.toFixed(2)}/1M tokens (${pricingInfo.outputPricePerToken}/token)`));
                    console.log("");
                }

                console.log(theme.colors.info(`   Input tokens: `) + theme.colors.secondary(formatTokens(costEstimate.inputTokens)));
                console.log(theme.colors.info(`   Output tokens (est): `) + theme.colors.secondary(formatTokens(costEstimate.outputTokens)));
                console.log(theme.colors.info(`   Estimated cost: `) + theme.colors.accent(formatCost(costEstimate.estimatedCost)));
                console.log(theme.colors.dim("─".repeat(80)));
                console.log("");

                if (options.estimateOnly) {
                    console.log(theme.colors.dim("💡 Tip: Remove --estimate-only to run the actual analysis"));
                    console.log("");
                    return;
                }

                // Prompt user to confirm proceeding with the operation
                if (process.stdin.isTTY && process.stdout.isTTY) {
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });

                    const answer = await rl.question(theme.colors.warning("Do you want to proceed with this operation? (y/n): "));
                    rl.close();

                    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
                        console.log("");
                        console.log(theme.colors.dim("Operation cancelled."));
                        console.log("");
                        return;
                    }
                    console.log("");
                }
            }

            console.log("");
            console.log(theme.colors.primary("🔍 Analyzing your prompt..."));
            console.log("");

            const spinner = createSpinner(`Analyzing with ${formatProviderName(provider)}...`);
            spinner.start();

            const t0 = Date.now();
            let analysisResult: ResultWithUsage;

            try {
                if (provider === "openai") {
                    analysisResult = await analyzePromptOpenAI(original, apiKey, modelToUse);
                } else if (provider === "anthropic") {
                    analysisResult = await analyzePromptAnthropic(original, apiKey, modelToUse);
                } else if (provider === "google") {
                    analysisResult = await analyzePromptGemini(original, apiKey, modelToUse);
                } else if (provider === "xai") {
                    analysisResult = await analyzePromptXAI(original, apiKey, modelToUse);
                } else if (provider === "deepseek") {
                    analysisResult = await analyzePromptDeepSeek(original, apiKey, modelToUse);
                } else {
                    throw new Error(`Unsupported provider: ${provider}`);
                }

                const duration = ((Date.now() - t0) / 1000).toFixed(1);
                spinner.stop(`Analysis complete in ${duration}s`);
                debugLog("analyze.done", { provider, ms: Date.now() - t0, analysisLength: analysisResult.result.length });
            } catch (e) {
                debugLog("analyze.error", { provider, ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) });
                spinner.fail("Analysis failed");
                console.error("");
                throw e;
            }

            // Output the analysis
            console.log("");
            console.log(theme.colors.dim("─".repeat(80)));
            console.log("");
            console.log(analysisResult.result);
            console.log("");
            console.log(theme.colors.dim("─".repeat(80)));
            console.log("");

            // Display actual cost if requested
            if (options.showCost) {
                const actualModel = modelToUse || getDefaultModelForProvider(provider);
                const actualCost = calculateCost(analysisResult.usage.inputTokens, analysisResult.usage.outputTokens, actualModel);
                const pricingInfo = getPricingBreakdown(actualModel);

                console.log(theme.colors.primary("💰 Actual Cost"));
                console.log(theme.colors.dim("─".repeat(80)));
                console.log(theme.colors.info(`   Model: `) + theme.colors.secondary(actualModel));

                if (pricingInfo) {
                    console.log(theme.colors.dim(`   Pricing:`));
                    console.log(theme.colors.dim(`      Input:  $${pricingInfo.inputPricePer1M.toFixed(2)}/1M tokens ($${pricingInfo.inputPricePerToken}/token)`));
                    console.log(theme.colors.dim(`      Output: $${pricingInfo.outputPricePer1M.toFixed(2)}/1M tokens ($${pricingInfo.outputPricePerToken}/token)`));
                    console.log("");
                }

                console.log(theme.colors.info(`   Input tokens: `) + theme.colors.secondary(formatTokens(analysisResult.usage.inputTokens)));
                console.log(theme.colors.info(`   Output tokens: `) + theme.colors.secondary(formatTokens(analysisResult.usage.outputTokens)));
                console.log(theme.colors.info(`   Actual cost: `) + theme.colors.accent(formatCost(actualCost)));

                // Show comparison with estimate
                if (costEstimate) {
                    const accuracy = ((costEstimate.estimatedCost / actualCost) * 100).toFixed(1);
                    console.log(theme.colors.dim(`   Estimate accuracy: ${accuracy}%`));
                }

                console.log(theme.colors.dim("─".repeat(80)));
                console.log("");
            }

            const analysis = analysisResult.result;

            // Handle output options
            if (options.output) {
                await fs.writeFile(options.output, analysis, "utf-8");
                console.log(theme.colors.success(`💾 Analysis saved to ${options.output}`));
                console.log("");
            }

            // Copy to clipboard by default (unless --no-copy is specified)
            if (options.copy !== false) {
                try {
                    await clipboardy.default.write(analysis);
                    console.log(theme.colors.info("📋 Analysis copied to clipboard"));
                    console.log("");
                } catch (error) {
                    debugLog("clipboard.error", { error: error instanceof Error ? error.message : String(error) });
                }
            }
        } catch (error) {
            console.error("");
            console.error(theme.colors.error("❌ Error: ") + theme.colors.warning(error instanceof Error ? error.message : String(error)));
            console.error("");
            process.exit(1);
        }
    });

// Interactive shell command
program
    .command('shell')
    .aliases(['interactive', 'i'])
    .description('Start interactive shell mode (run commands without typing "megabuff" each time)')
    .action(async () => {
        await startInteractiveShell();
    });

program.parse();