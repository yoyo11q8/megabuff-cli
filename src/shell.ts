import readline from 'readline';
import type { Command } from 'commander';
import { getTheme } from './themes.js';
import { logError } from './config.js';

const theme = getTheme();

// Module-level reference to the program instance passed to startInteractiveShell
let shellProgram: Command;

// Guided wizard functions passed in to avoid circular imports
let guidedOptimize: (shellRl?: readline.Interface) => Promise<void>;
let guidedAnalyze: (shellRl?: readline.Interface) => Promise<void>;
let guidedTheme: (shellRl?: readline.Interface) => Promise<void>;
let guidedConfig: (shellRl?: readline.Interface) => Promise<void>;

// Flag to indicate we're running in interactive shell mode
// This prevents nested interactive prompts (e.g., config menu inside shell)
let isShellMode = false;

/**
 * Check if we're running in interactive shell mode
 */
export function isInShellMode(): boolean {
    return isShellMode;
}

/**
 * Guided wizard functions interface
 * Wizards receive the shell's readline to avoid creating duplicate interfaces
 */
export interface GuidedWizards {
    optimize: (shellRl?: readline.Interface) => Promise<void>;
    analyze: (shellRl?: readline.Interface) => Promise<void>;
    theme: (shellRl?: readline.Interface) => Promise<void>;
    config: (shellRl?: readline.Interface) => Promise<void>;
}

/**
 * Start the interactive shell mode
 * @param prog - The Commander program instance with all commands registered
 * @param wizards - Guided wizard functions to avoid circular imports
 */
