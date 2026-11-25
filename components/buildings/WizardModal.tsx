"use client"
import { useGameStore } from "@/lib/store"
import { ContactCard } from "@/components/art/Cards"

/** Contact: letter (village), phone chat (city), falcon post (desert), whisper lantern (ruins) */
export default function WizardModal() {
  const world = useGameStore((s) => s.world)
  return <ContactCard world={world} />
}
