// Composes the player character from the paper-doll layers in the
// roguelike-characters sheet: skin, pants, shoes, shirt, hair.
export const CHAR_SHEET = "/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png"

const HERO_LAYERS: [number, number][] = [[0, 1], [3, 0], [4, 0], [10, 0], [23, 4]]

export function composeHero(sheet: HTMLImageElement, layers = HERO_LAYERS): HTMLCanvasElement {
  const cv = document.createElement("canvas")
  cv.width = 16; cv.height = 16
  const ctx = cv.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  for (const [c, r] of layers) ctx.drawImage(sheet, c * 17, r * 17, 16, 16, 0, 0, 16, 16)
  return cv
}
