# Quiznet Focus identity

The **Focus** identity uses a geometric Q, a forest-green app tile, pale sage accents, and charcoal surfaces. Keep the name Quiznet and the compact desktop layout.

## Artwork

- `assets/brand/mark.svg` is the editable vector master. Its open ring and diagonal tail form the Q; preserve the diagonal gaps. Use it without a tile inside the app.
- `assets/brand/icon.svg` adds the forest tile with transparent rounded corners and an outer safety margin.
- `assets/brand/wordmark.svg` pairs the mark with the Quiznet name. It uses Segoe UI Semibold, supplied by Windows, with Arial as a fallback. The lettering is live text, not outlined paths; use it on Windows or retain those font dependencies when exporting elsewhere.
- `assets/icon.png` is a transparent 1024px app icon. `assets/icon.ico` contains separately rendered 16, 20, 24, 32, 40, 48, 64, 128, and 256px frames for Windows.

Run `npm run assets:brand` to regenerate the derived SVGs, PNG, and ICO with the existing Electron and Playwright dependencies. The renderer is an isolated hidden artwork window; it never loads Quiznet or reads a study library. No fonts, servers, or new packages are downloaded. Additional previews and PNG sizes are written to ignored `outputs/Quiznet-Identity/`. Edit the vector master and regenerate the derived assets.

## Palette

| Role | Value | Usage |
| --- | --- | --- |
| Background | `#181B20` | Main window |
| Surface | `#23282E` | Header, panels, dialogs, secondary buttons |
| Hover | `#2D343C` | Interactive surfaces |
| Divider | `#38414A` | Surface boundaries |
| Forest | `#244A3A` | App icon tile and brand treatments |
| Sage | `#BFD5AA` | Logo, primary buttons, keyboard focus |
| Text | `#E8EBF0` | Primary text and wordmark |
| Muted text | `#ABB4BF` | Secondary information |

Use dark text on sage buttons. Keep error and result states supported by labels and symbols; branding does not change scoring or answer-selection behavior. Preserve the existing course colors.

## Application rules

- Use one Q symbol throughout the header, title bar, app window, installer, and shortcuts.
- Keep the interface wordmark as accessible live text, using Segoe UI Semibold. Decorative adjacent marks have empty alt text.
- Use flat fills, without texture, gradients, glows, or baked-in backgrounds outside the icon tile.
- Scale proportionally and leave clear space around the mark. The app icon already includes safe padding; do not add a second tile.
- Check actual 16–48px renders and Windows scaling, plus keyboard focus and muted-text readability. Use the committed vector artwork as the source for production assets.
- Keep all branding local. App ID, install identity, shortcut name, and study-data location remain unchanged.
