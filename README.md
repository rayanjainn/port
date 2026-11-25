# Rayan World

An interactive pixel-art portfolio. Visitors explore four worlds, each with seven landmarks you can walk into, and every landmark is a chapter of the portfolio: About, Projects, Experience, Skills, Education & Honours, Contact, plus an arcade with four minigames.

| World | Mood | Travel |
| --- | --- | --- |
| **Hearthvale** | cosy village by a river | boat at the dock |
| **Neon Harbor** | modern city with traffic and neon nights | metro station |
| **Sunscar Oasis** | desert oasis with mesas and a waterfall | caravan gate |
| **Hollow Reach** | haunted ruins in permanent twilight | ghost ferry |

Each world has its own UI skin (parchment, neon, sandstone, spectral), weather, ambient sound, day/night (outdoor worlds), named characters who talk about the real work, and a Projects room that shows one pixel illustration per project. Everything renders in **2D** or in an **HD-2D 3D view** (toggle with `V`), from the same simulation.

For visitors who'd rather skim, **Quick View** (`/quick`) presents the same content as a fast scrolling page with a case-study page per project, a command palette (`Cmd/Ctrl K`), GitHub numbers baked at build time and a print-ready résumé.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · Lenis · three.js / React Three Fiber · Zustand · Howler · Web Audio · Canvas 2D · Ninja Adventure and Kenney art (CC0)

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
npm run build   # also refreshes content/github.json (keeps the old file if GitHub is unreachable)
npm run lint
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Click / tap | Walk there (and interact on arrival) |
| E / Enter | Talk, enter, interact |
| M | World map (fast travel) |
| G | Choose a world |
| V | Switch 2D / 3D |
| N | Toggle day / night (outdoor worlds) |
| Space | Swing your sword (dungeons and monster corners) |
| Esc | Close |

Touch devices get a virtual joystick and an action button.

## Project layout

```
app/                  routes: / (game), /quick, /quick/[id], /admin
components/game/      canvas engine, 3D view (three/), intro
components/ui/        title, loader, HUD, map, world select, travel, dialogue, toasts
components/art/       per-world layouts for the section cards
components/buildings/ section card shells
components/arcade/    the four minigames
components/quick/     Quick View page, case studies, generative project art
components/admin/     admin editor
content/              portfolio.json (single source of truth), github.json (generated)
lib/world/            world builders, interiors, exhibits, world registry
lib/ambience.ts       procedural ambient sound
lib/weather.ts        weather schedule and particles
public/na/, public/kenney/   art, music and sounds (CC0)
scripts/sync-github.mjs      build-time GitHub stats
```

## Credits

- Art, music and sounds: [Ninja Adventure asset pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) by Pixel-boy and AAA (CC0).
- City tiles, modern characters, vehicles and UI frames: [Kenney](https://kenney.nl) (CC0).
- Ambient sound is synthesised in the browser.
