<h1 align="center">
🤖 MegaBuff
</h1>
<div align="center">

**Transform your AI prompts from good to great!** ✨

AI-powered prompt optimizer with multi-provider support (OpenAI, Anthropic, Gemini, DeepSeek, xAI & more)

🔑 BYOK (Bring Your Own Key) • 🎨 16 Beautiful Themes • ⚡ Lightning Fast

[![npm version](https://img.shields.io/npm/v/megabuff.svg?style=flat-square)](https://www.npmjs.com/package/megabuff)
[![npm downloads](https://img.shields.io/npm/dm/megabuff.svg?style=flat-square)](https://www.npmjs.com/package/megabuff)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg?style=flat-square)](https://opensource.org/licenses/AGPL-3.0)
[![GitHub stars](https://img.shields.io/github/stars/thesupermegabuff/megabuff-cli.svg?style=flat-square)](https://github.com/thesupermegabuff/megabuff-cli/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/thesupermegabuff/megabuff-cli.svg?style=flat-square)](https://github.com/thesupermegabuff/megabuff-cli/issues)
[![Node.js Version](https://img.shields.io/node/v/megabuff.svg?style=flat-square)](https://nodejs.org)

<img width="690" src="media/github-media-banner.png" alt="MegaBuff Banner" width="100%">

<br/>
<br/>
</div>

---

## 📦 Installation

Get started in seconds:

```bash
npm install -g megabuff
megabuff optimize "Rewrite this prompt to be clearer"
```

**That's it!** 🎉 You're ready to supercharge your prompts.

---

## ✨ Features

- 🤖 **Multi-Provider Support** - OpenAI, Anthropic Claude, Google Gemini, & more
- 🔑 **BYOK Model** - Bring your own API key, full control
- 🎨 **16 Beautiful Themes** - Customize your CLI experience
- ⚡ **Lightning Fast** - Optimize prompts in seconds
- 📋 **Auto-Clipboard** - Results copied automatically
- 🔄 **Flexible Input** - Inline, file, pipe, or interactive
- 💾 **Multiple Output Formats** - Stdout, file, or interactive view
- 🔒 **Secure Storage** - Keychain support for API keys
- 🎯 **Smart Model Selection** - Auto-detects provider from model name
- 📊 **Stats Tracking** - See word count changes and improvements
- 🌈 **Beautiful Output** - Themed, formatted, fun to use!

---

## 📚 Table of Contents

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [⚡ Quick Start](#-quick-start)
- [🔐 Setup](#-setup)
  - [🤖 Getting Your OpenAI API Key (BYOK)](#-getting-your-openai-api-key-byok)
  - [🧠 Getting Your Anthropic API Key (BYOK)](#-getting-your-anthropic-api-key-byok)
  - [✨ Getting Your Google Gemini API Key (BYOK)](#-getting-your-google-gemini-api-key-byok)
  - [🚀 Getting Your xAI API Key (BYOK)](#-getting-your-xai-api-key-byok)
  - [🔮 Getting Your DeepSeek API Key (BYOK)](#-getting-your-deepseek-api-key-byok)
  - [Configuring Your API Key](#configuring-your-api-key)
- [⚙️ Configuration Commands](#️-configuration-commands)
- [🎨 Theme Commands](#-theme-commands)
- [💡 Usage](#-usage)
- [🎯 Examples](#-examples)
- [🔧 How It Works](#-how-it-works)
- [🆚 VS Code Integration](#-vs-code-integration)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👨‍💻 Development](#-development)

---

## ⚡ Quick Start

**New to MegaBuff?** Let's get you optimizing in under 60 seconds! ⏱️

```bash
# 1. Install globally
npm install -g megabuff

# 2. Set up your API key (choose your favorite provider)
megabuff config token YOUR_API_KEY --provider openai

# 3. Start optimizing!
megabuff optimize "Write a function to validate emails"
```

> 💡 **Pro Tip:** Try out different themes with `megabuff theme list`!

---

## 🔐 Setup

### 🤖 Getting Your OpenAI API Key (BYOK)

MegaBuff uses a **BYOK (Bring Your Own Key)** model. Why is this awesome?

- ✅ **Full Control** - You manage your usage and costs
- ✅ **Super Cheap** - Typically just pennies per optimization 💰
- ✅ **Privacy First** - Your prompts go directly to the provider 🔒
- ✅ **Your Rules** - Set your own usage limits

**Get your key in 4 easy steps:**

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

### 🧠 Getting Your Anthropic API Key (BYOK)

Want to use **Claude**? Follow these simple steps:

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

### ✨ Getting Your Google Gemini API Key (BYOK)

Ready to try **Gemini**? Here's how:

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

### 🚀 Getting Your xAI API Key (BYOK)

Want to use **Grok**? Here's how to get started:

1. **Create an xAI account**
   - Visit [x.ai](https://x.ai/) or the [xAI Console](https://console.x.ai/)
   - Sign up or log in with your account

2. **Access the API Console**
   - Navigate to the API section in the xAI Console
   - You may need to join the API waitlist or request access

3. **Generate your API key**
   - Click **Create API Key** or **Generate Key**
   - Give your key a descriptive name (e.g., "MegaBuff CLI")
   - Copy the key immediately

4. **Save your key immediately**
   - xAI keys typically start with `xai-`
   - Store it securely - you won't be able to view it again

### 🔮 Getting Your DeepSeek API Key (BYOK)

Ready to use **DeepSeek**? Follow these steps:

1. **Create a DeepSeek account**
   - Visit [DeepSeek Platform](https://platform.deepseek.com/)
   - Sign up or log in to your account

2. **Set up billing**
   - Navigate to the billing section
   - Add payment method or credits as required
   - DeepSeek offers competitive pricing for API usage

3. **Generate your API key**
   - Go to **API Keys** section in the dashboard
   - Click **Create new key** or **Generate API key**
   - Name it something like "MegaBuff CLI"

4. **Save your key immediately**
   - DeepSeek keys typically start with `sk-`
   - Copy and store it securely
   - You won't be able to view the full key again after creation

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
export XAI_API_KEY="xai-your-api-key-here"
export DEEPSEEK_API_KEY="sk-your-deepseek-key-here"
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
2. Provider env var (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`)
3. System keychain (if configured)
4. Config file at `~/.megabuff/config.json`

---

## ⚙️ Configuration Commands

### 🎮 Interactive Config Menu

The easiest way to configure everything:

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

### 🔧 Direct Commands

**Token Management:**
```bash
# 🔑 Set your API token
megabuff config token sk-your-api-key --provider openai
megabuff config token sk-ant-... --provider anthropic --keychain  # More secure!

# 🗑️ Remove a token
megabuff config remove --provider anthropic
```

**Provider & Model Selection:**
```bash
# 🤖 Set default provider
megabuff config provider anthropic
megabuff config provider                  # Show current

# 🎯 Set model (auto-selects provider!)
megabuff config model claude-sonnet-4-5   # → Anthropic
megabuff config model gpt-4o              # → OpenAI
megabuff config model gemini-1.5-pro      # → Google
megabuff config model                     # Show current
```

**View Everything:**
```bash
# 📊 Show complete configuration
megabuff config show
```

### 🤖 Available Models

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

---

## 🎨 Theme Commands

**Make your CLI experience uniquely yours!** Choose from 16 stunning color themes. ✨

### 👀 View Current Theme

```bash
megabuff theme
```

Shows your active theme with a beautiful preview! 🌈

### 📋 List All Themes

```bash
megabuff theme list
```

Browse all 16 themes with:
- ⭐ Your active theme highlighted
- Live color previews
- Theme descriptions

### 🎭 Change Theme

```bash
megabuff theme set dracula         # 🧛‍♂️ Dark & mysterious
megabuff theme set cyberpunk       # 🌆 Neon future vibes
megabuff theme set pastel-rainbow  # 🌈 Soft & dreamy
```

Your choice is saved and applied to all commands instantly!

### 🔍 Preview Theme

Try before you apply:

```bash
megabuff theme preview monokai
```

See the full color palette in action before committing! 🎨

### 🌟 Available Themes

| Theme | Vibe | Description |
|-------|------|-------------|
| 🎯 **default** | Clean & Pro | Cyan and green palette |
| 🎨 **material** | Modern | Google Material Design |
| 🧛‍♂️ **dracula** | Dark & Gothic | Purple and pink accents |
| ❄️ **nord** | Arctic | Cool bluish tones |
| ☀️ **solarized** | Precision | Perfect balance |
| 🎸 **monokai** | Vibrant | Monokai Pro inspired |
| 🌆 **cyberpunk** | Futuristic | Neon city lights |
| 🌅 **sunset** | Warm | Oranges & purples |
| 🌈 **pastel-rainbow** | Dreamy | Soft rainbow hues |
| 🍬 **bubblegum** | Sweet | All the pink vibes |
| 🍭 **cotton-candy** | Fluffy | Pink meets blue |
| 🦄 **unicorn** | Magical | Pastel paradise |
| 🌊 **ocean** | Aquatic | Deep blue serenity |
| 🌲 **forest** | Natural | Earthy greens |
| 📺 **retro** | Nostalgic | 80s terminal style |
| ⚡ **neon-dreams** | Electric | Vibrant neons |

**Every theme is optimized for readability and style!** 🎨✨

---

## 💡 Usage

**MegaBuff is flexible!** Use whichever input method works best for you:

### 1️⃣ Inline (Fastest!)

```bash
megabuff optimize "Write a function that validates emails"
```

### 2️⃣ From a File

```bash
megabuff optimize --file my-prompt.txt
```

### 3️⃣ Pipe It In

```bash
echo "Explain quantum computing" | megabuff optimize
cat prompt.txt | megabuff optimize
```

### 4️⃣ Interactive Mode

```bash
megabuff optimize
# Type/paste your prompt, then Ctrl+D ✨
```

### 📤 Output Options

**By default, MegaBuff does BOTH:**
- ✅ Prints to stdout (for piping)
- ✅ Copies to clipboard (instant paste!)

**Customize the output:**

```bash
# Don't copy to clipboard
megabuff optimize "prompt" --no-copy

# Save to file (still copies by default)
megabuff optimize "prompt" --output result.txt

# Interactive before/after view
megabuff optimize "prompt" --interactive

# Save without clipboard
megabuff optimize "prompt" -o result.txt --no-copy
```

---

## 🎯 Examples

**Real-world use cases to get you started:**

```bash
# 🚀 Quick optimization
megabuff optimize "Write code for user auth"

# 🧠 Use Claude for better reasoning
megabuff optimize --provider anthropic "Explain recursion"

# ✨ Try Gemini
megabuff optimize --provider google "Design a database schema"

# 📁 From a file with before/after comparison
megabuff optimize --file prompt.txt --interactive

# 🔄 Pipe and save
cat input.txt | megabuff optimize --output optimized.txt

# 🎯 Use a specific model
megabuff config model claude-sonnet-4-5
megabuff optimize "Explain quantum computing"

# 🎨 Make it pretty!
megabuff theme set cyberpunk           # Set theme
megabuff theme preview dracula         # Preview first
megabuff theme list                    # See all options

# 🔧 Power user combos
megabuff optimize --file long-prompt.txt --provider anthropic -o result.txt --interactive
```

---

## 🔧 How It Works

**The Magic Behind MegaBuff** ✨

MegaBuff uses state-of-the-art AI to transform your prompts:

### 🎯 What Gets Optimized?

1. **Clarity** - Removes ambiguity and vague instructions
2. **Context** - Adds missing details that improve results
3. **Structure** - Organizes information logically
4. **Format** - Specifies expected output clearly
5. **Specificity** - Makes requests actionable and precise

### 🤖 Choose Your AI

| Provider | Best For | Default Model |
|----------|----------|---------------|
| 🤖 **OpenAI** | Fast & economical | GPT-4o-mini |
| 🧠 **Anthropic** | Deep reasoning | Claude Sonnet 4.5 |
| ✨ **Google** | Efficient & quality | Gemini 1.5 Flash |

**Switch providers anytime** with `--provider` or set your favorite as default!

---

## 🆚 VS Code Integration

**Use MegaBuff right inside VS Code!** 🎉

### ⭐ Option 1: VS Code Extension (Full Experience)

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

### 🚀 Option 2: VS Code Tasks (Quick Setup)

Pre-configured tasks for instant productivity:

1. Select text
2. `Ctrl+Shift+P` → "Tasks: Run Task"
3. Pick a MegaBuff task

**Available Tasks:**
- ✨ Optimize Selected Text
- 📄 Optimize Current File
- 🔍 Optimize (Interactive View)
- ⚙️ Configure API Key

### 💻 Option 3: Terminal Integration

Just use the integrated terminal:

```bash
pbpaste | megabuff optimize  # macOS
xclip -o | megabuff optimize  # Linux
```

---

## 🤝 Contributing

**We'd love your help making MegaBuff better!**

Found a bug? Have an idea? Open an issue:

👉 [GitHub Issues](https://github.com/thesupermegabuff/megabuff-cli/issues)

---

## 📄 License

**MegaBuff is open source!** Licensed under **AGPL-3.0**

**What this means:**
- ✅ **Free to use** - For any purpose
- ✅ **Free to modify** - Make it your own
- ✅ **Free to share** - Spread the love
- 🔓 **Open source required** - Derivative works must stay open
- 🌐 **Service transparency** - If you run it as a service, share the code

[Read the full license](LICENSE)

---

## 👨‍💻 Development

**Want to contribute or build from source?**

### 🔧 Local Development

```bash
# Clone the repo
git clone https://github.com/thesupermegabuff/megabuff-cli.git
cd megabuff-cli

# Install dependencies
npm install

# Run in dev mode
npm run dev optimize "Your prompt"

# Or use tsx directly
npx tsx src/index.ts optimize "Your prompt"
```

### 📦 Build & Publish

**Building the project:**

```bash
npm run build  # Compiles TypeScript to dist/
```

**Version and build:**

```bash
npm version minor  # Bump version (patch/minor/major)
npm run build      # Compile TypeScript
```

This compiles TypeScript to JavaScript in the `dist/` folder.

**Test the package locally** (optional but recommended):

```bash
npm pack
# This creates a .tgz file you can inspect
```

**Test locally with npm link:**

```bash
npm link  # Install as global command
megabuff optimize "Test it out!"
```

**Publish to npm:**

```bash
npm publish
```

The `prepublishOnly` script will automatically run `npm run build` before publishing.

---

## 📚 Publishing to npm

<details>
<summary><b>📦 Publishing Guide (For Maintainers)</b></summary>

### 🎯 First-time Setup

1. Create an [npm account](https://www.npmjs.com/signup)
2. Login: `npm login`
3. Update `package.json` with your details
4. Check name availability: `npm search megabuff`

### 🚀 Publishing Process

```bash
# 1. Commit changes
git add .
git commit -m "Release preparation"

# 2. Bump version (patch/minor/major)
npm version minor

# 3. Publish!
npm publish

# 4. Push tags
git push && git push --tags
```

### 📦 What Gets Published

- ✅ Compiled JavaScript (`dist/`)
- ✅ Documentation
- ✅ Package metadata
- ❌ TypeScript source
- ❌ Dev dependencies

### 🎉 After Publishing

Users install with:
```bash
npm install -g megabuff
```

Available at: [npmjs.com/package/megabuff](https://www.npmjs.com/package/megabuff)

</details>

---

<div align="center">

**Made with ❤️ by the MegaBuff Team**

⭐ **Star us on [GitHub](https://github.com/thesupermegabuff/megabuff-cli)!**

🐛 [Report Issues](https://github.com/thesupermegabuff/megabuff-cli/issues) • 💡 [Request Features](https://github.com/thesupermegabuff/megabuff-cli/issues)

</div>
