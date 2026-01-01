import * as fs from "fs/promises";
import * as path from "path";
import { homedir } from "os";

const CONFIG_DIR = path.join(homedir(), ".megabuff");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const SERVICE_NAME = "megabuff-cli";
const ACCOUNT_NAME = "openai-api-key";

interface Config {
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
async function getKeychainKey(): Promise<string | null> {
    try {
        const keytar = await import("keytar");
        return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
        // Keychain not available or error
        return null;
    }
}

/**
 * Set API key in keychain
 */
async function setKeychainKey(apiKey: string): Promise<void> {
    const keytar = await import("keytar");
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
}

/**
 * Delete API key from keychain
 */
async function deleteKeychainKey(): Promise<void> {
    try {
        const keytar = await import("keytar");
        await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
        // Ignore if not found
    }
}

/**
 * Get API key with priority:
 * 1. Command line flag
 * 2. Environment variable
 * 3. Keychain (if configured)
 * 4. Config file
 */
export async function getApiKey(cliKey?: string): Promise<string | undefined> {
    // Priority 1: CLI flag
    if (cliKey) {
        return cliKey;
    }

    // Priority 2: Environment variable
    if (process.env.OPENAI_API_KEY) {
        return process.env.OPENAI_API_KEY;
    }

    const config = await readConfig();

    // Priority 3: Keychain
    if (config.useKeychain) {
        const keychainKey = await getKeychainKey();
        if (keychainKey) {
            return keychainKey;
        }
    }

    // Priority 4: Config file
    return config.apiKey;
}

/**
 * Set API key in config or keychain
 */
export async function setApiKey(apiKey: string, useKeychain: boolean = false): Promise<void> {
    const config = await readConfig();

    if (useKeychain) {
        // Store in keychain
        await setKeychainKey(apiKey);
        // Update config to indicate keychain usage, but don't store the key
        config.useKeychain = true;
        delete config.apiKey;
    } else {
        // Store in config file
        config.apiKey = apiKey;
        config.useKeychain = false;
        // Remove from keychain if it was there
        await deleteKeychainKey();
    }

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
export async function removeApiKey(): Promise<void> {
    const config = await readConfig();
    delete config.apiKey;
    config.useKeychain = false;
    await writeConfig(config);
    await deleteKeychainKey();
}

/**
 * Check if API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
    const config = await readConfig();

    if (config.useKeychain) {
        const keychainKey = await getKeychainKey();
        return !!keychainKey;
    }

    return !!config.apiKey;
}
