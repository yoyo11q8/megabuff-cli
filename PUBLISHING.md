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

### First Time

```bash
# 1. Login to npm
npm login

# 2. Check if name is available
npm search megabuff

# 3. Build and publish
npm run build
npm publish
```

### Updates

```bash
# 1. Update version (this also creates a git tag)
npm version patch   # for bug fixes
npm version minor   # for new features
npm version major   # for breaking changes

# 2. Publish
npm publish

# 3. Push to GitHub
git push && git push --tags
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
