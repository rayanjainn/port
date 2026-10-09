"use client"
import { useState } from "react"
import { useContent } from "@/lib/content"
import { playSound } from "@/lib/audio"
import { SectionHeader, Card, Chip, LinkBtn, LangDot, ProjectCover, INK, Pill } from "./ui"
import { Images, ArrowLeft, ExternalLink, Star, Check, ChevronRight } from "lucide-react"
import { Github } from "@/components/icons"

const PURPLE = "#7c5cba"

export default function GalleryModal({ focus }: { focus?: string | null }) {
  const { projects } = useContent()
  const [sel, setSel] = useState<string | null>(focus ?? null)
  const [filter, setFilter] = useState("All")
  const proj = projects.find((p) => p.id === sel)

  const cats = ["All", ...Array.from(new Set(projects.map((p) => p.category)))]
  const featured = projects.filter((p) => p.featured)
  const list = projects.filter((p) => filter === "All" || p.category === filter)

  const open = (id: string) => { playSound("click"); setSel(id) }

  if (proj) {
    return (
      <div style={{ padding: "22px clamp(16px, 3vw, 30px) 30px" }} className="fade-in">
        <button onClick={() => { playSound("click"); setSel(null) }} className="parch-btn" style={{
          display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
          fontFamily: "var(--font-pixel)", fontSize: 8, padding: "9px 12px", cursor: "pointer",
          background: INK.cardAlt, color: INK.ink, border: `2px solid ${INK.ink}`, boxShadow: `0 3px 0 ${INK.ink}`,
        }}>
          <ArrowLeft size={13} /> ALL EXHIBITS
        </button>

        <div style={{ border: `3px solid ${INK.ink}`, boxShadow: `0 5px 0 ${INK.ink}`, marginBottom: 22 }}>
          <ProjectCover p={proj} height={210} big />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          {proj.featured && <Pill bg={PURPLE}><Star size={9} fill="currentColor" /> FEATURED</Pill>}
          <Pill>{proj.year}</Pill>
          <LangDot lang={proj.language} />
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(20px, 2.6vw, 26px)", fontWeight: 700, color: INK.ink, lineHeight: 1.25 }}>
          {proj.tagline}
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.65, color: INK.body, margin: "14px 0 20px" }}>{proj.description}</p>

        {proj.highlights.length > 0 && (
          <Card style={{ padding: "16px 18px", marginBottom: 20 }} accent={proj.accent}>
            <div style={{ fontFamily: "var(--font-pixel)", fontSize: 8, letterSpacing: 1, color: INK.muted, marginBottom: 12 }}>LOOT</div>
            <div style={{ display: "grid", gap: 10 }}>
              {proj.highlights.map((h) => (
                <div key={h} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: "var(--font-body)", fontSize: 16, color: INK.ink }}>
                  <span style={{ flexShrink: 0, marginTop: 2, width: 18, height: 18, background: proj.accent, border: `2px solid ${INK.ink}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
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
          {proj.liveUrl && <LinkBtn href={proj.liveUrl} primary color={PURPLE}><ExternalLink size={13} /> VISIT LIVE</LinkBtn>}
          {proj.githubUrl && <LinkBtn href={proj.githubUrl} primary={!proj.liveUrl} color={INK.ink}><Github size={13} /> SOURCE</LinkBtn>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "26px clamp(16px, 3vw, 30px) 30px" }}>
      <SectionHeader
        icon={<Images size={22} />} accent={PURPLE}
        title="THE GALLERY" subtitle="Things I've built, hung on the wall"
        right={<Pill>{projects.length} EXHIBITS</Pill>}
      />

      {/* featured spotlight */}
      {featured[0] && filter === "All" && (
        <div onClick={() => open(featured[0].id)} className="parch-card-hover spotlight" style={{
          display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", cursor: "pointer",
          border: `3px solid ${INK.ink}`, boxShadow: `0 4px 0 ${INK.lineDk}`, background: INK.card, marginBottom: 18,
        }} >
          <div style={{ minHeight: 200 }}><ProjectCover p={featured[0]} height="100%" big /></div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, borderLeft: `3px solid ${INK.ink}` }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill bg={PURPLE}><Star size={9} fill="currentColor" /> MASTERPIECE</Pill>
              <LangDot lang={featured[0].language} />
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 18, fontWeight: 700, color: INK.ink, lineHeight: 1.3 }}>{featured[0].tagline}</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: INK.body, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {featured[0].description}
            </div>
            <div style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-pixel)", fontSize: 8, color: PURPLE }}>
              INSPECT <ChevronRight size={12} />
            </div>
          </div>
        </div>
      )}

      {/* filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {cats.map((c) => (
          <button key={c} onClick={() => { playSound("click"); setFilter(c) }} style={{
            fontFamily: "var(--font-body)", fontSize: 14, padding: "6px 11px", cursor: "pointer",
            background: filter === c ? INK.ink : "transparent", color: filter === c ? INK.cream : INK.body,
            border: `2px solid ${filter === c ? INK.ink : INK.line}`,
          }}>{c}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
        {list.filter((p) => !(filter === "All" && p.id === featured[0]?.id)).map((p, i) => (
          <Card key={p.id} hover onClick={() => open(p.id)} style={{ overflow: "hidden", animationDelay: `${i * 40}ms` }}>
            <div style={{ borderBottom: `2px solid ${INK.lineDk}` }}>
              <ProjectCover p={p} height={112} />
            </div>
            <div style={{ padding: "12px 14px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <LangDot lang={p.language} />
                {p.featured && <Star size={14} color={PURPLE} fill={PURPLE} />}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 15, color: INK.body, lineHeight: 1.45, minHeight: 44 }}>{p.tagline}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
                {p.tech.slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}
                {p.tech.length > 3 && <Chip>+{p.tech.length - 3}</Chip>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <style>{`@media (max-width: 640px) { .spotlight { grid-template-columns: 1fr !important; } .spotlight > div:last-child { border-left: none !important; border-top: 3px solid ${INK.ink}; } }`}</style>
    </div>
  )
}
