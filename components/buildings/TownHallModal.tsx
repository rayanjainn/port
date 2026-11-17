"use client"
import { useGameStore } from "@/lib/store"
import { AboutSheet } from "@/components/art/Sheets"

/** About: a character sheet (village), harbor ID pass (city), cartouche stele (desert), keeper's plaque (ruins) */
export default function TownHallModal() {
  const world = useGameStore((s) => s.world)
  return <AboutSheet world={world} />
}
