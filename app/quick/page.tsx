import QuickEntry from "@/components/quick/QuickEntry"
import { buildStats } from "@/lib/quick/github"

// Server component: the GitHub numbers and their relative dates are computed once, at build time.
export default function QuickPage() {
  return <QuickEntry stats={buildStats()} />
}
