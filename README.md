# MegaBuff

AI-powered prompt optimizer CLI with multi-provider support (OpenAI, Anthropic & Google Gemini). Improve your prompts with BYOK (Bring Your Own Key) and flexible input/output options.

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

### Getting Your Google Gemini API Key (BYOK)

MegaBuff also supports **Google Gemini** with your own API key.

**Steps to get your Google Gemini API Key:**

1. **Go to Google AI Studio**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account

2. **Create an API key**
   - Click **Get API Key** or **Create API Key**
   - Choose an existing Google Cloud project or create a new one
   - Your API key will be generated

3. **Save your key immediately**
   - Copy and store it securely
   - You'll need this key to use Gemini models

4. **Enable billing (if needed)**
   - Free tier is available for testing
   - For production usage, you may need to enable billing in Google Cloud Console

### Configuring Your API Key

Once you have your provider API key, configure it using one of these methods:

#### Option 1: Interactive Setup (Recommended)

The easiest way to get started:

```bash
# Interactive configuration menu
megabuff config

# Then choose:
# 1) Set API token for a provider
# Pick OpenAI, Anthropic, or Google, paste your key, choose storage method

# Or use the direct token command
megabuff config token sk-your-api-key-here --provider openai
megabuff config token sk-ant-your-key --provider anthropic --keychain
megabuff config token your-google-key --provider google
```

This saves your key for future use. You only need to do this once!

**Storage Options:**
- **Config file** (default): `~/.megabuff/config.json`
- **System keychain** (more secure): macOS Keychain, Windows Credential Manager, or Linux Secret Service

#### Option 2: Environment Variable

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
export GOOGLE_API_KEY="your-google-api-key-here"
```

Add to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist across sessions.

#### Option 3: Pass as Flag

```bash
megabuff optimize "your prompt" --api-key sk-your-key-here
megabuff optimize --provider anthropic "your prompt" --api-key sk-ant-your-key-here
megabuff optimize --provider google "your prompt" --api-key your-google-key-here
```

### API Key Priority

The CLI checks for your token in this order (per provider):
1. `--api-key` flag (highest priority)
2. Provider env var (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
3. System keychain (if configured)
4. Config file at `~/.megabuff/config.json`

## Configuration Commands

### Interactive Config Menu

Run `megabuff config` for an interactive configuration menu:

```bash
megabuff config

# Shows:
# ╭─────────────────────────────────────╮
# │   MegaBuff Configuration Setup     │
# ╰─────────────────────────────────────╯
#
# What would you like to configure?
#
#   1) Set API token for a provider
#   2) Set default provider
#   3) Set model (auto-selects provider)
#   4) View current configuration
#   5) Exit
```

### Direct Commands

```bash
# Set API token for a provider
megabuff config token sk-your-api-key-here --provider openai
megabuff config token sk-ant-... --provider anthropic --keychain

# Set default provider
megabuff config provider anthropic
megabuff config provider  # show current provider

# Set model (automatically sets provider)
megabuff config model claude-sonnet-4-5  # sets provider to anthropic
megabuff config model gpt-4o             # sets provider to openai
megabuff config model gemini-1.5-pro     # sets provider to google
megabuff config model                     # show current model

# Show all configuration
megabuff config show

# Remove a saved token
megabuff config remove --provider anthropic
```

### Available Models

**OpenAI:**
- `gpt-4o`
- `gpt-4o-mini` (default)
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

**Anthropic:**
- `claude-sonnet-4-5-20250929` (latest)
- `claude-sonnet-4-5`
- `claude-sonnet-4`
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

**Google Gemini:**
- `gemini-2.0-flash-exp` (experimental)
- `gemini-1.5-pro`
- `gemini-1.5-flash` (default for Google)
- `gemini-1.0-pro`

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
# Quick inline optimization with OpenAI (auto-copies to clipboard)
megabuff optimize "Write code for user auth"

# Use Anthropic (Claude) instead
megabuff optimize --provider anthropic "Write code for user auth"

# Use Google Gemini
megabuff optimize --provider google "Write code for user auth"

# From file with interactive view (auto-copies)
megabuff optimize --file my-prompt.txt --interactive

# Pipe and save (auto-copies)
cat input.txt | megabuff optimize --output optimized.txt

# Disable clipboard copy
megabuff optimize "Your prompt" --no-copy

# Save to file without clipboard
megabuff optimize --file prompt.txt --output result.txt --no-copy

# Use specific API key (overrides config)
megabuff optimize "Your prompt" --api-key sk-your-key-here

# Set default provider to Anthropic, then optimize
megabuff config provider anthropic
megabuff optimize "Rewrite this prompt to be clearer"

# Set a specific model (auto-sets provider)
megabuff config model claude-sonnet-4-5
megabuff optimize "Explain quantum computing"

# Or use Gemini model
megabuff config model gemini-1.5-pro
megabuff optimize "Explain quantum computing"
```

## How It Works

MegaBuff supports multiple AI providers to optimize your prompts:

**Providers:**
- **OpenAI** (default): Uses GPT-4o-mini for fast, cost-effective optimization
- **Anthropic**: Uses Claude Sonnet 4.5 for advanced reasoning and optimization
- **Google Gemini**: Uses Gemini 1.5 Flash for efficient, high-quality optimization

The optimization process:
1. Identifies ambiguities or unclear instructions
2. Adds relevant context that would improve results
3. Structures the prompt for clarity
4. Specifies expected output format if not present
5. Makes the prompt more specific and actionable

**Model Selection:**
- Set a specific model with `megabuff config model <model-name>`
- Provider is automatically selected based on the model
- Or explicitly choose provider with `--provider` flag

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
   npm version minor 
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