import { getThemeName } from "./config.js";
import { getTheme, type Theme } from "./themes.js";

let cachedTheme: Theme | null = null;

/**
 * Get the current theme colors
 */
export async function getCurrentTheme(): Promise<Theme> {
    if (!cachedTheme) {
        const themeName = await getThemeName();
        cachedTheme = getTheme(themeName);
    }
    return cachedTheme;
}

/**
 * Clear the theme cache (call after theme change)
 */
export function clearThemeCache(): void {
    cachedTheme = null;
}

/**
 * Get theme colors synchronously (requires theme to be loaded first)
 */
export function getThemeColors(): Theme["colors"] {
    if (!cachedTheme) {
        // Fallback to default theme if not loaded yet
        return getTheme("default").colors;
    }
    return cachedTheme.colors;
}
