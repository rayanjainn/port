import { Howl } from "howler"
import { useGameStore } from "./store"

const SFX = "/na/sfx/"
const mk = (f: string, volume: number) => (typeof window === "undefined" ? null : new Howl({ src: [`${SFX}${f}.wav`], volume }))

const sounds = {
  click: mk("menu1", 0.35),
  open: mk("accept", 0.4),
  close: mk("cancel", 0.35),
  achievement: mk("success1", 0.5),
  bong: mk("powerup1", 0.45),
  error: mk("hit", 0.35),
  coin: mk("coin", 0.45),
  bonus: mk("bonus", 0.45),
  hit: mk("hit", 0.4),
  kill: mk("kill", 0.4),
  sword: mk("sword", 0.35),
  secret: mk("secret1", 0.5),
  talk: mk("voice1", 0.25),
  talk2: mk("voice2", 0.25),
  magic: mk("magic1", 0.4),
  jump: mk("jump", 0.35),
  gameover: mk("gameover", 0.45),
  menu: mk("menu6", 0.3),
}
export type SoundName = keyof typeof sounds

export function playSound(name: SoundName) {
  if (typeof window === "undefined") return
  if (!useGameStore.getState().sfxEnabled) return
  try { sounds[name]?.play() } catch {}
}

// ── music ──────────────────────────────────────────────────────
type Track = "village" | "dungeon" | "chill"
const tracks: Partial<Record<Track, Howl>> = {}
let current: Track | null = null

function track(t: Track) {
  if (!tracks[t]) tracks[t] = new Howl({ src: [`/na/music/${t}.ogg`], loop: true, volume: 0, html5: true })
  return tracks[t]!
}

export function playMusic(t: Track) {
  if (typeof window === "undefined") return
  const enabled = useGameStore.getState().musicEnabled
  if (current === t && tracks[t]?.playing()) return
  if (current && tracks[current]) {
    const old = tracks[current]!
    old.fade(old.volume(), 0, 600)
    setTimeout(() => old.pause(), 650)
  }
  current = t
  if (!enabled) return
  const h = track(t)
  if (!h.playing()) h.play()
  h.fade(h.volume(), 0.32, 900)
}

export function setMusicEnabled(on: boolean) {
  if (!current) return
  const h = track(current)
  if (on) { if (!h.playing()) h.play(); h.fade(h.volume(), 0.32, 500) }
  else { h.fade(h.volume(), 0, 400); setTimeout(() => h.pause(), 450) }
}
