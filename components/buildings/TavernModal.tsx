"use client"
import { useGameStore } from "@/lib/store"
import { QuestLog } from "@/components/art/Sheets"

/** Experience: quest log (village), metro line (city), caravan route (desert), ghost stories (ruins) */
export default function TavernModal() {
  const world = useGameStore((s) => s.world)
  return <QuestLog world={world} />
}
