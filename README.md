# MegaBuff CLI

AI prompt optimizer CLI - improve your prompts with multiple input/output options

## Installation

Install dependencies:

```bash
npm install

originally used nvm use 22
```

## Setup

### Option 1: Save API Key to Config (Recommended)

The easiest way to get started:

```bash
# Save to config file
megabuff config set sk-your-api-key-here

# Or save to system keychain (more secure)
megabuff config set sk-your-api-key-here --keychain
```

This saves your key for future use. You only need to do this once!

### Option 2: Environment Variable

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

Add to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist across sessions.

### Option 3: Pass as Flag

```bash
megabuff optimize "your prompt" --api-key sk-your-key-here
```

### API Key Priority

The CLI checks for your API key in this order:
1. `--api-key` flag (highest priority)
2. `OPENAI_API_KEY` environment variable
3. System keychain (if configured)
4. Config file at `~/.megabuff/config.json`

## Configuration Commands

```bash
# Save your API key
megabuff config set sk-your-api-key-here

# Save to keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
megabuff config set sk-your-api-key-here --keychain

# Show current configuration
megabuff config show

# Remove saved API key
megabuff config remove
```

## Development

Test your CLI during development:

```bash
# Using the dev script (recommended)
npm run dev optimize "Write a function to sort arrays"

# Or using npx tsx directly
npx tsx src/index.ts optimize "Your prompt here"

# Or install locally as a global command
npm link
megabuff optimize "Your prompt here"
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

This will create compiled files in the `dist/` folder.

## Install Globally

Install the CLI globally on your machine for testing:

```bash
npm link
```

## Usage

The CLI supports multiple input methods:

### 1. Inline Argument (Quick & Simple)

```bash
megabuff optimize "Write a function that validates email addresses"
```

### 2. File Input

```bash
megabuff optimize --file prompt.txt
```

### 3. Stdin Pipe

```bash
echo "Explain quantum computing" | megabuff optimize
cat prompt.txt | megabuff optimize
```

### 4. Interactive Mode

```bash
megabuff optimize
# Then paste/type your prompt and press Ctrl+D when done
```

## Output Options

### Default: Print to stdout (pipeable)

```bash
megabuff optimize "your prompt" > output.txt
megabuff optimize "your prompt" | pbcopy  # Copy to clipboard on macOS
```

### Save to file

```bash
megabuff optimize "your prompt" --output result.txt
```

### Interactive comparison view

```bash
megabuff optimize "your prompt" --interactive
```

## Examples

```bash
# Quick inline optimization
megabuff optimize "Write code for user auth"

# From file with interactive view
megabuff optimize --file my-prompt.txt --interactive

# Pipe and save
cat input.txt | megabuff optimize --output optimized.txt

# Combine options
megabuff optimize --file prompt.txt --output result.txt

# Use specific API key
megabuff optimize "Your prompt" --api-key sk-your-key-here
```

## How It Works

The CLI uses OpenAI's GPT-4o-mini model to analyze and optimize your prompts. It:

1. Identifies ambiguities or unclear instructions
2. Adds relevant context that would improve results
3. Structures the prompt for clarity
4. Specifies expected output format if not present
5. Makes the prompt more specific and actionable

## VS Code Integration

MegaBuff integrates seamlessly with VS Code in multiple ways:

### Option 1: VS Code Extension (Full Experience)

Install and develop the MegaBuff VS Code extension:

```bash
cd ../megabuff-vscode
npm install
npm run compile
```

Then press `F5` to launch the extension in debug mode.

**Features:**
- Right-click context menu for selected text
- Command palette integration
- Keyboard shortcuts (`Ctrl+Shift+Alt+O`)
- Diff view for before/after comparison
- API key management UI
- Status bar integration

See [megabuff-vscode/README.md](../megabuff-vscode/README.md) for more details.

### Option 2: VS Code Tasks (Quick Setup)

Use the pre-configured tasks in `.vscode/tasks.json`:

1. Select text in VS Code
2. Press `Ctrl+Shift+P` → "Tasks: Run Task"
3. Choose "MegaBuff: Optimize Selected Text"

Available tasks:
- `MegaBuff: Optimize Selected Text`
- `MegaBuff: Optimize Current File`
- `MegaBuff: Optimize Selected (Interactive)`
- `MegaBuff: Configure API Key`

### Option 3: Terminal Integration

Simply use the CLI in VS Code's integrated terminal:

```bash
# Select text, then in terminal:
pbpaste | megabuff optimize  # macOS
xclip -o | megabuff optimize  # Linux
```

## Publishing

Before publishing to npm, make sure to build:

```bash
npm run build
npm publish
```