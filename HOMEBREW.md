# Adding MegaBuff to Homebrew

This guide explains how to make MegaBuff installable via Homebrew.

## Overview

Users will be able to install with:
```bash
brew tap thesupermegabuff/megabuff-cli
brew install megabuff
```

## Prerequisites

- ✅ Package published to npm
- ✅ GitHub account
- ✅ Homebrew installed (for testing)

## Setup Steps

### 1. Create Homebrew Tap Repository

Create a new GitHub repository named **`homebrew-megabuff`**:
- Repository name MUST start with `homebrew-`
- URL: `https://github.com/thesupermegabuff/homebrew-megabuff`
- Public repository
- No template needed

```bash
# Clone the new repository
git clone https://github.com/thesupermegabuff/homebrew-megabuff.git
cd homebrew-megabuff
```

### 2. Create the Formula File

Create a file named `megabuff.rb`:

```ruby
class Megabuff < Formula
  desc "AI-powered prompt optimizer CLI with BYOK support for OpenAI"
  homepage "https://github.com/thesupermegabuff/megabuff-cli"
  url "https://registry.npmjs.org/megabuff/-/megabuff-0.1.0.tgz"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "0.1.0", shell_output("#{bin}/megabuff --version")
  end
end
```

### 3. Get the SHA256 Hash

After publishing version 0.1.0 to npm:

```bash
# Download the tarball from npm
curl -L https://registry.npmjs.org/megabuff/-/megabuff-0.1.0.tgz -o megabuff.tgz

# Calculate SHA256
shasum -a 256 megabuff.tgz

# Copy the hash output and replace REPLACE_WITH_ACTUAL_SHA256 in megabuff.rb
```

### 4. Test the Formula Locally

```bash
# Install from local formula
brew install --build-from-source ./megabuff.rb

# Test it works
megabuff --version

# Uninstall for now
brew uninstall megabuff
```

### 5. Publish the Formula

```bash
git add megabuff.rb
git commit -m "Add megabuff formula v0.1.0"
git push origin main
```

## User Installation

Once published, users can install with:

```bash
# Add your tap (one-time setup)
brew tap thesupermegabuff/megabuff

# Install megabuff
brew install megabuff

# Use it
megabuff optimize "your prompt"
```

## Updating for New Versions

When you publish a new npm version (e.g., 0.2.0):

### Manual Update

1. **Download new tarball and get SHA256:**
   ```bash
   curl -L https://registry.npmjs.org/megabuff/-/megabuff-0.2.0.tgz -o megabuff.tgz
   shasum -a 256 megabuff.tgz
   ```

2. **Update `megabuff.rb`:**
   ```ruby
   url "https://registry.npmjs.org/megabuff/-/megabuff-0.2.0.tgz"
   sha256 "NEW_SHA256_HASH"

   # ... and in the test section:
   assert_match "0.2.0", shell_output("#{bin}/megabuff --version")
   ```

3. **Test and publish:**
   ```bash
   brew install --build-from-source ./megabuff.rb
   megabuff --version  # Should show 0.2.0

   git add megabuff.rb
   git commit -m "Update megabuff to v0.2.0"
   git push
   ```

### Automated Update (Advanced)

Use Homebrew's bump tool:
```bash
brew bump-formula-pr --url=https://registry.npmjs.org/megabuff/-/megabuff-0.2.0.tgz thesupermegabuff/megabuff/megabuff
```

## Complete Workflow Example

```bash
# 1. Publish new npm version
npm version minor
npm publish
git push && git push --tags

# 2. Update Homebrew formula
cd ~/homebrew-megabuff
curl -L https://registry.npmjs.org/megabuff/-/megabuff-0.2.0.tgz -o megabuff.tgz
shasum -a 256 megabuff.tgz

# 3. Edit megabuff.rb with new version and hash
# ... (edit file) ...

# 4. Test locally
brew install --build-from-source ./megabuff.rb
megabuff --version

# 5. Publish formula
git add megabuff.rb
git commit -m "Update megabuff to v0.2.0"
git push
```

## Adding to Main README

Add installation instructions to your main README.md:

```markdown
## Installation

### via npm (recommended)
\`\`\`bash
npm install -g megabuff
\`\`\`

### via Homebrew (macOS/Linux)
\`\`\`bash
brew tap thesupermegabuff/megabuff
brew install megabuff
\`\`\`
```

## Troubleshooting

**Formula fails to install:**
- Check SHA256 matches exactly
- Verify npm package is published and accessible
- Test with `brew install --build-from-source --verbose`

**Wrong version shown:**
- Update the version in the test assertion
- Clear Homebrew cache: `brew cleanup megabuff`

**Node not found:**
- Homebrew will auto-install node as a dependency
- Users may need to restart terminal after install

## Advanced: Submitting to Homebrew Core

Once your package is popular and stable:

1. Formula must meet [Homebrew's quality standards](https://docs.brew.sh/Acceptable-Formulae)
2. Submit PR to [Homebrew/homebrew-core](https://github.com/Homebrew/homebrew-core)
3. Pass review process
4. Users can install with just `brew install megabuff` (no tap needed)

This is optional and typically done after the package has proven adoption.

## Resources

- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [Node.js Formulas Guide](https://docs.brew.sh/Node-for-Formula-Authors)
- [Homebrew Tap Documentation](https://docs.brew.sh/Taps)
