# MegaBuff

AI prompt optimizer CLI - improve your prompts with multiple input/output options

## Table of Contents

- [Installation](#installation)
- [Setup](#setup)
  - [Getting Your OpenAI API Key (BYOK)](#getting-your-openai-api-key-byok)
  - [Getting Your Anthropic API Key (BYOK)](#getting-your-anthropic-api-key-byok)
  - [Configuring Your API Key](#configuring-your-api-key)
    - [Option 1: Save to Config (Recommended)](#option-1-save-to-config-recommended)
    - [Option 2: Environment Variable](#option-2-environment-variable)
    - [Option 3: Pass as Flag](#option-3-pass-as-flag)
  - [API Key Priority](#api-key-priority)
- [Configuration Commands](#configuration-commands)
- [Feature requests or contributing](#feature-requests--contributing)
- [Development](#development)
- [Build](#build)
- [Install Globally](#install-globally)
- [Usage](#usage)
  - [1. Inline Argument (Quick & Simple)](#1-inline-argument-quick--simple)
  - [2. File Input](#2-file-input)
  - [3. Stdin Pipe](#3-stdin-pipe)
  - [4. Interactive Mode](#4-interactive-mode)
- [Output Options](#output-options)
  - [Default: Print to stdout AND copy to clipboard](#default-print-to-stdout-and-copy-to-clipboard)
  - [Disable clipboard copy](#disable-clipboard-copy)
  - [Save to file](#save-to-file)
  - [Interactive comparison view](#interactive-comparison-view)
  - [Combine options](#combine-options)
- [Examples](#examples)
- [How It Works](#how-it-works)
- [VS Code Integration: WIP](#vs-code-integration)
  - [Option 1: VS Code Extension (Full Experience)](#option-1-vs-code-extension-full-experience)
  - [Option 2: VS Code Tasks (Quick Setup)](#option-2-vs-code-tasks-quick-setup)
  - [Option 3: Terminal Integration](#option-3-terminal-integration)
- [Publishing to npm](#publishing-to-npm)
  - [First-time Setup](#first-time-setup)
  - [Publishing Steps](#publishing-steps)
  - [Publishing Updates](#publishing-updates)
  - [What Gets Published](#what-gets-published)
  - [After Publishing](#after-publishing)

## Installation

Install MegaBuff globally:

```bash
npm install -g megabuff
```

Or for development:

```bash
git clone https://github.com/thesupermegabuff/megabuff-cli.git
cd megabuff-cli
npm install

# Originally used nvm use 22
```

## Setup

### Getting Your OpenAI API Key (BYOK)

MegaBuff uses a **BYOK (Bring Your Own Key)** model, meaning you use your own OpenAI API key. This gives you:
- ✅ Direct control over your usage and costs
- ✅ Pay-per-use pricing (typically pennies per optimization)
- ✅ Full privacy - your prompts go directly to OpenAI
- ✅ Ability to set your own usage limits

**Steps to get your OpenAI API Key:**

1. **Create an OpenAI Account**
   - Sign up or log in at [platform.openai.com](https://platform.openai.com/)
   - Note: This is separate from the standard ChatGPT consumer site

2. **Set up Billing**
   - The API runs on a pay-per-use model
   - Add a payment method in the [Billing](https://platform.openai.com/settings/organization/billing/overview) section
   - You can set usage limits to manage costs
   - Typical cost: ~$0.001-0.01 per prompt optimization (using gpt-4o-mini)

3. **Generate Your API Key**
   - Navigate to [API Keys](https://platform.openai.com/api-keys) in the sidebar
   - Click **"+ Create new secret key"**
   - Give your key a descriptive name (e.g., "MegaBuff CLI")
   - Click **"Create secret key"**

4. **Save Your Key Immediately**
   - **Important**: Copy the key right away - OpenAI only shows it once!
   - Store it securely - you'll need to generate a new one if you lose it
   - The key starts with `sk-`

### Getting Your Anthropic API Key (BYOK)

MegaBuff can also use **Anthropic (Claude)** if you provide your own Anthropic API key.

**Steps to get your Anthropic API Key:**

1. **Create an Anthropic Console account**
   - Sign up / log in at `https://console.anthropic.com/`

2. **Set up billing / credits**
   - Ensure your Anthropic account is enabled for API usage (billing/credits as required by Anthropic).

3. **Create an API key**
   - In the [Anthropic Dashboard Console](https://platform.claude.com/dashboard), go to **API Keys**
   - Click **Create key**
   - Name it something like "MegaBuff CLI"

4. **Save your key immediately**
   - Copy and store it somewhere secure
   - Anthropic keys typically start with `sk-ant-`

### Configuring Your API Key

Once you have your provider API key, configure it using one of these methods:

#### Option 1: Save to Config (Recommended)

The easiest way to get started:

```bash
# Interactive setup (recommended)
# - pick provider
# - paste token
megabuff config set

# Interactive setup with provider pre-selected
megabuff config set --provider anthropic

# Save an OpenAI key to config file (default provider is openai)
megabuff config set sk-your-api-key-here

# Or save to system keychain (more secure)
megabuff config set sk-your-api-key-here --keychain

# Save an Anthropic key
megabuff config set --provider anthropic sk-ant-your-api-key-here

# Save an Anthropic key to keychain
megabuff config set --provider anthropic sk-ant-your-api-key-here --keychain
```

This saves your key for future use. You only need to do this once!

#### Option 2: Environment Variable

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
```

Add to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist across sessions.

#### Option 3: Pass as Flag

```bash
megabuff optimize "your prompt" --api-key sk-your-key-here
megabuff optimize --provider anthropic "your prompt" --api-key sk-ant-your-key-here
```

### API Key Priority

The CLI checks for your token in this order (per provider):
1. `--api-key` flag (highest priority)
2. Provider env var (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
3. System keychain (if configured)
4. Config file at `~/.megabuff/config.json`

## Configuration Commands

```bash
# Interactive setup (pick provider + paste token)
megabuff config set

# Interactive setup with provider pre-selected
megabuff config set --provider anthropic

# Save your OpenAI key (default provider)
megabuff config set sk-your-api-key-here

# Save your Anthropic key
megabuff config set --provider anthropic sk-ant-your-api-key-here

# Save to keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
megabuff config set sk-your-api-key-here --keychain

# Show current configuration
megabuff config show

# Remove a saved key (defaults to openai if --provider is omitted)
megabuff config remove

# Remove a saved Anthropic key
megabuff config remove --provider anthropic
```

## Development

Test your CLI during development:

```bash
npm install

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

### Default: Print to stdout AND copy to clipboard

By default, the optimized prompt is:
1. Printed to stdout (so you can pipe it)
2. Automatically copied to your clipboard (works on macOS, Windows, and Linux)

```bash
megabuff optimize "your prompt"
# Result is both printed AND copied to clipboard
```

### Disable clipboard copy

If you don't want automatic clipboard copy:

```bash
megabuff optimize "your prompt" --no-copy
```

### Save to file

```bash
megabuff optimize "your prompt" --output result.txt
# Still copies to clipboard by default
```

### Interactive comparison view

```bash
megabuff optimize "your prompt" --interactive
# Shows before/after comparison AND copies to clipboard
```

### Combine options

```bash
# Save to file without clipboard
megabuff optimize "your prompt" --output result.txt --no-copy

# Interactive view without clipboard
megabuff optimize "your prompt" --interactive --no-copy

# Pipe to another command (clipboard still works)
megabuff optimize "your prompt" | grep "specific"
```

## Examples

```bash
# Quick inline optimization (auto-copies to clipboard)
megabuff optimize "Write code for user auth"

# From file with interactive view (auto-copies)
megabuff optimize --file my-prompt.txt --interactive

# Pipe and save (auto-copies)
cat input.txt | megabuff optimize --output optimized.txt

# Disable clipboard copy
megabuff optimize "Your prompt" --no-copy

# Save to file without clipboard
megabuff optimize --file prompt.txt --output result.txt --no-copy

# Use specific API key
megabuff optimize "Your prompt" --api-key sk-your-key-here

# Use Anthropic (Claude)
megabuff optimize --provider anthropic "Rewrite this prompt to be clearer"
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

## Feature requests or contributing

Want a feature or want to contribute one? Please open an issue here:

- [GitHub Issues](https://github.com/thesupermegabuff/megabuff-cli/issues)

## Publishing to npm

### First-time Setup

1. **Create an npm account** at [npmjs.com/signup](https://www.npmjs.com/signup) if you don't have one

2. **Login to npm** from your terminal:
   ```bash
   npm login
   ```

3. **Update package.json** with your information:
   - Change `author` to your name and email
   - Update `repository` URL with your GitHub username
   - Update `bugs` and `homepage` URLs

4. **Check if the package name is available**:
   ```bash
   npm search megabuff
   ```
   The name `megabuff` should be available (or use an alternative if taken)

### Publishing Steps

1. **Make sure everything is committed**:
   ```bash
   git status
   git add .
   git commit -m "Prepare for publish"
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```
   This compiles TypeScript to JavaScript in the `dist/` folder

3. **Test the package locally** (optional but recommended):
   ```bash
   npm pack
   # This creates a .tgz file you can inspect
   ```

4. **Publish to npm**:
   ```bash
   npm publish
   ```

   The `prepublishOnly` script will automatically run `npm run build` before publishing.

### Publishing Updates

When you make changes and want to publish a new version:

1. **Update the version** using semantic versioning:
   ```bash
   # For bug fixes (0.1.0 -> 0.1.1)
   npm version patch

   # For new features (0.1.0 -> 0.2.0)
   npm version minor

   # For breaking changes (0.1.0 -> 1.0.0)
   npm version major
   ```

2. **Publish the update**:
   ```bash
   npm publish
   ```

3. **Push the version tag to GitHub**:
   ```bash
   git push && git push --tags
   ```

### What Gets Published

The npm package includes:
- ✅ `dist/` - Compiled JavaScript
- ✅ `README.md` - Documentation
- ✅ `package.json` - Package metadata
- ✅ `LICENSE` - License file
- ❌ `src/` - TypeScript source (excluded)
- ❌ `node_modules/` - Dependencies (excluded)
- ❌ Development files (excluded via .npmignore)

### After Publishing

Users can install your CLI globally with:
```bash
npm install -g megabuff
```

Your package will be available at:
- npm: `https://www.npmjs.com/package/megabuff`
- Docs: `https://github.com/thesupermegabuff/megabuff-cli`