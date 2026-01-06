<h1 align="center">
🤖 MegaBuff
</h1>
<div align="center">

<br/>

**CLI for Better prompts, transparent costs, & zero vendor lock-in. Optimize AI prompts across OpenAI, Claude, Gemini, Grok, xAI, and DeepSeek with detailed per-token pricing. BYOK keeps it honest.**

 **[Star us on GitHub](https://github.com/thesupermegabuff/megabuff-cli)** 
| **[Request a Feature](https://github.com/thesupermegabuff/megabuff-cli/issues)**

🔑 BYOK (Bring Your Own Key) • 🎨 16 Beautiful Themes • ⚡ Lightning Fast

[![npm version](https://img.shields.io/npm/v/megabuff.svg?style=flat-square)](https://www.npmjs.com/package/megabuff)
[![npm downloads](https://img.shields.io/npm/dm/megabuff.svg?style=flat-square)](https://www.npmjs.com/package/megabuff)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg?style=flat-square)](https://opensource.org/licenses/AGPL-3.0)
[![GitHub stars](https://img.shields.io/github/stars/thesupermegabuff/megabuff-cli.svg?style=flat-square)](https://github.com/thesupermegabuff/megabuff-cli/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/thesupermegabuff/megabuff-cli.svg?style=flat-square)](https://github.com/thesupermegabuff/megabuff-cli/issues)
[![Node.js Version](https://img.shields.io/node/v/megabuff.svg?style=flat-square)](https://nodejs.org)

<img width="690" src="media/github-media-banner.png" alt="MegaBuff Banner" width="100%">

[![Watch the demo](https://img.youtube.com/vi/JZ4on86IpgU/maxresdefault.jpg)](https://youtu.be/JZ4on86IpgU)

*Click the image above to watch the demo on YouTube*

</div>

---

## 📦 Installation

Get started in seconds:

```bash
npm install -g megabuff
megabuff optimize "Rewrite this prompt to be clearer"

# Use interactive mode for multiple commands!
megabuff shell

# Set up your API key (choose your favorite provider)
megabuff config token YOUR_API_KEY --provider openai
```

**That's it!** 🎉 You're ready to supercharge your prompts.

---

## ✨ Features

- 🤖 **Multi-Provider Support** - OpenAI, Anthropic Claude, Google Gemini, xAI, DeepSeek & more
- 🔑 **BYOK Model** - Bring your own API key, full control
- 🐚 **Interactive Shell Mode** - Run multiple commands without repeating `megabuff` (NEW!)
- 🎨 **16 Beautiful Themes** - Customize your CLI experience
- 🎭 **7 Optimization Styles** - Concise, detailed, technical, creative, formal, casual, balanced
- 🔧 **Custom System Prompts** - Ultimate control over optimization behavior
- 🔄 **Iterative Refinement** - Progressive improvement with multiple optimization passes
- 🔍 **Comparison Mode** - Test multiple providers side-by-side to find the best result
- 📊 **Prompt Analysis** - Get detailed feedback on strengths, weaknesses, and improvement suggestions
- 💰 **Cost Tracking** - Estimate and monitor API costs before running operations
- ⚡ **Lightning Fast** - Optimize prompts in seconds
- 📋 **Auto-Clipboard** - Results copied automatically
- 🔀 **Flexible Input** - Inline, file, pipe, or interactive
- 💾 **Multiple Output Formats** - Stdout, file, or interactive view
- 🔒 **Secure Storage** - Keychain support for API keys
- 🎯 **Smart Model Selection** - Auto-detects provider from model name
- 📊 **Stats Tracking** - See word count changes and improvements
- 📝 **Error Logging** - All errors saved to `~/.megabuff/errors.log` for easy debugging
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

# 4. Or use interactive mode for multiple commands!
megabuff shell
```

> 💡 **Pro Tip:** Use `megabuff shell` for an interactive session with guided wizards!

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
- `gpt-5.2` (default)
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

**Anthropic:**
- `claude-opus-4-5` (default)
- `claude-sonnet-4-5`
- `claude-sonnet-4-0`
- `claude-sonnet-4-5-20250929`
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

**Google Gemini:**
- `gemini-2.5-flash` (default)
- `gemini-2.5-pro`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-3-flash-preview`
- `gemini-3-pro-preview`
- `gemini-flash-latest`

**xAI (Grok):**
- `grok-beta` (default)
- `grok-vision-beta`

**DeepSeek:**
- `deepseek-chat` (default)
- `deepseek-reasoner`

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

### 🐚 Interactive Shell Mode (NEW!)

**Run multiple commands without typing `megabuff` every time!**

```bash
megabuff shell
# or: megabuff interactive
# or: megabuff i

# Now you're in the shell:
megabuff> optimize "Write a REST API" --style technical
megabuff> analyze "Create a chatbot"
megabuff> theme set cyberpunk
megabuff> exit
```

**Features:**
- ⚡ **Faster workflow** - Skip typing `megabuff` for every command
- 🧙 **Guided wizards** - Type `optimize` or `analyze` without arguments to start a step-by-step wizard
- 📜 **Command history** - Use arrow keys (↑/↓) to recall previous commands
- 🔄 **Session persistence** - API keys and config loaded once
- 📝 **Error logging** - All errors saved to `~/.megabuff/errors.log` for debugging
- 💡 **Built-in help** - Type `help` anytime
- 🧹 **Clear screen** - Type `clear` to refresh
- 🚪 **Easy exit** - Type `exit`, `quit`, or `q` to leave

**Pro Tips:**
- All regular commands work: `optimize`, `analyze`, `config`, `theme`
- All flags work: `--provider`, `--style`, `--iterations`, `--show-cost`, etc.
- Guided wizards only show providers with configured API tokens
- Compare mode in wizards only shows providers you've set up
- Press Ctrl+C twice to exit immediately
- Perfect for batch operations and experimentation

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

### 4️⃣ Interactive Prompt Input

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

### 🎨 Optimization Styles

**Tailor the optimization to your needs!** Choose from 7 different styles:

```bash
# Balanced (default) - Well-rounded optimization
megabuff optimize "your prompt"

# Concise - Minimize tokens, maximize clarity
megabuff optimize "your prompt" --style concise

# Detailed - Add comprehensive context and examples
megabuff optimize "your prompt" --style detailed

# Technical - Perfect for code generation tasks
megabuff optimize "your prompt" --style technical

# Creative - Encourage imaginative outputs
megabuff optimize "your prompt" --style creative

# Formal - Professional, business-appropriate
megabuff optimize "your prompt" --style formal

# Casual - Friendly, conversational tone
megabuff optimize "your prompt" --style casual
```

**Available Styles:**
- `balanced` - Default, well-rounded optimization
- `concise` - Brief and to-the-point
- `detailed` - Comprehensive with examples
- `technical` - Precise technical terminology
- `creative` - Imaginative and flexible
- `formal` - Professional and structured
- `casual` - Conversational and approachable

### 🔧 Custom System Prompts

**Ultimate control!** Provide your own system prompt:

```bash
# Use a custom optimization strategy
megabuff optimize "your prompt" --system-prompt "Focus on making this prompt more concise while maintaining all technical details"

# Combine with any provider
megabuff optimize --provider anthropic "complex task" --system-prompt "Optimize for Claude's chain-of-thought reasoning"
```

**Pro Tips:**
- Custom prompts override all style and provider-specific optimizations
- Great for domain-specific optimization (legal, medical, scientific)
- Use to enforce company-specific prompt standards

### 🔄 Iterative Refinement

**Progressive improvement!** Run multiple optimization passes:

```bash
# Single pass (default)
megabuff optimize "your prompt"

# 3 iterations for progressive refinement
megabuff optimize "your prompt" --iterations 3

# Maximum refinement (5 passes)
megabuff optimize "complex prompt" --iterations 5

# Show output from each iteration (verbose mode)
megabuff optimize "your prompt" --iterations 3 --verbose

# Combine with styles and providers
megabuff optimize --iterations 3 --style detailed --provider anthropic "technical documentation"
```

**How it works:**
- Each iteration takes the previous output and optimizes it further
- Great for complex prompts that need multiple rounds of refinement
- Iterations are limited to 1-5 to balance quality and cost
- Progress is shown for each iteration with individual timing

**Verbose mode (`--verbose` or `-v`):**
- Shows the output from each iteration in real-time
- Helps you see how the prompt evolves with each pass
- Useful for understanding the optimization process
- Only displays iteration outputs when using multiple iterations

**When to use multiple iterations:**
- Complex, multi-part prompts
- Technical documentation that needs precision
- Creative writing prompts that benefit from layered refinement
- When you want the absolute best optimization possible

**Analyze before optimizing (`--analyze-first` or `-a`):**
- Get detailed analysis BEFORE optimization runs
- See exactly what will be improved
- Understand the prompt's weaknesses upfront
- Then automatically proceed with optimization

```bash
# Analyze first, then optimize
megabuff optimize "your prompt" --analyze-first
megabuff optimize "your prompt" -a --style technical

# Combine with iterations
megabuff optimize "your prompt" --analyze-first --iterations 3
```

### 🔍 Comparison Mode

**Can't decide which provider to use?** Test them all at once!

```bash
# Compare optimizations from all configured providers
megabuff optimize "your prompt" --compare

# Compare specific providers only
megabuff optimize "your prompt" --compare --providers openai,anthropic
megabuff optimize "your prompt" --compare --providers openai,anthropic,google

# Combine with styles and iterations
megabuff optimize "complex prompt" --compare --style technical
megabuff optimize "your prompt" --compare --iterations 3
megabuff optimize "your prompt" --compare --providers openai,deepseek --style concise
```

**How it works:**
- Runs optimization across all providers with configured API keys (or specified providers)
- Executes all providers in parallel for speed
- Shows side-by-side results with timing and statistics
- Requires at least 2 providers with configured API keys

**Select specific providers:**
- Use `--providers` flag with comma-separated provider names
- Example: `--providers openai,anthropic,google`
- Only tests the providers you specify (if they have API keys configured)
- Great for targeted comparisons

**What you'll see:**
- Individual results from each provider
- Duration and length statistics for each
- Average metrics across all successful providers
- Any errors or failures clearly marked

**When to use comparison mode:**
- Evaluating which provider works best for your use case
- Testing different AI approaches to the same problem
- Quality assurance - seeing multiple perspectives
- Finding the optimal provider for specific prompt types
- A/B testing between specific providers

**Pro Tips:**
- Configure multiple providers first using `megabuff config set`
- Results are NOT copied to clipboard (choose your favorite manually)
- Combine with `--iterations` for comprehensive testing
- Use `--style` to ensure consistent optimization approach across providers
- Use `--providers` to focus on specific providers you want to compare

### 💰 Cost Tracking & Estimation

**Know before you spend!** Estimate and track API costs for your operations with detailed per-token and per-model pricing information.

```bash
# Show cost estimate before running optimization
megabuff optimize "your prompt" --show-cost

# Only estimate cost without running (perfect for budgeting)
megabuff optimize "your prompt" --estimate-only

# Estimate with multiple iterations
megabuff optimize "your prompt" --iterations 3 --estimate-only

# Show cost for analysis
megabuff analyze "your prompt" --show-cost

# Estimate only for analysis
megabuff analyze "your prompt" --estimate-only

# Compare costs across providers (combine with --compare)
megabuff optimize "your prompt" --compare --show-cost
```

**What you see with `--show-cost`:**

**1. Initial Cost Estimate (before operation runs):**
- Model being used for the operation
- **Detailed pricing breakdown:**
  - Input price per 1M tokens and per individual token
  - Output price per 1M tokens and per individual token
- Estimated input tokens
- Estimated output tokens
- Estimated total cost in USD

**2. Actual Cost Summary (after operation completes):**
- Model used
- **Detailed pricing breakdown** (same as estimate)
- Actual input tokens used
- Actual output tokens used
- Actual total cost in USD
- Estimate accuracy percentage

**3. Comparison Mode Pricing:**
- Individual pricing details for each provider's model
- Total tokens used across all providers
- Total cost across all providers
- Average cost per provider
- Per-iteration cost breakdown (when using `--iterations`)

**Example output:**
```
💰 Cost Estimate
────────────────────────────────────────────────────────────────────────────────
   Model: claude-sonnet-4-5
   Pricing:
      Input:  $3.00/1M tokens ($0.000003000/token)
      Output: $15.00/1M tokens ($0.000015000/token)

   Input tokens: 512
   Output tokens (est): 614
   Estimated cost: $0.0025
────────────────────────────────────────────────────────────────────────────────

... [operation runs] ...

💰 Actual Cost
────────────────────────────────────────────────────────────────────────────────
   Model: claude-sonnet-4-5
   Pricing:
      Input:  $3.00/1M tokens ($0.000003000/token)
      Output: $15.00/1M tokens ($0.000015000/token)

   Optimization tokens: 512 in + 621 out
   Optimization cost: $0.0025
   Total cost: $0.0025
   Estimate accuracy: 98.9%
────────────────────────────────────────────────────────────────────────────────
```

**How it works:**
- Estimates token count based on your prompt text (~4 chars per token)
- Uses current pricing for each model/provider
- Accounts for system prompts and iterations
- Shows detailed cost breakdown BEFORE making any API calls
- Displays actual costs with pricing details AFTER operations complete
- Compares estimate vs actual for accuracy tracking

**Pricing information (updated January 2025):**

| Provider | Model | Input (per 1M) | Output (per 1M) |
|----------|-------|----------------|-----------------|
| **OpenAI** | gpt-5.2 | $2.50 | $10.00 |
| | gpt-4o | $2.50 | $10.00 |
| | gpt-4o-mini | $0.15 | $0.60 |
| | gpt-4-turbo | $10.00 | $30.00 |
| **Anthropic** | claude-opus-4-5 | $15.00 | $75.00 |
| | claude-sonnet-4-5 | $3.00 | $15.00 |
| | claude-sonnet-4-0 | $3.00 | $15.00 |
| | claude-3-haiku | $0.25 | $1.25 |
| **Google** | gemini-2.5-pro | $1.25 | $5.00 |
| | gemini-2.5-flash | $0.075 | $0.30 |
| | gemini-2.0-flash | $0.075 | $0.30 |
| **xAI** | grok-beta | $5.00 | $15.00 |
| | grok-vision-beta | $5.00 | $15.00 |
| **DeepSeek** | deepseek-chat | $0.14 | $0.28 |
| | deepseek-reasoner | $0.55 | $2.19 |

*Prices are in USD per 1 million tokens*

**Cost calculation formula:**
```
Cost = (input_tokens / 1,000,000 × input_price) + (output_tokens / 1,000,000 × output_price)
```

**Pro Tips:**
- Use `--estimate-only` to preview costs before committing
- Compare costs between providers to find the most economical option
- Most operations cost less than $0.01 with efficient models (gemini-flash, gpt-4o-mini, deepseek-chat)
- Use `--show-cost` to track cumulative spending in sessions
- Detailed pricing information helps you understand exactly where costs come from
- Per-token prices are shown with 9 decimal precision for accuracy
- In comparison mode, you'll see pricing details for each provider side-by-side

### 📊 Prompt Analysis

**Not sure what's wrong with your prompt?** Get detailed AI-powered feedback!

```bash
# Analyze a prompt and get comprehensive feedback
megabuff analyze "Write a function that does stuff"

# Analyze from a file
megabuff analyze --file my-prompt.txt

# Use a specific provider for analysis
megabuff analyze --provider anthropic "Explain quantum computing"

# Save analysis to a file
megabuff analyze "your prompt" --output analysis.txt

# Analyze without copying to clipboard
megabuff analyze "your prompt" --no-copy
```

**What you get:**
- **Overall Assessment** - Summary of the prompt's quality and purpose
- **Strengths** - 3-5 specific things the prompt does well
- **Weaknesses & Issues** - Problems, ambiguities, or areas for improvement
- **Specific Suggestions** - Actionable recommendations for enhancement
- **Key Improvements** - The most impactful changes to prioritize
- **Clarity Score** - Numeric rating (1-10) with justification

**How it works:**
- AI analyzes your prompt structure, clarity, and effectiveness
- Provides constructive, actionable feedback
- Identifies ambiguities and missing context
- Suggests concrete improvements
- Results are automatically copied to clipboard (unless `--no-copy` is used)

**When to use prompt analysis:**
- Before optimizing - understand what needs fixing first
- Learning prompt engineering - see what makes prompts effective
- Debugging poor AI responses - identify prompt issues
- Quality assurance - validate prompts meet standards
- Training others - explain good vs. bad prompt patterns

**Pro Tips:**
- Use analysis before optimization to understand what to focus on
- Different providers may highlight different aspects - try multiple!
- Save analyses to build a library of prompt engineering patterns
- Combine with `optimize` - analyze first, then optimize based on feedback

---

## 🎯 Examples

**Real-world use cases to get you started:**

```bash
# 🐚 Interactive shell mode (NEW!)
megabuff shell
# or: megabuff i
megabuff> optimize "Create a REST API" --style technical
megabuff> analyze "Write a chatbot"
megabuff> optimize --compare --providers openai,anthropic "Explain AI"
megabuff> theme set cyberpunk
megabuff> help
megabuff> exit

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

# 🎭 Use optimization styles
megabuff optimize --style technical "Create a REST API"
megabuff optimize --style concise "long rambling prompt here"
megabuff optimize --style creative "Write a story about AI"

# 🔬 Custom system prompts for specialized use
megabuff optimize "medical diagnosis criteria" --system-prompt "Optimize for medical professionals. Use precise medical terminology."

# 🔄 Iterative refinement for best results
megabuff optimize --iterations 3 "draft blog post intro"
megabuff optimize --iterations 5 --style detailed "complex technical spec"
megabuff optimize --iterations 3 --verbose "See how it evolves"

# 🔍 Analyze first, then optimize
megabuff optimize --analyze-first "Write a function that does stuff"
megabuff optimize -a --style technical "Create a REST API endpoint"
megabuff optimize --analyze-first --iterations 3 "Complex prompt that needs work"

# 🔍 Compare multiple providers side-by-side
megabuff optimize --compare "Create a REST API for user management"
megabuff optimize --compare --style technical "Explain quantum entanglement"
megabuff optimize --compare --iterations 3 "Write a product description"
megabuff optimize --compare --providers openai,anthropic "Which AI writes better code?"
megabuff optimize --compare --providers openai,anthropic,google --style concise "Short & sweet"

# 📊 Analyze prompts for detailed feedback
megabuff analyze "Write a function that does stuff"
megabuff analyze --provider anthropic "Explain how neural networks work"
megabuff analyze --file draft-prompt.txt --output analysis-report.txt
megabuff analyze "Create a chatbot for customer support" --provider openai

# 💰 Cost tracking and estimation
megabuff optimize "your prompt" --show-cost
megabuff optimize "your prompt" --estimate-only
megabuff optimize "your prompt" --iterations 5 --estimate-only
megabuff analyze "your prompt" --show-cost
megabuff optimize --compare --providers openai,anthropic --show-cost "Cost comparison"

# 🔧 Power user combos
megabuff optimize --file long-prompt.txt --provider anthropic -o result.txt --interactive
megabuff optimize --provider deepseek --model deepseek-reasoner --style detailed "Complex reasoning task"
megabuff optimize --iterations 3 --style technical --provider anthropic "API documentation"
megabuff optimize --compare --providers openai,deepseek --style concise --iterations 2 "Head-to-head test"

# 💡 Analysis + Optimization workflow
megabuff analyze "my prompt" --output analysis.txt    # Understand issues first
megabuff optimize "my prompt" --style technical       # Then optimize based on feedback
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

# Run in dev mode (note the -- separator before arguments)
npm run dev -- optimize "Your prompt"

# With flags (always use -- to pass arguments to the script)
npm run dev -- optimize "Your prompt" --compare --providers openai,anthropic
npm run dev -- optimize "Your prompt" --style technical --iterations 3
npm run dev -- optimize "Your prompt" --compare --providers google,openai --style concise --iterations 3
npm run dev -- optimize "Your prompt" --compare --providers google,openai --style concise --iterations 2 --verbose

# Or use tsx directly (no -- needed)
npx tsx src/index.ts optimize "Your prompt"
npx tsx src/index.ts optimize "Your prompt" --compare --providers openai,anthropic
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
npm login
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
