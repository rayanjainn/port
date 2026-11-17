"use client"
import { useState } from "react"
import { useContent } from "@/lib/content"
import { playSound } from "@/lib/audio"
import { useSection } from "@/lib/theme"
import { SectionHeader, Card, Chip, LinkBtn, LangDot, ProjectCover, Pill } from "./ui"
import { Button } from "@/components/ui/kit"
import { Images, ArrowLeft, ExternalLink, Star, Check, ChevronRight } from "lucide-react"
import { Github } from "@/components/icons"

export default function GalleryModal({ focus }: { focus?: string | null }) {
  const { projects } = useContent()
  const [sel, setSel] = useState<string | null>(focus ?? null)
  const [filter, setFilter] = useState("All")
  const proj = projects.find((p) => p.id === sel)
  const sec = useSection("gallery", { title: "THE GALLERY", sub: "Things I've built, hung on the wall" })

  const cats = ["All", ...Array.from(new Set(projects.map((p) => p.category)))]
  const featured = projects.filter((p) => p.featured)
  const list = projects.filter((p) => filter === "All" || p.category === filter)

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
    <div className="sec gallery" style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<Images size={22} />} accent={sec.accent} kicker={sec.kicker}
        title={sec.title} subtitle={sec.sub}
        right={<Pill>{projects.length} EXHIBITS</Pill>}
      />

      {/* featured spotlight */}
      {featured[0] && filter === "All" && (
        <Card hover onClick={() => open(featured[0].id)} className="art art-spot" style={{ marginBottom: 18 }}>
          <div className="art-cover art-spot__cover"><ProjectCover p={featured[0]} height="100%" big /></div>
          <div className="art-body art-spot__body">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill bg={sec.accent}><Star size={9} fill="currentColor" /> MASTERPIECE</Pill>
              <LangDot lang={featured[0].language} />
            </div>
            <div className="art-tag" style={{ fontSize: 18 }}>{featured[0].tagline}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--u-body)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {featured[0].description}
            </div>
            <div className="art-go">INSPECT <ChevronRight size={12} /></div>
          </div>
        </Card>
      )}

      {/* filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {cats.map((c) => (
          <Button key={c} variant={filter === c ? "accent" : "plain"} accent={sec.accent} className="gal-filter" aria-pressed={filter === c} onClick={() => { playSound("click"); setFilter(c) }}>{c}</Button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
        {list.filter((p) => !(filter === "All" && p.id === featured[0]?.id)).map((p, i) => (
          <Card key={p.id} hover onClick={() => open(p.id)} className="art" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="art-cover">
              <ProjectCover p={p} height={112} />
            </div>
            <div className="art-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <LangDot lang={p.language} />
                {p.featured && <Star size={14} color="var(--u-accent2)" fill="var(--u-accent2)" />}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--u-body)", lineHeight: 1.45, minHeight: 44 }}>{p.tagline}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                {p.tech.slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}
                {p.tech.length > 3 && <Chip>+{p.tech.length - 3}</Chip>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
