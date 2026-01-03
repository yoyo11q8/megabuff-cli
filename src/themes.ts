import chalk from "chalk";

export type ThemeName = "default" | "material" | "dracula" | "nord" | "solarized" | "monokai" | "cyberpunk" | "sunset" | "pastel-rainbow" | "bubblegum" | "cotton-candy" | "unicorn" | "ocean" | "forest" | "retro" | "neon-dreams";

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
    "pastel-rainbow": {
        name: "Pastel Rainbow",
        description: "Soft rainbow pastels for a dreamy vibe",
        colors: {
            primary: chalk.hex("#a3c4f3"), // Pastel Blue
            secondary: chalk.hex("#cfbaf0"), // Pastel Purple
            success: chalk.hex("#b9fbc0"), // Pastel Green
            error: chalk.hex("#ffcfd2"), // Pastel Pink
            warning: chalk.hex("#fde4cf"), // Pastel Peach
            info: chalk.hex("#90dbf4"), // Pastel Cyan
            dim: chalk.hex("#999999"),
            highlight: chalk.bold.hex("#f1c0e8"), // Pastel Magenta
            accent: chalk.hex("#8eecf5"), // Pastel Turquoise
        },
    },
    bubblegum: {
        name: "Bubblegum",
        description: "Sweet pink hues like bubblegum dreams",
        colors: {
            primary: chalk.hex("#ff8fab"), // Bubblegum Pink
            secondary: chalk.hex("#ffc2d1"), // Light Pink
            success: chalk.hex("#b9fbc0"), // Mint Green
            error: chalk.hex("#fb6f92"), // Hot Pink
            warning: chalk.hex("#ffb3c6"), // Rose Pink
            info: chalk.hex("#a3c4f3"), // Pastel Blue
            dim: chalk.hex("#aaaaaa"),
            highlight: chalk.bold.hex("#ffe5ec"), // Pale Pink
            accent: chalk.hex("#f1c0e8"), // Lavender Pink
        },
    },
    "cotton-candy": {
        name: "Cotton Candy",
        description: "Fluffy pink and blue cotton candy colors",
        colors: {
            primary: chalk.hex("#ffc2d1"), // Pink
            secondary: chalk.hex("#a3c4f3"), // Baby Blue
            success: chalk.hex("#98f5e1"), // Mint
            error: chalk.hex("#ff8fab"), // Rose
            warning: chalk.hex("#ffe5ec"), // Pale Pink
            info: chalk.hex("#90dbf4"), // Sky Blue
            dim: chalk.hex("#bbbbbb"),
            highlight: chalk.bold.hex("#f1c0e8"), // Lavender
            accent: chalk.hex("#cfbaf0"), // Periwinkle
        },
    },
    unicorn: {
        name: "Unicorn",
        description: "Magical pastels with sparkle and shine",
        colors: {
            primary: chalk.hex("#f1c0e8"), // Pastel Magenta
            secondary: chalk.hex("#cfbaf0"), // Lavender
            success: chalk.hex("#b9fbc0"), // Mint
            error: chalk.hex("#ffcfd2"), // Pink
            warning: chalk.hex("#fbf8cc"), // Cream
            info: chalk.hex("#a3c4f3"), // Periwinkle
            dim: chalk.hex("#aaaaaa"),
            highlight: chalk.bold.hex("#8eecf5"), // Aqua
            accent: chalk.hex("#98f5e1"), // Seafoam
        },
    },
    ocean: {
        name: "Ocean",
        description: "Deep blues and aquas of the ocean",
        colors: {
            primary: chalk.hex("#0077be"), // Ocean Blue
            secondary: chalk.hex("#4dd0e1"), // Aqua
            success: chalk.hex("#26c6da"), // Cyan
            error: chalk.hex("#e91e63"), // Deep Pink
            warning: chalk.hex("#ffb74d"), // Orange
            info: chalk.hex("#4fc3f7"), // Light Blue
            dim: chalk.hex("#607d8b"),
            highlight: chalk.bold.hex("#00acc1"), // Teal
            accent: chalk.hex("#80deea"), // Light Cyan
        },
    },
    forest: {
        name: "Forest",
        description: "Earth tones and forest greens",
        colors: {
            primary: chalk.hex("#2e7d32"), // Forest Green
            secondary: chalk.hex("#66bb6a"), // Light Green
            success: chalk.hex("#81c784"), // Green
            error: chalk.hex("#d32f2f"), // Red
            warning: chalk.hex("#ff9800"), // Orange
            info: chalk.hex("#8d6e63"), // Brown
            dim: chalk.hex("#757575"),
            highlight: chalk.bold.hex("#4caf50"), // Bright Green
            accent: chalk.hex("#aed581"), // Lime
        },
    },
    retro: {
        name: "Retro",
        description: "Vintage 80s computer terminal vibes",
        colors: {
            primary: chalk.hex("#00ff00"), // Green CRT
            secondary: chalk.hex("#ffff00"), // Yellow
            success: chalk.hex("#00ff00"), // Green
            error: chalk.hex("#ff0000"), // Red
            warning: chalk.hex("#ff9900"), // Orange
            info: chalk.hex("#00ffff"), // Cyan
            dim: chalk.hex("#666666"),
            highlight: chalk.bold.hex("#00ff00"), // Bright Green
            accent: chalk.hex("#ff00ff"), // Magenta
        },
    },
    "neon-dreams": {
        name: "Neon Dreams",
        description: "Vibrant neons with a dreamy glow",
        colors: {
            primary: chalk.hex("#ff006e"), // Neon Pink
            secondary: chalk.hex("#8338ec"), // Purple
            success: chalk.hex("#06ffa5"), // Neon Green
            error: chalk.hex("#ff006e"), // Hot Pink
            warning: chalk.hex("#ffbe0b"), // Neon Yellow
            info: chalk.hex("#3a86ff"), // Electric Blue
            dim: chalk.hex("#777777"),
            highlight: chalk.bold.hex("#fb5607"), // Neon Orange
            accent: chalk.hex("#06ffa5"), // Mint
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
