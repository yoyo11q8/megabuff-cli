import * as fs from "fs/promises";
import * as path from "path";
import { homedir } from "os";

const CONFIG_DIR = path.join(homedir(), ".megabuff");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const SERVICE_NAME = "megabuff-cli";
// Legacy (pre-provider) keychain account name for backwards compatibility
const LEGACY_ACCOUNT_NAME = "openai-api-key";

export type Provider = "openai" | "anthropic" | "google" | "azure-openai";

export const PROVIDERS: readonly Provider[] = ["openai", "anthropic", "google", "azure-openai"] as const;

// Model to provider mapping
export const MODEL_PROVIDER_MAP: Record<string, Provider> = {
    // OpenAI models
    "gpt-4o": "openai",
    "gpt-4o-mini": "openai",
    "gpt-4-turbo": "openai",
    "gpt-4": "openai",
    "gpt-3.5-turbo": "openai",
    // Anthropic models
    "claude-opus-4-5": "anthropic",
    "claude-sonnet-4-5": "anthropic",
    "claude-sonnet-4": "anthropic",
    "claude-3-5-sonnet-20241022": "anthropic",
    "claude-sonnet-4-5-20250929": "anthropic",
    "claude-3-opus-20240229": "anthropic",
    "claude-3-sonnet-20240229": "anthropic",
    "claude-3-haiku-20240307": "anthropic",
    // Google Gemini models
    "gemini-2.0-flash-exp": "google",
    "gemini-1.5-pro": "google",
    "gemini-1.5-flash": "google",
    "gemini-1.0-pro": "google",
};

export function getProviderForModel(model: string): Provider | undefined {
    return MODEL_PROVIDER_MAP[model];
}

export function normalizeProvider(input: string | undefined): Provider | undefined {
    if (!input) return undefined;
    const v = input.trim().toLowerCase();
    if (v === "openai") return "openai";
    if (v === "anthropic") return "anthropic";
    if (v === "google" || v === "gemini") return "google";
    if (v === "azure-openai" || v === "azure") return "azure-openai";
    return undefined;
}

function getAccountName(provider: Provider): string {
    return `${provider}-api-key`;
}

interface Config {
    // Selected default provider for commands that don't specify one
    provider?: Provider;
    // Provider-specific keys (used when not storing in keychain)
    apiKeys?: Partial<Record<Provider, string>>;
    // Legacy single-key storage (pre-provider). Kept for migrations only.
    apiKey?: string;
    useKeychain?: boolean;
    model?: string;
}

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
    try {
        await fs.mkdir(CONFIG_DIR, { recursive: true });
    } catch (error) {
        // Directory might already exist, ignore
    }
}

/**
 * Read config file
 */
