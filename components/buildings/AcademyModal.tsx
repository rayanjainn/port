"use client"
import { useGameStore } from "@/lib/store"
import { HonoursCard } from "@/components/art/Cards"

/** Education & honours: trophy room (village), leaderboard (city), treasure vault (desert), hall of lanterns (ruins) */
export default function AcademyModal({ focus }: { focus?: string | null }) {
  const world = useGameStore((s) => s.world)
  return <HonoursCard world={world} focus={focus} />
}
