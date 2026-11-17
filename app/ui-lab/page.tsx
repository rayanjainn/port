import { notFound } from "next/navigation"
import Lab from "@/components/lab/Lab"

// Dev-only style guide: the whole kit for one world at a time (?world=village|city|desert|ruins)
export default function UILab() {
  if (process.env.NODE_ENV === "production") notFound()
  return <Lab />
}