async function readConfig(): Promise<Config> {
    try {
        const data = await fs.readFile(CONFIG_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

/**
 * Write config file
 */
async function writeConfig(config: Config): Promise<void> {
    await ensureConfigDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Get API key from keychain
 */
async function getKeychainKey(provider: Provider): Promise<string | null> {
    try {
        const keytar = await import("keytar");
        const account = getAccountName(provider);
        const val = await keytar.getPassword(SERVICE_NAME, account);
        // Backwards-compat: older versions stored only OpenAI under a fixed name
        if (!val && provider === "openai") {
            return await keytar.getPassword(SERVICE_NAME, LEGACY_ACCOUNT_NAME);
        }
        return val;
    } catch (error) {
        // Keychain not available or error
        return null;
    }
}

/**
 * Set API key in keychain
 */
async function setKeychainKey(provider: Provider, apiKey: string): Promise<void> {
    const keytar = await import("keytar");
    await keytar.setPassword(SERVICE_NAME, getAccountName(provider), apiKey);
}

/**
 * Delete API key from keychain
 */
async function deleteKeychainKey(provider: Provider): Promise<void> {
    try {
        const keytar = await import("keytar");
        await keytar.deletePassword(SERVICE_NAME, getAccountName(provider));
        if (provider === "openai") {
            await keytar.deletePassword(SERVICE_NAME, LEGACY_ACCOUNT_NAME);
        }
    } catch (error) {
        // Ignore if not found
    }
}

/**
 * Get the selected provider (CLI flag > config > default openai)
 */
export async function getProvider(cliProvider?: string): Promise<Provider> {
    const normalized = normalizeProvider(cliProvider);
    if (normalized) return normalized;
    const config = await readConfig();
    return config.provider || "openai";
}

/**
 * Persist the selected provider in config (does not validate key presence)
 */
export async function setProvider(provider: Provider): Promise<void> {
    const config = await readConfig();
    config.provider = provider;
    await writeConfig(config);
}

/**
 * Set the model and automatically set the provider based on the model
 */
export async function setModel(model: string): Promise<void> {
    const config = await readConfig();
    config.model = model;

    // Automatically set provider based on model
    const provider = getProviderForModel(model);
    if (provider) {
        config.provider = provider;
    }

    await writeConfig(config);
}

/**
 * Get the configured model (or undefined if not set)
 */
export async function getModel(): Promise<string | undefined> {
    const config = await readConfig();
    return config.model;
}

/**
 * Get API key with priority:
 * 1. Command line flag
 * 2. Environment variable
 * 3. Keychain (if configured)
 * 4. Config file
 */
export async function getApiKey(provider: Provider, cliKey?: string): Promise<string | undefined> {
    // Priority 1: CLI flag
    if (cliKey) {
        return cliKey;
    }

    // Priority 2: Environment variable
    if (provider === "openai" && process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    if (provider === "google" && process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
    if (provider === "azure-openai" && process.env.AZURE_OPENAI_API_KEY) return process.env.AZURE_OPENAI_API_KEY;

    const config = await readConfig();

    // Priority 3: Keychain
    if (config.useKeychain) {
        const keychainKey = await getKeychainKey(provider);
        if (keychainKey) {
            return keychainKey;
        }
    }

    // Priority 4: Config file
    const providerKey = config.apiKeys?.[provider];
    if (providerKey) return providerKey;
    // Backwards-compat: pre-provider single key was OpenAI
    if (provider === "openai") return config.apiKey;
    return undefined;
}

export type ApiKeySource = "cli" | "env" | "keychain" | "config" | "none";

/**
 * Same as getApiKey(), but also returns where the key came from (for debugging).
 * Never log the raw key value.
 */
export async function getApiKeyInfo(
    provider: Provider,
    cliKey?: string
): Promise<{ apiKey?: string; source: ApiKeySource }> {
    // Priority 1: CLI flag
    if (cliKey) {
        return { apiKey: cliKey, source: "cli" };
    }

    // Priority 2: Environment variable
    if (provider === "openai" && process.env.OPENAI_API_KEY) return { apiKey: process.env.OPENAI_API_KEY, source: "env" };
    if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) return { apiKey: process.env.ANTHROPIC_API_KEY, source: "env" };
    if (provider === "google" && process.env.GOOGLE_API_KEY) return { apiKey: process.env.GOOGLE_API_KEY, source: "env" };
    if (provider === "azure-openai" && process.env.AZURE_OPENAI_API_KEY) return { apiKey: process.env.AZURE_OPENAI_API_KEY, source: "env" };

    const config = await readConfig();

    // Priority 3: Keychain
    if (config.useKeychain) {
        const keychainKey = await getKeychainKey(provider);
        if (keychainKey) {
            return { apiKey: keychainKey, source: "keychain" };
        }
    }

    // Priority 4: Config file
    const providerKey = config.apiKeys?.[provider];
    if (providerKey) return { apiKey: providerKey, source: "config" };
    if (provider === "openai" && config.apiKey) return { apiKey: config.apiKey, source: "config" };

    return { source: "none" };
}

/**
 * Set API key in config or keychain
 */
export async function setApiKey(provider: Provider, apiKey: string, useKeychain: boolean = false): Promise<void> {
    const config = await readConfig();
    config.provider = provider;

    if (useKeychain) {
        // Store in keychain
        await setKeychainKey(provider, apiKey);
        // Update config to indicate keychain usage, but don't store the key(s)
        config.useKeychain = true;
    } else {
        // Store in config file
        config.apiKeys = config.apiKeys || {};
        config.apiKeys[provider] = apiKey;
        config.useKeychain = false;
        // Remove from keychain if it was there
        await deleteKeychainKey(provider);
    }

    // Clear legacy field if present (it maps to OpenAI only)
    if (config.apiKey) delete config.apiKey;

    await writeConfig(config);
}

/**
 * Get current configuration
 */
export async function getConfig(): Promise<Config> {
    return await readConfig();
}

/**
 * Update configuration
 */
export async function updateConfig(updates: Partial<Config>): Promise<void> {
    const config = await readConfig();
    Object.assign(config, updates);
    await writeConfig(config);
}

/**
 * Remove API key from config and keychain
 */
export async function removeApiKey(provider: Provider): Promise<void> {
    const config = await readConfig();
    if (config.apiKeys?.[provider]) {
        delete config.apiKeys[provider];
    }
    // Backwards-compat: legacy single key was OpenAI
    if (provider === "openai" && config.apiKey) {
        delete config.apiKey;
    }
    // Keep useKeychain as-is; user may be storing other providers there.
    await writeConfig(config);
    await deleteKeychainKey(provider);
}

/**
 * Check if API key is configured
 */
export async function hasApiKey(provider: Provider): Promise<boolean> {
    const config = await readConfig();

    if (config.useKeychain) {
        const keychainKey = await getKeychainKey(provider);
        return !!keychainKey;
    }

    const providerKey = config.apiKeys?.[provider];
    if (providerKey) return true;
    // Backwards-compat: pre-provider single key was OpenAI
    if (provider === "openai") return !!config.apiKey;
    return false;
}
