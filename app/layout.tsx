import type { Metadata, Viewport } from "next"
import { Press_Start_2P, Pixelify_Sans, VT323, Inter, JetBrains_Mono, Space_Grotesk, Geist, Geist_Mono } from "next/font/google"
import content from "@/content/portfolio.json"
import "./globals.css"

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--ff-pixel", display: "swap" })
const pixelify = Pixelify_Sans({ subsets: ["latin"], variable: "--ff-pixelify", display: "swap" })
const vt = VT323({ weight: "400", subsets: ["latin"], variable: "--ff-vt", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--ff-inter", display: "swap" })
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--ff-grotesk", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--ff-jb", display: "swap" })
const geist = Geist({ subsets: ["latin"], variable: "--ff-geist", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--ff-geist-mono", display: "swap" })

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: content.meta.siteTitle,
  description: content.meta.description,
  openGraph: {
    title: content.meta.siteTitle,
    description: content.meta.description,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: content.meta.siteTitle, description: content.meta.description },
}

export const viewport: Viewport = {
  themeColor: "#0b0f1f",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${pixel.variable} ${pixelify.variable} ${vt.variable} ${inter.variable} ${grotesk.variable} ${mono.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
