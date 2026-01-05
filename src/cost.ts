import type { Provider } from "./config.js";

/**
 * Pricing information for different models (per 1M tokens)
 * Prices are in USD and updated as of January 2025
 */
interface ModelPricing {
    input: number;  // Cost per 1M input tokens
    output: number; // Cost per 1M output tokens
}

// Pricing data for all supported models
const MODEL_PRICING: Record<string, ModelPricing> = {
    // OpenAI models
    "gpt-5.2": { input: 2.50, output: 10.00 },
    "gpt-4o": { input: 2.50, output: 10.00 },
    "gpt-4o-mini": { input: 0.15, output: 0.60 },
    "gpt-4-turbo": { input: 10.00, output: 30.00 },
    "gpt-4": { input: 30.00, output: 60.00 },
    "gpt-3.5-turbo": { input: 0.50, output: 1.50 },

    // Anthropic models
    "claude-opus-4-5": { input: 15.00, output: 75.00 },
    "claude-sonnet-4-5": { input: 3.00, output: 15.00 },
    "claude-sonnet-4-0": { input: 3.00, output: 15.00 },
    "claude-sonnet-4": { input: 3.00, output: 15.00 },
    "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
    "claude-sonnet-4-5-20250929": { input: 3.00, output: 15.00 },
    "claude-3-opus-20240229": { input: 15.00, output: 75.00 },
    "claude-3-sonnet-20240229": { input: 3.00, output: 15.00 },
    "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },

    // Google Gemini models (prices are approximate, Google uses different pricing tiers)
    "gemini-flash-latest": { input: 0.075, output: 0.30 },
    "gemini-2.5-flash": { input: 0.075, output: 0.30 },
    "gemini-3-flash-preview": { input: 0.075, output: 0.30 },
    "gemini-3-pro-preview": { input: 1.25, output: 5.00 },
    "gemini-2.5-flash-lite": { input: 0.04, output: 0.15 },
    "gemini-2.5-pro": { input: 1.25, output: 5.00 },
    "gemini-2.0-flash": { input: 0.075, output: 0.30 },
    "gemini-2.0-flash-lite": { input: 0.04, output: 0.15 },

    // xAI (Grok) models
    "grok-beta": { input: 5.00, output: 15.00 },
    "grok-vision-beta": { input: 5.00, output: 15.00 },

    // DeepSeek models
    "deepseek-chat": { input: 0.14, output: 0.28 },
    "deepseek-reasoner": { input: 0.55, output: 2.19 },
};

/**
 * Estimate token count from text (rough approximation)
 * More accurate token counting would require the actual tokenizer for each model
 */
export function estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token on average
    // This is a conservative estimate and works reasonably well for English text
    return Math.ceil(text.length / 4);
}

/**
 * Get pricing for a specific model
 */
export function getModelPricing(model: string): ModelPricing | null {
    return MODEL_PRICING[model] || null;
}

/**
 * Calculate cost for a given number of tokens
 */
export function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = getModelPricing(model);
    if (!pricing) {
        return 0; // Unknown model, can't estimate
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
}

/**
 * Estimate cost for a prompt optimization
 */
export function estimateOptimizationCost(
    promptText: string,
    model: string,
    iterations: number = 1,
    systemPromptLength: number = 500 // Approximate system prompt size
): { inputTokens: number; outputTokens: number; estimatedCost: number } {
    const promptTokens = estimateTokens(promptText);
    const systemTokens = systemPromptLength;

    // For each iteration:
    // Input = system prompt + current prompt
    // Output = optimized prompt (assume similar size to input, maybe slightly larger)
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    let currentPromptTokens = promptTokens;

    for (let i = 0; i < iterations; i++) {
        totalInputTokens += systemTokens + currentPromptTokens;
        // Assume output is 1.2x the input prompt size (optimization often adds detail)
        const iterationOutput = Math.ceil(currentPromptTokens * 1.2);
        totalOutputTokens += iterationOutput;
        currentPromptTokens = iterationOutput; // Next iteration uses this output as input
    }

    const estimatedCost = calculateCost(totalInputTokens, totalOutputTokens, model);

    return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        estimatedCost,
    };
}

/**
 * Estimate cost for a prompt analysis
 */
export function estimateAnalysisCost(
    promptText: string,
    model: string,
    systemPromptLength: number = 400
): { inputTokens: number; outputTokens: number; estimatedCost: number } {
    const promptTokens = estimateTokens(promptText);
    const systemTokens = systemPromptLength;

    const inputTokens = systemTokens + promptTokens;
    // Analysis typically generates a detailed report, estimate ~800 tokens
    const outputTokens = 800;

    const estimatedCost = calculateCost(inputTokens, outputTokens, model);

    return {
        inputTokens,
        outputTokens,
        estimatedCost,
    };
}

/**
 * Format cost as a human-readable string
 */
export function formatCost(cost: number): string {
    if (cost < 0.0001) {
        return "<$0.0001";
    } else if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
    } else if (cost < 1) {
        return `$${cost.toFixed(3)}`;
    } else {
        return `$${cost.toFixed(2)}`;
    }
}

/**
 * Get default model for a provider (for cost estimation)
 */
const DEFAULT_MODELS: Record<Provider, string> = {
    openai: "gpt-5.2",
    anthropic: "claude-opus-4-5",
    google: "gemini-2.5-flash",
    xai: "grok-beta",
    deepseek: "deepseek-chat",
    "azure-openai": "gpt-4o-mini",
};

export function getDefaultModelForProvider(provider: Provider): string {
    return DEFAULT_MODELS[provider];
}

/**
 * Format tokens with comma separators
 */
export function formatTokens(tokens: number): string {
    return tokens.toLocaleString();
}

/**
 * Get detailed pricing breakdown for a model
 */
export function getPricingBreakdown(model: string): {
    model: string;
    inputPricePer1M: number;
    outputPricePer1M: number;
    inputPricePerToken: string;
    outputPricePerToken: string;
} | null {
    const pricing = getModelPricing(model);
    if (!pricing) {
        return null;
    }

    return {
        model,
        inputPricePer1M: pricing.input,
        outputPricePer1M: pricing.output,
        inputPricePerToken: `$${(pricing.input / 1_000_000).toFixed(9)}`,
        outputPricePerToken: `$${(pricing.output / 1_000_000).toFixed(9)}`,
    };
}
