// Bridge between the simulation (GameCanvas) and the renderers. The 2D loop owns
// the state; the 3D view only reads it and calls back into the shared pointer logic.
import type { WorldSelectOrigin } from "@/lib/store"
import type { Scene, ActorDef, Facing, Hotspot, SolidIndex } from "@/lib/world/core"

export interface ActorRT {
  def: ActorDef
  x: number; y: number
  facing: Facing
  animT: number
  moving: boolean
  tx: number | null; ty: number | null
  idle: number
  talkT: number
  barkI: number
  hurt: number
  dead: number
}

export interface SceneRT {
  scene: Scene
  solids: SolidIndex
  actors: ActorRT[]
}

/** x / y in scene px. `gy` is the ground line (px) the particle spawned on, so 3D can derive its height. */
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; size: number; kind?: "smoke"; gy?: number }

export interface HeroState {
  x: number; y: number
  facing: Facing
  animT: number
  moving: boolean
  attackT: number
  hurtT: number
  path: { x: number; y: number }[]
  pending: Hotspot | null
  pendingNpc: ActorRT | null
}

export interface EngineState {
  scene: string
  hero: HeroState
  keys: Record<string, boolean>
  cam: { x: number; y: number; init: boolean }
  particles: Particle[]
  fade: { a: number; dir: 1 | -1; then: (() => void) | null }
  near: Hotspot | null
  nearNpc: ActorRT | null
  returnTo: { x: number; y: number; scene?: string } | null
  chests: Set<string>
  ready: boolean
  last: number
  scale: number
}

export const engine = {
  /** live simulation state (same object GameCanvas mutates) */
  state: null as EngineState | null,
  /** built scene runtimes by id */
  scenes: {} as Record<string, SceneRT>,
  /** seconds, simulation clock of the last frame */
  now: 0,
  /** true while a dialog / map / fade freezes the world */
  paused: false,
  /** click-to-walk / click-to-interact at a scene-px position */
  click: (wx: number, wy: number) => { void wx; void wy },
  /** the E key: talk to / use whatever is nearest */
  interact: () => { /* replaced by GameCanvas */ },
  /** load (once) and build a world's scenes; resolves false if the world is not registered */
  ensureWorld: (id: string) => { void id; return Promise.resolve(false) },
  /** swap the active world without a fade; `arrive` lands at the travel point instead of the spawn */
  enterWorld: (id: string, mode?: "spawn" | "arrive") => { void id; void mode; return false },
  /** the world-select screen made a choice */
  chooseWorld: (id: string, origin: WorldSelectOrigin) => { void id; void origin },
}
