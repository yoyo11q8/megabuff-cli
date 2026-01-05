import type { Provider } from "./config.js";

// Model to provider mapping
export const MODEL_PROVIDER_MAP: Record<string, Provider> = {
    // OpenAI models
    "gpt-5.2": "openai",
    "gpt-4o-mini": "openai",
    "gpt-4-turbo": "openai",
    "gpt-4": "openai",
    "gpt-3.5-turbo": "openai",
    // Anthropic models
    "claude-opus-4-5": "anthropic",
    "claude-sonnet-4-5": "anthropic",
    "claude-sonnet-4-0": "anthropic",
    "claude-3-5-sonnet-20241022": "anthropic",
    "claude-sonnet-4-5-20250929": "anthropic",
    "claude-3-opus-20240229": "anthropic",
    "claude-3-sonnet-20240229": "anthropic",
    "claude-3-haiku-20240307": "anthropic",
    // Google Gemini models
    "gemini-flash-latest": "google",
    "gemini-2.5-flash": "google",
    "gemini-3-flash-preview": "google",
    "gemini-3-pro-preview": "google",
    "gemini-2.5-flash-lite": "google",
    "gemini-2.5-pro": "google",
    "gemini-2.0-flash": "google",
    "gemini-2.0-flash-lite": "google",
    // xAI (Grok) models
    "grok-beta": "xai",
    "grok-vision-beta": "xai",
    // DeepSeek models
    "deepseek-chat": "deepseek",
    "deepseek-reasoner": "deepseek",
};

export const DEFAULT_MODEL_BY_PROVIDER: Record<Provider, string> = {
    openai: "gpt-5.2",
    anthropic: "claude-opus-4-5",
    google: "gemini-2.5-flash",
    xai: "grok-beta",
    deepseek: "deepseek-chat",
    // Placeholder until Azure OpenAI is supported end-to-end in this CLI
    "azure-openai": "gpt-4o-mini",
};

export function getDefaultModel(provider: Provider): string {
    return DEFAULT_MODEL_BY_PROVIDER[provider];
}

