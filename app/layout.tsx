import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Rayan Jain — Portfolio",
  description: "Full-stack developer portfolio — explore the world",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
