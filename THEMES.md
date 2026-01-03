# MegaBuff CLI Themes

MegaBuff CLI now supports beautiful color themes to customize your terminal experience!

## Available Themes

### 1. Default
Clean cyan and green theme - the original MegaBuff look.

### 2. Material Design
Inspired by Google's Material Design color palette with vibrant blues, greens, and pinks.

### 3. Dracula
Dark theme with purple and pink accents - perfect for late-night coding sessions.

### 4. Nord
Arctic, north-bluish color palette with calming frost colors.

### 5. Solarized Dark
Precision colors for machines and people - a classic among developers.

### 6. Monokai
Vibrant and colorful theme inspired by Monokai Pro.

### 7. Cyberpunk
Neon lights and futuristic vibes with electric colors.

### 8. Sunset
Warm oranges, pinks, and purples for a calming sunset atmosphere.

## Theme Commands

### View Current Theme
```bash
megabuff theme
```

### List All Themes
See all available themes with color previews:
```bash
megabuff theme list
```

### Change Theme
Set your preferred theme:
```bash
megabuff theme set <theme-name>
```

Examples:
```bash
megabuff theme set material
megabuff theme set dracula
megabuff theme set cyberpunk
```

### Preview a Theme
Try out a theme before setting it:
```bash
megabuff theme preview <theme-name>
```

Example:
```bash
megabuff theme preview nord
```

## Theme Persistence

Your theme choice is saved to `~/.megabuff/config.json` and will be used for all future MegaBuff commands.

## Creating Custom Themes

Themes are defined in `src/themes.ts`. Each theme has:

- **name**: Display name
- **description**: Short description
- **colors**: Color mappings for different UI elements
  - `primary`: Main headings and text
  - `secondary`: Secondary text
  - `success`: Success messages (✓)
  - `error`: Error messages (✗)
  - `warning`: Warnings (⚠)
  - `info`: Information (ℹ)
  - `dim`: Dimmed/muted text
  - `highlight`: Highlighted important text
  - `accent`: Accent colors

To add a custom theme, edit `src/themes.ts` and add your theme to the `themes` object.

## Examples

### Using Material Design Theme
```bash
$ megabuff theme set material
✓ Theme changed to: Material Design
Inspired by Material Design colors

Color preview:
primary success error warning info accent
```

### Listing Themes
```bash
$ megabuff theme list

Available Themes:

● Default (current)
  Clean cyan and green theme
  Preview: primary success error warning info accent

  Material Design
  Inspired by Material Design colors
  Preview: primary success error warning info accent

...
```

### Previewing a Theme
```bash
$ megabuff theme preview cyberpunk

╭─────────────────────────────────────╮
│   Cyberpunk Theme Preview          │
╰─────────────────────────────────────╯

Neon lights and futuristic vibes

Primary text and headings
Secondary text
✓ Success messages
✗ Error messages
⚠ Warning messages
ℹ Info messages
Highlighted text
Accent color
Dimmed/secondary information

To use this theme: megabuff theme set cyberpunk
```

## Tips

- **Dark Terminal**: All themes are optimized for dark terminal backgrounds
- **True Color Support**: Themes use 24-bit true colors (via chalk's hex colors) for the best visual experience
- **Fallback**: If your terminal doesn't support true colors, themes will still work but may look slightly different
- **Reset**: To go back to the default theme, run `megabuff theme set default`

Enjoy your personalized MegaBuff experience! 🎨
