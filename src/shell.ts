import readline from 'readline';
import { program } from 'commander';
import { getTheme } from './themes.js';

const theme = getTheme();

/**
 * Start the interactive shell mode
 */
export async function startInteractiveShell(): Promise<void> {
    console.log("");
    console.log(theme.colors.primary("╭─────────────────────────────────────────────╮"));
    console.log(theme.colors.primary("│      🤖 MegaBuff Interactive Shell         │"));
    console.log(theme.colors.dim("│  Type commands without 'megabuff' prefix   │"));
    console.log(theme.colors.dim("│  'help' for commands • 'exit' to quit      │"));
    console.log(theme.colors.primary("╰─────────────────────────────────────────────╯"));
    console.log("");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: theme.colors.accent('megabuff> '),
        terminal: true
    });

    // Enable history
    rl.on('history', (history) => {
        // History is automatically maintained by readline
    });

    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        // Skip empty lines
        if (!input) {
            rl.prompt();
            return;
        }

        // Handle exit commands
        if (['exit', 'quit', 'q'].includes(input.toLowerCase())) {
            console.log(theme.colors.success("\n👋 Goodbye!\n"));
            rl.close();
            process.exit(0);
        }

        // Handle clear screen
        if (input.toLowerCase() === 'clear') {
            console.clear();
            console.log("");
            console.log(theme.colors.primary("╭─────────────────────────────────────────────╮"));
            console.log(theme.colors.primary("│      🤖 MegaBuff Interactive Shell         │"));
            console.log(theme.colors.dim("│  Type commands without 'megabuff' prefix   │"));
            console.log(theme.colors.dim("│  'help' for commands • 'exit' to quit      │"));
            console.log(theme.colors.primary("╰─────────────────────────────────────────────╯"));
            console.log("");
            rl.prompt();
            return;
        }

        // Handle help
        if (input.toLowerCase() === 'help') {
            showShellHelp();
            rl.prompt();
            return;
        }

        // Parse and execute command
        try {
            // Split input into args (handle quotes properly)
            const args = parseShellInput(input);

            // Create a new program instance for this command to avoid state issues
            const shellProgram = createProgramInstance();

            // Execute command
            await shellProgram.parseAsync(['node', 'megabuff', ...args], { from: 'user' });

            console.log(""); // Empty line for readability
        } catch (error: any) {
            if (error.message && !error.message.includes('process.exit')) {
                console.error(theme.colors.error(`\n❌ Error: ${error.message}\n`));
            }
        }

        rl.prompt();
    });

    rl.on('close', () => {
        console.log(theme.colors.success("\n👋 Goodbye!\n"));
        process.exit(0);
    });

    // Handle Ctrl+C gracefully
    rl.on('SIGINT', () => {
        rl.question(theme.colors.warning('\n⚠️  Exit? (y/n) '), (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                console.log(theme.colors.success("\n👋 Goodbye!\n"));
                rl.close();
                process.exit(0);
            } else {
                rl.prompt();
            }
        });
    });
}

/**
 * Show help information for the shell
 */
function showShellHelp(): void {
    console.log("");
    console.log(theme.colors.primary("📚 MegaBuff Interactive Shell Commands"));
    console.log(theme.colors.dim("═".repeat(80)));
    console.log("");
    console.log(theme.colors.info("  Main Commands:"));
    console.log(theme.colors.secondary("    optimize <prompt>") + theme.colors.dim("              Optimize a prompt"));
    console.log(theme.colors.secondary("    analyze <prompt>") + theme.colors.dim("               Analyze a prompt"));
    console.log(theme.colors.secondary("    config [subcommand]") + theme.colors.dim("            Configure settings"));
    console.log(theme.colors.secondary("    theme [subcommand]") + theme.colors.dim("             Manage themes"));
    console.log("");
    console.log(theme.colors.info("  Examples:"));
    console.log(theme.colors.dim("    optimize \"Create a REST API\" --style technical"));
    console.log(theme.colors.dim("    analyze \"Write code for auth\" --provider anthropic"));
    console.log(theme.colors.dim("    optimize --compare --providers openai,anthropic \"Explain AI\""));
    console.log(theme.colors.dim("    config provider anthropic"));
    console.log(theme.colors.dim("    theme set cyberpunk"));
    console.log("");
    console.log(theme.colors.info("  Shell Commands:"));
    console.log(theme.colors.secondary("    help") + theme.colors.dim("                             Show this help"));
    console.log(theme.colors.secondary("    clear") + theme.colors.dim("                            Clear screen"));
    console.log(theme.colors.secondary("    exit") + theme.colors.dim("                             Exit shell (or: quit, q)"));
    console.log("");
    console.log(theme.colors.info("  Pro Tips:"));
    console.log(theme.colors.dim("    • Use arrow keys (↑/↓) for command history"));
    console.log(theme.colors.dim("    • All regular flags work: --provider, --style, --iterations, etc."));
    console.log(theme.colors.dim("    • Settings are loaded once and persist across commands"));
    console.log(theme.colors.dim("    • Press Ctrl+C twice or type 'exit' to quit"));
    console.log("");
    console.log(theme.colors.dim("═".repeat(80)));
    console.log("");
}

/**
 * Parse shell input into arguments, handling quotes properly
 */
function parseShellInput(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if ((char === '"' || char === "'") && !inQuote) {
            inQuote = true;
            quoteChar = char;
        } else if (char === quoteChar && inQuote) {
            inQuote = false;
            quoteChar = '';
        } else if (char === ' ' && !inQuote) {
            if (current) {
                args.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }

    if (current) {
        args.push(current);
    }

    return args;
}

/**
 * Create a fresh program instance to avoid state pollution between commands
 */
function createProgramInstance() {
    // Import the main program setup
    // Note: This will need to be imported from the main index.ts file
    // For now, we'll use the global program instance
    return program;
}
