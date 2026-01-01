#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs/promises";
import * as readline from "readline/promises";
import OpenAI from "openai";
import { getApiKey, setApiKey, removeApiKey, hasApiKey, getConfig } from "./config.js";

const program = new Command();

program
    .name("megabuff")
    .description("AI prompt optimizer CLI")
    .version("0.1.0");

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
        return inlinePrompt;
    }

    // Priority 2: File input
    if (options.file) {
        try {
            return await fs.readFile(options.file, "utf-8");
        } catch (error) {
            throw new Error(`Failed to read file: ${options.file}`);
        }
    }

    // Priority 3: Check if stdin is piped
    if (!process.stdin.isTTY) {
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
async function optimizePrompt(prompt: string, apiKey: string | undefined): Promise<string> {
    if (!apiKey) {
        throw new Error("OpenAI API key not found. Set OPENAI_API_KEY environment variable.");
    }

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
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Optimize this prompt:\n\n${prompt}` }
            ],
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "Error: No response from OpenAI";
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`OpenAI API error: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Output the result based on options
 */
async function outputResult(
    original: string,
    optimized: string,
    options: { output?: string; interactive?: boolean }
): Promise<void> {
    // If output file specified, write to file
    if (options.output) {
        await fs.writeFile(options.output, optimized, "utf-8");
        console.error(`✓ Optimized prompt saved to: ${options.output}`);
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
    .description("Set your OpenAI API key")
    .argument("<api-key>", "Your OpenAI API key")
    .option("--keychain", "Store in system keychain (more secure)")
    .action(async (apiKey, options) => {
        try {
            await setApiKey(apiKey, options.keychain || false);
            if (options.keychain) {
                console.log("✓ API key saved securely in system keychain");
            } else {
                console.log("✓ API key saved to config file at ~/.megabuff/config.json");
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
            const hasKey = await hasApiKey();

            console.log("Current configuration:");
            console.log(`  API Key: ${hasKey ? "✓ Configured" : "✗ Not configured"}`);
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
    .description("Remove saved API key")
    .action(async () => {
        try {
            await removeApiKey();
            console.log("✓ API key removed from config and keychain");
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
    .option("-k, --api-key <key>", "OpenAI API key (overrides saved config)")
    .action(async (inlinePrompt, options) => {
        try {
            const original = await getInput(inlinePrompt, options);

            if (!original.trim()) {
                console.error("Error: No prompt provided");
                process.exit(1);
            }

            // Get API key with priority: CLI flag > env var > keychain > config file
            const apiKey = await getApiKey(options.apiKey);

            const optimized = await optimizePrompt(original, apiKey);
            await outputResult(original, optimized, options);
        } catch (error) {
            console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    });

program.parse();