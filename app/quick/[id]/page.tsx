import type { Metadata } from "next"
import { notFound } from "next/navigation"
import content from "@/content/portfolio.json"
import CaseStudy from "@/components/quick/CaseStudy"

// Every project in content/portfolio.json gets a prerendered case study.
export const dynamicParams = false

export function generateStaticParams() {
  return content.projects.map((p) => ({ id: p.id }))
}

const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim()

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const p = content.projects.find((x) => x.id === id)
  if (!p) return {}
  const title = `${p.title}: ${p.tagline} · ${content.profile.name}`
  const description = `${p.tagline} ${firstSentence(p.description)}`.slice(0, 200)
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
    alternates: { canonical: `/quick/${p.id}` },
  }
}

export default async function CaseStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!content.projects.some((x) => x.id === id)) notFound()
  return <CaseStudy id={id} />
}
