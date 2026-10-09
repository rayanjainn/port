# Rayan World

An interactive pixel-art portfolio. Visitors walk a little village where every building is a chapter: the Town Hall (about), Gallery (projects), Tavern (experience), Forge (skills), Academy (education & honours) and Wizard Tower (contact). There's a hidden cave arcade, a day/night cycle, quests, a world map with fast travel, and an opt-in fight mode.

For visitors who'd rather skim, **Quick View** (`/quick`) presents the same content as a clean, scrollable page.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · Zustand · Canvas 2D · Kenney CC0 asset packs

## Editing content (no backend)

All content lives in one file: [`content/portfolio.json`](content/portfolio.json). It is bundled at build time, so the site is fully static.

### Option A: the admin panel (`/admin`)

1. Open `/admin` on the deployed site (or locally).
2. Edit profile, links, experience, education, honours and skills.
3. **Projects → Load repositories** pulls your public GitHub repos. Tick the ones you want shown; only ticked projects appear on the site. Reorder them, star the featured ones, and edit any imported detail.
4. Changes autosave as a draft in your browser. Use **Preview game** or **Preview page** to see the draft before publishing.
5. **Publish** commits `content/portfolio.json` to the repo through the GitHub API using a fine-grained personal access token. Vercel sees the commit and redeploys.

To create the token, go to GitHub → Settings → Developer settings → Fine-grained tokens. Give it access to this repository only, with **Contents: Read and write**. The token is only ever sent to `api.github.com`, and is only stored if you tick "Remember token on this device".

Anyone can open `/admin`, but nothing can be published without a token that has write access to the repo.

### Option B: by hand

Edit `content/portfolio.json` directly (or use **Download JSON** in the admin) and push.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| E / Enter | Enter building |
| M | World map (fast travel) |
| N | Toggle day / night |
| T | Fight mode (Space to attack) |
| Esc | Close |

Touch devices get a virtual joystick and an action button.

## Project layout

```
app/                 routes: / (game), /quick, /admin
components/game/     canvas game loop
components/buildings building modals (one per section)
components/ui/       title screen, HUD, minimap, toasts, touch controls
components/quick/    quick view page
components/admin/    admin editor
content/             portfolio.json, the single source of truth
lib/                 tilemap, world renderer, content store, GitHub helpers
public/assets/       Kenney pixel-art packs (CC0)
```

## Credits

Pixel art and UI sounds are from [Kenney](https://kenney.nl), released under CC0.
