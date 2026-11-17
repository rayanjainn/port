// Which item icon stands for what. Icons are the Ninja Adventure item set (public/ui/icons).
import type { Motif } from "@/lib/quick/motif"

/**
 * Skills read as equipment, by family:
 *  - systems languages are blades:        Rust sword, C++/C# axe, Go bow, Swift rapier, Java lance
 *  - scripting languages are casters:     TypeScript / JavaScript / Lua staff-and-scroll, Python spellbook
 *  - frameworks and runtimes are scrolls: UI (React, SwiftUI, Tailwind) ice, servers (Node, FastAPI) thunder,
 *                                         shells (Electron, Tauri) fire, ML (PyTorch) plant, testing (Playwright) rock
 *  - data stores are containers:          chest (SQL, Mongo) and potion (Redis, the fast one)
 *  - infra and delivery are tools:        hammer (Docker, CI), pickaxe (Kubernetes, Terraform), key (Linux, Workers)
 */
export function skillIcon(name: string, group: string): string {
  const n = name.toLowerCase()
  const rules: [RegExp, string][] = [
    [/rust/, "sword"], [/c\+\+|c#/, "axe"], [/^go$/, "bow"], [/swift$/, "rapier"], [/^java$/, "lance"],
    [/typescript|^javascript/, "magicwand"], [/lua/, "scroll-ice"], [/python/, "book"],
    [/next|react|tailwind|swiftui/, "scroll-ice"], [/node|bun|fastapi/, "scroll-thunder"], [/electron|tauri/, "scroll-fire"], [/pytorch/, "scroll-plant"], [/playwright/, "scroll-rock"],
    [/postgres|mongo|prisma/, "chest"], [/redis/, "potion"],
    [/docker|jenkins|actions/, "hammer"], [/kubernetes|terraform|ansible/, "pickaxe"], [/linux|cloudflare/, "key"],
  ]
  for (const [re, ic] of rules) if (re.test(n)) return ic
  return group.startsWith("Lang") ? "sword" : group.startsWith("Frame") ? "scroll" : "hammer"
}

/** A project's cover item, from its generative motif (the same one the Quick View art uses) */
export const MOTIF_ICON: Record<Motif, string> = {
  shield: "key", network: "scroll-thunder", pipeline: "hammer", api: "letter", cards: "stamp", wave: "fortune", terminal: "book", dial: "coin", neural: "magicwand",
  scan: "potion-water", hash: "scroll-rock", board: "katana", dock: "chest", grid: "scroll-plant", glitch: "scroll-fire", ledger: "cup-gold", tools: "pickaxe", mosaic: "heart",
}
