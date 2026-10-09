# Rayan World

An interactive pixel-art portfolio. Visitors walk a living village where every building is a chapter you can step inside: the Town Hall (about), Gallery (one painting per project), Tavern (experience), Forge (skills), Academy (education & honours) and Raven Post (contact). Villagers wander and chat, chickens and cows roam the farm, a watermill turns on the river, and an old mine hides a torch-lit arcade with four minigames. Day/night, quests, a world map with fast travel, click-to-walk and music included.

For visitors who'd rather skim, **Quick View** (`/quick`) presents the same content as a cinematic scrolling page with a 3D voxel model of the village.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · Lenis · React Three Fiber · Zustand · Howler · Canvas 2D · Ninja Adventure (CC0)

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
| Click / tap | Walk there (and interact on arrival) |
| E / Enter | Talk, enter, interact |
| M | World map (fast travel) |
| N | Toggle day / night |
| Space | Swing your sword (in the mine) |
| Esc | Close |

Touch devices get a virtual joystick and an action button.

## Project layout

```
app/                 routes: / (game), /quick, /admin
components/game/     canvas engine: scenes, actors, lighting, input
components/buildings building modals (one per section)
components/arcade/   the mine's four minigames
components/ui/       title screen, HUD, dialogue, minimap, toasts, touch controls
components/quick/    quick view page + 3D voxel village
components/admin/    admin editor
content/             portfolio.json, the single source of truth
lib/world/           village generator, interiors, scene model
lib/na.ts            sprite catalogue for the art pack
public/na/           Ninja Adventure art, music and sounds (CC0)
```

## Credits

Art, music and sounds are from the [Ninja Adventure asset pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) by Pixel-boy and AAA, released under CC0.