export async function startInteractiveShell(prog: Command, wizards: GuidedWizards): Promise<void> {
    // Store program reference for use in createProgramInstance
    shellProgram = prog;
    // Store guided wizard functions
    guidedOptimize = wizards.optimize;
    guidedAnalyze = wizards.analyze;
    guidedTheme = wizards.theme;
    guidedConfig = wizards.config;
    // Set shell mode flag to prevent nested interactive prompts
    isShellMode = true;
    console.log("");
    console.log(theme.colors.primary("╭───────────────────────────────────────────────────────────────────╮"));
    console.log(theme.colors.primary("│ 🤖 MegaBuff Interactive Shell                                "));
    console.log(theme.colors.dim("│                                "));
    console.log(theme.colors.dim("│     Type commands without 'megabuff' prefix                              "));
    console.log(theme.colors.dim("│     Type `help` for commands • 'exit' to quit                                 "));
    console.log(theme.colors.dim("│                                                                       "));
    console.log(theme.colors.dim("│ 💡 Feature request? → ") + theme.colors.info("github.com/thesupermegabuff/megabuff-cli/issues"));
    console.log(theme.colors.dim("│                                "));

    console.log(theme.colors.primary("╰───────────────────────────────────────────────────────────────────╯"));
    console.log("");

    // Show help automatically on startup
    showShellHelp();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: theme.colors.dim('(type help) ') + theme.colors.accent('megabuff> '),
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
            console.log(theme.colors.primary("╭───────────────────────────────────────────────────────────────────╮"));
            console.log(theme.colors.primary("│      🤖 MegaBuff Interactive Shell                               │"));
            console.log(theme.colors.dim("│  Type commands without 'megabuff' prefix                         │"));
            console.log(theme.colors.dim("│  'help' for commands • 'exit' to quit                            │"));
            console.log(theme.colors.dim("│                                                                   │"));
            console.log(theme.colors.dim("│  💡 Feature request? → ") + theme.colors.info("github.com/thesupermegabuff/megabuff-cli/issues") + theme.colors.dim(" │"));
            console.log(theme.colors.primary("╰───────────────────────────────────────────────────────────────────╯"));
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

            // Check if user is running commands without arguments - trigger guided mode
            const commandName = args[0]?.toLowerCase();

            // Launch guided wizard for optimize/analyze when run without a prompt
            if ((commandName === 'optimize' || commandName === 'analyze') && args.length === 1) {
                try {
                    if (commandName === 'optimize') {
                        await guidedOptimize(rl);
                    } else {
                        await guidedAnalyze(rl);
                    }
                } catch (error: any) {
                    await logError(error instanceof Error ? error : error.message, `shell:${commandName}`);
                    if (!error.alreadyPrinted) {
                        console.error(theme.colors.error(`\n❌ Error: ${error.message}\n`));
                        console.error(theme.colors.dim(`   Error logged to: ~/.megabuff/errors.log\n`));
                    }
                }
                console.log("");
                rl.prompt();
                return;
            }

            // Also check if only flags are provided (no actual prompt text) - show help in this case
            if ((commandName === 'optimize' || commandName === 'analyze') && args.length > 1) {
                const hasPromptArg = args.slice(1).some(arg => !arg.startsWith('-'));
                if (!hasPromptArg) {
                    showCommandHelp(commandName);
                    rl.prompt();
                    return;
                }
            }

            // Launch guided wizard for theme when run without subcommand
            if (commandName === 'theme' && args.length === 1) {
                try {
                    await guidedTheme(rl);
                } catch (error: any) {
                    await logError(error instanceof Error ? error : error.message, 'shell:theme');
                    if (!error.alreadyPrinted) {
                        console.error(theme.colors.error(`\n❌ Error: ${error.message}\n`));
                        console.error(theme.colors.dim(`   Error logged to: ~/.megabuff/errors.log\n`));
                    }
                }
                console.log("");
                rl.prompt();
                return;
            }

            // Launch guided wizard for config when run without subcommand
            if (commandName === 'config' && args.length === 1) {
                try {
                    await guidedConfig(rl);
                } catch (error: any) {
                    await logError(error instanceof Error ? error : error.message, 'shell:config');
                    if (!error.alreadyPrinted) {
                        console.error(theme.colors.error(`\n❌ Error: ${error.message}\n`));
                        console.error(theme.colors.dim(`   Error logged to: ~/.megabuff/errors.log\n`));
                    }
                }
                console.log("");
                rl.prompt();
                return;
            }

            const commandArgs = ['node', 'megabuff', ...args];

            // Create a fresh program instance for this command to avoid state issues
            const commandProgram = createProgramInstance();

            // Configure Commander to throw errors instead of calling process.exit()
            commandProgram.exitOverride((err: Error) => {
                throw err; // Convert exit into exception
            });

            // Execute command
            await commandProgram.parseAsync(commandArgs);

            console.log(""); // Empty line for readability
        } catch (error: any) {
            // Handle Commander errors gracefully without crashing the shell
            const commandName = parseShellInput(input)[0];

            if (error.code && error.code.startsWith('commander.')) {
                // Commander-specific errors (missing arguments, unknown options, etc.)
                await logError(error instanceof Error ? error : error.message, `shell:${commandName || 'unknown'}`);
                console.error(theme.colors.error(`\n❌ ${error.message}\n`));
                console.error(theme.colors.dim(`   Error logged to: ~/.megabuff/errors.log\n`));

                // Show command-specific help for common commands when arguments are missing
                if (error.code === 'commander.missingArgument' && commandName) {
                    showCommandHelp(commandName);
                }
            } else if (error.code === 'commander.help') {
                // Help was requested - this is not an error, output is already shown
                console.log("");
            } else if (error.alreadyPrinted) {
                // Error message was already printed by the command, just continue
                console.log("");
            } else if (error.message && !error.message.includes('process.exit')) {
                await logError(error instanceof Error ? error : error.message, `shell:${commandName || 'unknown'}`);
                console.error(theme.colors.error(`\n❌ Error: ${error.message}\n`));
                console.error(theme.colors.dim(`   Error logged to: ~/.megabuff/errors.log\n`));
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
    console.log(theme.colors.secondary("    optimize") + theme.colors.dim("                         Start guided optimization wizard"));
    console.log(theme.colors.secondary("    optimize <prompt>") + theme.colors.dim("              Optimize a prompt directly"));
    console.log(theme.colors.secondary("    analyze") + theme.colors.dim("                          Start guided analysis wizard"));
    console.log(theme.colors.secondary("    analyze <prompt>") + theme.colors.dim("               Analyze a prompt directly"));
    console.log(theme.colors.secondary("    config") + theme.colors.dim("                           Start guided config wizard"));
    console.log(theme.colors.secondary("    config [subcommand]") + theme.colors.dim("            Configure settings directly"));
    console.log(theme.colors.secondary("    theme") + theme.colors.dim("                            Start guided theme wizard"));
    console.log(theme.colors.secondary("    theme [subcommand]") + theme.colors.dim("             Manage themes directly"));
    console.log("");
    console.log(theme.colors.info("  Guided Mode:") + theme.colors.accent(" ✨ NEW!"));
    console.log(theme.colors.dim("    Run any command without arguments to start a step-by-step wizard"));
    console.log(theme.colors.dim("    that walks you through all options interactively."));
    console.log("");
    console.log(theme.colors.info("  Power User Mode:"));
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
    console.log(theme.colors.dim("    • Type a command without arguments for guided setup"));
    console.log(theme.colors.dim("    • Use arrow keys (↑/↓) for command history"));
    console.log(theme.colors.dim("    • All regular flags work: --provider, --style, --iterations, etc."));
    console.log(theme.colors.dim("    • Press Ctrl+C twice or type 'exit' to quit"));
    console.log("");
    console.log(theme.colors.dim("═".repeat(80)));
    console.log("");
    console.log(theme.colors.dim("💡 Feature request? → ") + theme.colors.info("github.com/thesupermegabuff/megabuff-cli/issues"));
    console.log("");
}

/**
 * Show command-specific help when a command is run without required arguments
 */
function showCommandHelp(commandName: string): void {
    console.log("");

    switch (commandName.toLowerCase()) {
        case 'optimize':
            console.log(theme.colors.info("💡 Usage: ") + theme.colors.secondary("optimize <prompt> [options]"));
            console.log("");
            console.log(theme.colors.dim("  Required:"));
            console.log(theme.colors.secondary("    <prompt>") + theme.colors.dim("                    The prompt to optimize"));
            console.log("");
            console.log(theme.colors.dim("  Common Options:"));
            console.log(theme.colors.secondary("    -f, --file <path>") + theme.colors.dim("          Read prompt from file"));
            console.log(theme.colors.secondary("    --provider <name>") + theme.colors.dim("          AI provider (openai, anthropic, google, xai, deepseek)"));
            console.log(theme.colors.secondary("    --style <style>") + theme.colors.dim("            Optimization style (concise, detailed, technical, etc.)"));
            console.log(theme.colors.secondary("    --iterations <n>") + theme.colors.dim("           Number of refinement passes (1-5)"));
            console.log(theme.colors.secondary("    --compare") + theme.colors.dim("                  Compare across multiple providers"));
            console.log(theme.colors.secondary("    --show-cost") + theme.colors.dim("               Show cost estimate and actual cost"));
            console.log(theme.colors.secondary("    -o, --output <path>") + theme.colors.dim("        Save result to file"));
            console.log("");
            console.log(theme.colors.dim("  Examples:"));
            console.log(theme.colors.dim("    optimize \"Write a REST API\""));
            console.log(theme.colors.dim("    optimize \"Explain AI\" --style technical --iterations 3"));
            console.log(theme.colors.dim("    optimize --file prompt.txt --compare --providers openai,anthropic"));
            break;

        case 'analyze':
            console.log(theme.colors.info("💡 Usage: ") + theme.colors.secondary("analyze <prompt> [options]"));
            console.log("");
            console.log(theme.colors.dim("  Required:"));
            console.log(theme.colors.secondary("    <prompt>") + theme.colors.dim("                    The prompt to analyze"));
            console.log("");
            console.log(theme.colors.dim("  Common Options:"));
            console.log(theme.colors.secondary("    -f, --file <path>") + theme.colors.dim("          Read prompt from file"));
            console.log(theme.colors.secondary("    --provider <name>") + theme.colors.dim("          AI provider (openai, anthropic, google, xai, deepseek)"));
            console.log(theme.colors.secondary("    --show-cost") + theme.colors.dim("               Show cost estimate and actual cost"));
            console.log(theme.colors.secondary("    -o, --output <path>") + theme.colors.dim("        Save analysis to file"));
            console.log(theme.colors.secondary("    --no-copy") + theme.colors.dim("                 Don't copy result to clipboard"));
            console.log("");
            console.log(theme.colors.dim("  Examples:"));
            console.log(theme.colors.dim("    analyze \"Write a chatbot\""));
            console.log(theme.colors.dim("    analyze --file prompt.txt --provider anthropic"));
            console.log(theme.colors.dim("    analyze \"Create API docs\" --show-cost"));
            break;

        case 'config':
            console.log(theme.colors.info("💡 Usage: ") + theme.colors.secondary("config [subcommand]"));
            console.log("");
            console.log(theme.colors.dim("  Subcommands:"));
            console.log(theme.colors.secondary("    token <key>") + theme.colors.dim("                Set API token (use --provider flag)"));
            console.log(theme.colors.secondary("    provider [name]") + theme.colors.dim("            Set/show default provider"));
            console.log(theme.colors.secondary("    model [name]") + theme.colors.dim("               Set/show default model"));
            console.log(theme.colors.secondary("    show") + theme.colors.dim("                        Show current configuration"));
            console.log(theme.colors.secondary("    remove") + theme.colors.dim("                      Remove API token (use --provider flag)"));
            console.log("");
            console.log(theme.colors.dim("  Examples:"));
            console.log(theme.colors.dim("    config token sk-... --provider openai"));
            console.log(theme.colors.dim("    config provider anthropic"));
            console.log(theme.colors.dim("    config model claude-sonnet-4-5"));
            console.log(theme.colors.dim("    config show"));
            break;

        case 'theme':
            console.log(theme.colors.info("💡 Usage: ") + theme.colors.secondary("theme [subcommand]"));
            console.log("");
            console.log(theme.colors.dim("  Subcommands:"));
            console.log(theme.colors.secondary("    set <name>") + theme.colors.dim("                 Set active theme"));
            console.log(theme.colors.secondary("    list") + theme.colors.dim("                        List all available themes"));
            console.log(theme.colors.secondary("    preview <name>") + theme.colors.dim("             Preview a theme"));
            console.log("");
            console.log(theme.colors.dim("  Examples:"));
            console.log(theme.colors.dim("    theme set cyberpunk"));
            console.log(theme.colors.dim("    theme list"));
            console.log(theme.colors.dim("    theme preview dracula"));
            break;

        default:
            // For unknown commands, show general help
            console.log(theme.colors.info("💡 Type ") + theme.colors.secondary("help") + theme.colors.info(" to see all available commands"));
            break;
    }

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
function createProgramInstance(): Command {
    // Reset the program's internal parse state
    // Commander stores parsed options and arguments which need to be cleared
    const prog = shellProgram;

    // Clear Commander's internal state to avoid issues with multiple parseAsync calls
    // @ts-ignore - accessing private properties to reset state
    prog._actionResults = [];
    // @ts-ignore
    prog.rawArgs = [];
    // @ts-ignore
    prog.args = [];
    // @ts-ignore
    if (prog._scriptPath) prog._scriptPath = undefined;

    // Reset all subcommands as well
    prog.commands.forEach((cmd: any) => {
        cmd._actionResults = [];
        cmd.args = [];
    });

    return prog;
}
