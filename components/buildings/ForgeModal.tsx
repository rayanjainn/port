"use client"
import { useGameStore } from "@/lib/store"
import { SkillsCard } from "@/components/art/Cards"

/** Skills: forge racks (village), system settings (city), merchant's ledger (desert), spell book (ruins) */
export default function ForgeModal({ focus }: { focus?: string | null }) {
  const world = useGameStore((s) => s.world)
  return <SkillsCard world={world} focus={focus} />
}
