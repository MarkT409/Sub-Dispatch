# Logo files for the site

Place these two exports in this folder (`public/`):

| File | Used when |
|------|-----------|
| `lantana-logo-horizontal.png` | Light mode (you already have this) |
| `lantana-logo-horizontal-dark.png` | Dark mode |

Both should be the **same width/height** (e.g. 400×100 px) so the header does not jump when switching themes.

## Creating the dark mode logo in Pixelmator Pro

1. Open `Lantana-Horizontal.pxd` on your Desktop (or duplicate the document).
2. **Remove or hide the black background layer** so the canvas is transparent.
3. Adjust colors for dark backgrounds:
   - **LANTANA** text: white or very light lavender (e.g. `#F1F5F9` or `#E8E0F0`)
   - **ELECTRIC** + accent lines: keep orange (`#F5A623`) or slightly brighter
   - **Flower petals**: light purple/lavender outline or fill, or white outlines
   - **Lightning bolt**: keep orange
   - **Leaves/stem**: slightly brighter green if needed
4. **File → Export → PNG**
   - Format: PNG
   - **Transparent background** (turn off “include background” / use transparent canvas)
5. Save as: `lantana-logo-horizontal-dark.png`
6. Copy into this project:  
   `public/lantana-logo-horizontal-dark.png`

## Quick check before exporting

- Place the logo on a **dark gray (#0a0f1a)** swatch in Pixelmator — text and icon should be easy to read.
- Export at **2×** size (800×200) for sharper retina displays, optional.

## Optional: one transparent logo for both themes

If one transparent PNG reads well on both light and dark headers, you can use a single file and simplify `Logo.tsx` — but separate files usually look best.
