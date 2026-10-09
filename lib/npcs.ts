// Village NPCs — sprites from the 54-column roguelike-characters sheet
export interface Npc {
  x: number   // tile col
  y: number   // tile row
  tile: number
}

// tile = row * 54 + col into roguelikeChar sheet
export const NPCS: Npc[] = [
  // NORTH side — civic district
  { x: 27, y: 11, tile: 324 }, // near townhall
  { x: 10, y: 12, tile: 378 }, // near academy
  { x: 47, y: 12, tile: 379 }, // near gallery
  { x: 34, y: 18, tile: 487 }, // near wizard
  { x: 18, y: 16, tile: 486 }, // meadow wanderer
  { x: 40, y: 17, tile: 540 }, // east meadow
  // SOUTH side — across the river
  { x: 13, y: 30, tile: 433 }, // near tavern
  { x: 42, y: 30, tile: 432 }, // near forge
  { x: 26, y: 28, tile: 325 }, // south meadow
  { x: 35, y: 35, tile: 376 }, // far south
]
