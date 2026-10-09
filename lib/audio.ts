import { Howl } from "howler"
import { useGameStore } from "./store"

const BASE = "/audio/Audio/"

const sounds = {
  click: new Howl({ src: [`${BASE}click_001.ogg`], volume: 0.4 }),
  open: new Howl({ src: [`${BASE}confirmation_001.ogg`], volume: 0.5 }),
  close: new Howl({ src: [`${BASE}close_001.ogg`], volume: 0.3 }),
  achievement: new Howl({ src: [`${BASE}confirmation_004.ogg`], volume: 0.6 }),
  step: new Howl({ src: [`${BASE}drop_001.ogg`], volume: 0.15 }),
  error: new Howl({ src: [`${BASE}error_001.ogg`], volume: 0.3 }),
  bong: new Howl({ src: [`${BASE}bong_001.ogg`], volume: 0.4 }),
}

export function playSound(name: keyof typeof sounds) {
  if (typeof window === "undefined") return
  if (!useGameStore.getState().sfxEnabled) return
  try { sounds[name].play() } catch {}
}
