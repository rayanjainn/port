"use client"
import { useState } from "react"
import { useContent } from "@/lib/content"
import { playSound } from "@/lib/audio"
import { useSection } from "@/lib/theme"
import { useGameStore } from "@/lib/store"
import { ProjectsInventory } from "@/components/art/Sheets"
import { Card, Chip, LinkBtn, LangDot, ProjectCover, Pill } from "./ui"
import { Button } from "@/components/ui/kit"
import { ArrowLeft, ExternalLink, Star, Check } from "lucide-react"
import { Github } from "@/components/icons"

export default function GalleryModal({ focus }: { focus?: string | null }) {
  const { projects } = useContent()
  const [sel, setSel] = useState<string | null>(focus ?? null)
  const proj = projects.find((p) => p.id === sel)
  const world = useGameStore((s) => s.world)
  const sec = useSection("gallery", { title: "THE GALLERY", sub: "Things I've built, hung on the wall" })


  const open = (id: string) => { playSound("click"); setSel(id) }

  if (proj) {
    return (
      <div style={{ padding: "22px clamp(16px, 3vw, 30px) 30px" }} className="fade-in sec gallery">
        <Button onClick={() => { playSound("click"); setSel(null) }} style={{ marginBottom: 18 }}>
          <ArrowLeft size={13} /> ALL EXHIBITS
        </Button>

        <div className="art-hero" style={{ marginBottom: 22 }}>
          <ProjectCover p={proj} height={210} big />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          {proj.featured && <Pill bg={sec.accent}><Star size={9} fill="currentColor" /> FEATURED</Pill>}
          <Pill>{proj.year}</Pill>
          <LangDot lang={proj.language} />
        </div>
        <div className="art-tag">{proj.tagline}</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.65, color: "var(--u-body)", margin: "14px 0 20px" }}>{proj.description}</p>

        {proj.highlights.length > 0 && (
          <Card style={{ padding: "16px 18px", marginBottom: 20 }} accent={proj.accent}>
            <div style={{ fontFamily: "var(--font-head)", fontSize: 8, letterSpacing: 1, color: "var(--u-muted)", marginBottom: 12 }}>LOOT</div>
            <div style={{ display: "grid", gap: 10 }}>
              {proj.highlights.map((h) => (
                <div key={h} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "var(--font-body)", fontSize: 16, color: "var(--u-ink)" }}>
                  <span style={{ flexShrink: 0, marginTop: 2, width: 18, height: 18, background: `color-mix(in srgb, ${proj.accent} 75%, #000)`, border: "2px solid var(--u-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <Check size={11} strokeWidth={4} />
                  </span>
                  {h}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
          {proj.tech.map((t) => <Chip key={t} color={proj.accent}>{t}</Chip>)}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {proj.liveUrl && <LinkBtn href={proj.liveUrl} primary color={sec.accent}><ExternalLink size={13} /> VISIT LIVE</LinkBtn>}
          {proj.githubUrl && <LinkBtn href={proj.githubUrl} primary={!proj.liveUrl} color="var(--u-dark-2)"><Github size={13} /> SOURCE</LinkBtn>}
        </div>
      </div>
    )
  }

  return (
    <div className="sec gallery">
      <ProjectsInventory world={world} onOpen={open} />
    </div>
  )
}
