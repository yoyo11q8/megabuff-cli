import chalk from "chalk";

export type ThemeName = "default" | "material" | "dracula" | "nord" | "solarized" | "monokai" | "cyberpunk" | "sunset";

export interface Theme {
    name: string;
    description: string;
    colors: {
        primary: typeof chalk;
        secondary: typeof chalk;
        success: typeof chalk;
        error: typeof chalk;
        warning: typeof chalk;
        info: typeof chalk;
        dim: typeof chalk;
        highlight: typeof chalk;
        accent: typeof chalk;
    };
}

export const themes: Record<ThemeName, Theme> = {
    default: {
        name: "Default",
        description: "Clean cyan and green theme",
        colors: {
            primary: chalk.cyan,
            secondary: chalk.white,
            success: chalk.green,
            error: chalk.red,
            warning: chalk.yellow,
            info: chalk.blue,
            dim: chalk.dim,
            highlight: chalk.bold.cyan,
            accent: chalk.magenta,
        },
    },
    material: {
        name: "Material Design",
        description: "Inspired by Material Design colors",
        colors: {
            primary: chalk.hex("#2196F3"), // Material Blue
            secondary: chalk.hex("#90CAF9"), // Light Blue
            success: chalk.hex("#4CAF50"), // Material Green
            error: chalk.hex("#F44336"), // Material Red
            warning: chalk.hex("#FF9800"), // Material Orange
            info: chalk.hex("#00BCD4"), // Material Cyan
            dim: chalk.gray,
            highlight: chalk.bold.hex("#2196F3"),
            accent: chalk.hex("#E91E63"), // Material Pink
        },
    },
    dracula: {
        name: "Dracula",
        description: "Dark theme with purple and pink accents",
        colors: {
            primary: chalk.hex("#BD93F9"), // Purple
            secondary: chalk.hex("#F8F8F2"), // Foreground
            success: chalk.hex("#50FA7B"), // Green
            error: chalk.hex("#FF5555"), // Red
            warning: chalk.hex("#FFB86C"), // Orange
            info: chalk.hex("#8BE9FD"), // Cyan
            dim: chalk.hex("#6272A4"), // Comment
            highlight: chalk.bold.hex("#FF79C6"), // Pink
            accent: chalk.hex("#FF79C6"), // Pink
        },
    },
    nord: {
        name: "Nord",
        description: "Arctic, north-bluish color palette",
        colors: {
            primary: chalk.hex("#88C0D0"), // Nord Frost
            secondary: chalk.hex("#ECEFF4"), // Nord Snow Storm
            success: chalk.hex("#A3BE8C"), // Nord Aurora Green
            error: chalk.hex("#BF616A"), // Nord Aurora Red
            warning: chalk.hex("#EBCB8B"), // Nord Aurora Yellow
            info: chalk.hex("#81A1C1"), // Nord Frost Blue
            dim: chalk.hex("#4C566A"), // Nord Polar Night
            highlight: chalk.bold.hex("#8FBCBB"), // Nord Frost
            accent: chalk.hex("#B48EAD"), // Nord Aurora Purple
        },
    },
    solarized: {
        name: "Solarized Dark",
        description: "Precision colors for machines and people",
        colors: {
            primary: chalk.hex("#268BD2"), // Blue
            secondary: chalk.hex("#93A1A1"), // Base1
            success: chalk.hex("#859900"), // Green
            error: chalk.hex("#DC322F"), // Red
            warning: chalk.hex("#B58900"), // Yellow
            info: chalk.hex("#2AA198"), // Cyan
            dim: chalk.hex("#586E75"), // Base01
            highlight: chalk.bold.hex("#6C71C4"), // Violet
            accent: chalk.hex("#D33682"), // Magenta
        },
    },
    monokai: {
        name: "Monokai",
        description: "Vibrant and colorful, inspired by Monokai Pro",
        colors: {
            primary: chalk.hex("#66D9EF"), // Cyan
            secondary: chalk.hex("#F8F8F2"), // Foreground
            success: chalk.hex("#A6E22E"), // Green
            error: chalk.hex("#F92672"), // Pink/Red
            warning: chalk.hex("#E6DB74"), // Yellow
            info: chalk.hex("#AE81FF"), // Purple
            dim: chalk.hex("#75715E"), // Comment
            highlight: chalk.bold.hex("#FD971F"), // Orange
            accent: chalk.hex("#FD971F"), // Orange
        },
    },
    cyberpunk: {
        name: "Cyberpunk",
        description: "Neon lights and futuristic vibes",
        colors: {
            primary: chalk.hex("#00FFFF"), // Neon Cyan
            secondary: chalk.hex("#FF00FF"), // Neon Magenta
            success: chalk.hex("#00FF00"), // Neon Green
            error: chalk.hex("#FF0066"), // Hot Pink
            warning: chalk.hex("#FFFF00"), // Neon Yellow
            info: chalk.hex("#00CCFF"), // Electric Blue
            dim: chalk.hex("#666666"),
            highlight: chalk.bold.hex("#FF00FF"),
            accent: chalk.hex("#FF6600"), // Neon Orange
        },
    },
    sunset: {
        name: "Sunset",
        description: "Warm oranges, pinks, and purples",
        colors: {
            primary: chalk.hex("#FF6B6B"), // Coral
            secondary: chalk.hex("#FFA07A"), // Light Salmon
            success: chalk.hex("#98D8C8"), // Mint
            error: chalk.hex("#E63946"), // Red
            warning: chalk.hex("#FFB347"), // Pastel Orange
            info: chalk.hex("#4ECDC4"), // Turquoise
            dim: chalk.gray,
            highlight: chalk.bold.hex("#C77DFF"), // Purple
            accent: chalk.hex("#FF9ECD"), // Pink
        },
    },
};

export function getTheme(themeName: ThemeName = "default"): Theme {
    return themes[themeName] || themes.default;
}

export function getAllThemeNames(): ThemeName[] {
    return Object.keys(themes) as ThemeName[];
}

export function isValidTheme(name: string): name is ThemeName {
    return name in themes;
}
