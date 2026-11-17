import type { Metadata } from "next"
import content from "@/content/portfolio.json"
import "./quick.css"

export const metadata: Metadata = {
  title: `${content.profile.name} | Quick View`,
  description: content.meta.description,
  openGraph: { title: `${content.profile.name} | ${content.profile.title}`, description: content.meta.description, type: "profile" },
}

export default function QuickLayout({ children }: { children: React.ReactNode }) {
  return children
}
