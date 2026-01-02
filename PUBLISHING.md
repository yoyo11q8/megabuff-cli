# Publishing Checklist

Quick reference for publishing MegaBuff CLI to npm.

## Pre-publish Checklist

- [ ] Update `package.json`:
  - [ ] `author` field with your name/email
  - [ ] `repository.url` with your GitHub URL
  - [ ] `bugs.url` with your GitHub issues URL
  - [ ] `homepage` with your GitHub README URL
  - [ ] `version` is correct (use `npm version patch/minor/major`)

- [ ] Update `README.md`:
  - [ ] Replace placeholder URLs
  - [ ] Add screenshots/GIFs if available
  - [ ] Test all code examples

- [ ] Code quality:
  - [ ] Run `npm run build` successfully
  - [ ] Test the CLI locally (`npm link`)
  - [ ] All features working
  - [ ] No TypeScript errors

- [ ] Git:
  - [ ] All changes committed
  - [ ] Pushed to GitHub
  - [ ] Tagged with version (auto-created by `npm version`)

## Publishing Commands

## Testing Before Publishing

Always test the build before publishing to avoid publishing broken packages.

### Quick Local Test

```bash
# 1. Clean build
rm -rf dist/
npm run build

# 2. Link locally
npm link

# 3. Test commands
megabuff --version
megabuff config show
megabuff optimize "test prompt"

# 4. Clean up
npm unlink -g megabuff
```

### Recommended: Test Package Tarball

This simulates exactly what will be published:

```bash
# 1. Create package tarball
npm pack

# 2. Inspect contents (optional)
tar -tzf megabuff-0.1.0.tgz

# 3. Install from tarball
npm install -g ./megabuff-0.1.0.tgz

# 4. Test thoroughly
megabuff --version
megabuff optimize "Write a function to validate email"
megabuff config set sk-test-key
megabuff config show

# 5. Clean up
npm uninstall -g megabuff
rm megabuff-0.1.0.tgz
```

### Dry Run (See What Would Be Published)

```bash
# See what files will be included WITHOUT publishing
npm publish --dry-run

# Check for:
# ✅ dist/ folder included
# ❌ src/ folder excluded
# ❌ node_modules/ excluded
# ✅ README.md included
```

### What to Verify

- [ ] `dist/` folder exists with compiled JS
- [ ] Shebang preserved in `dist/index.js` (`#!/usr/bin/env node`)
- [ ] All commands work (`optimize`, `config`, etc.)
- [ ] Clipboard auto-copy works
- [ ] Config save/load works
- [ ] No TypeScript errors during build
- [ ] Package size is reasonable (check with `npm pack`)
- [ ] Only necessary files included (check with `tar -tzf`)

## Publishing Commands

### First Time

```bash
# 1. Login to npm
npm login

# 2. Check if name is available
npm search megabuff

# 3. Test first (see above)
npm pack
npm install -g ./megabuff-0.1.0.tgz
# ... test thoroughly ...

# 4. Publish
npm publish
```

### Updates

```bash
# 1. Make and commit your changes
git add .
git commit -m "Add feature X"

# 2. Update version (choose one based on change type)
npm version patch   # Bug fixes: 0.1.0 → 0.1.1
npm version minor   # New features: 0.1.0 → 0.2.0
npm version major   # Breaking changes: 0.1.0 → 1.0.0

# 3. Publish
npm publish

# 4. Push to GitHub (including tags)
git push && git push --tags
```

## Version Management Guide

### Semantic Versioning (MAJOR.MINOR.PATCH)

Use `npm version` to automatically update package.json, create a git commit, and create a git tag.

#### `npm version patch` - Bug Fixes
**Example: 0.1.0 → 0.1.1**

Use for:
- Bug fixes
- Documentation updates
- Minor tweaks
- Performance improvements
- No new features

```bash
npm version patch
# Updates: 0.1.0 → 0.1.1
# Creates: git commit + tag v0.1.1
```

#### `npm version minor` - New Features
**Example: 0.1.0 → 0.2.0**

Use for:
- New features
- New commands or options
- Enhancements
- Backwards compatible changes
- Most common for updates

```bash
npm version minor
# Updates: 0.1.1 → 0.2.0
# Creates: git commit + tag v0.2.0
```

#### `npm version major` - Breaking Changes
**Example: 0.2.0 → 1.0.0**

Use for:
- Breaking changes
- API changes that aren't backwards compatible
- Removed features
- Major rewrites
- When ready for v1.0!

```bash
npm version major
# Updates: 0.2.0 → 1.0.0
# Creates: git commit + tag v1.0.0
```

### What `npm version` Does Automatically

1. ✅ Updates `version` field in package.json
2. ✅ Creates a git commit with the new version as message
3. ✅ Creates a git tag (e.g., "v0.1.1")
4. ✅ Runs `prepublishOnly` script when you publish

### Example Scenarios

```bash
# Fixed clipboard bug
npm version patch
npm publish
git push && git push --tags
# Result: 0.1.0 → 0.1.1

# Added new --format option
npm version minor
npm publish
git push && git push --tags
# Result: 0.1.1 → 0.2.0

# Changed config file structure (breaking)
npm version major
npm publish
git push && git push --tags
# Result: 0.2.0 → 1.0.0
```

### Pre-release Versions (Advanced)

For beta or release candidate versions:

```bash
# Create beta release: 0.1.0 → 0.1.1-beta.0
npm version prerelease --preid=beta

# Create release candidate: 0.1.0 → 0.1.1-rc.0
npm version prerelease --preid=rc

# Publish with beta tag (not latest)
npm publish --tag beta
```

## After Publishing

- [ ] Verify package on npm: https://www.npmjs.com/package/megabuff
- [ ] Test installation: `npm install -g megabuff`
- [ ] Test the installed CLI: `megabuff --version`
- [ ] Update GitHub release notes
- [ ] Tweet/share the release (optional)

## Troubleshooting

**Error: Package name already exists**
- Change the `name` field in package.json to something unique

**Error: You must be logged in**
- Run `npm login` and enter your credentials

**Error: No permission to publish**
- Make sure you're logged in with the correct account
- If the package exists, you need to be a maintainer

**Build fails**
- Check TypeScript errors: `npm run build`
- Verify all dependencies are installed: `npm install`

**Package too large**
- Check `.npmignore` is excluding unnecessary files
- Run `npm pack` to see what's being included
