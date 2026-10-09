"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { PUBLISHED, DRAFT_KEY, LANG_COLORS, type Portfolio, type Project, type Experience, type Education, type Achievement } from "@/lib/content"
import { fetchRepos, projectFromRepo, publishContent, type Repo } from "@/lib/github"
import { Field, Text, Area, Tags, Lines, Toggle, ColorPick, Card, Btn, LinkBtn, inputCls } from "./fields"
import {
  User, AtSign, FolderGit2, Briefcase, GraduationCap, Medal, Wrench, Rocket, Eye, RotateCcw, Download, Upload,
  ChevronUp, ChevronDown, Trash2, Plus, Star, RefreshCw, Search, Check, ExternalLink, Copy, KeyRound, Pencil, X, Gamepad2, LayoutList,
} from "lucide-react"
import { Github } from "@/components/icons"

type Tab = "profile" | "socials" | "projects" | "experience" | "education" | "achievements" | "skills" | "publish"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User size={16} /> },
  { id: "socials", label: "Links", icon: <AtSign size={16} /> },
  { id: "projects", label: "Projects", icon: <FolderGit2 size={16} /> },
  { id: "experience", label: "Experience", icon: <Briefcase size={16} /> },
  { id: "education", label: "Education", icon: <GraduationCap size={16} /> },
  { id: "achievements", label: "Honours", icon: <Medal size={16} /> },
  { id: "skills", label: "Skills", icon: <Wrench size={16} /> },
  { id: "publish", label: "Publish", icon: <Rocket size={16} /> },
]

const TOKEN_KEY = "rayan-world:gh-token"
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

export default function Admin() {
  const [data, setData] = useState<Portfolio>(PUBLISHED)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>("projects")
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY)
      // localStorage only exists after hydration, so the draft is loaded on mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (d) setData({ ...PUBLISHED, ...(JSON.parse(d) as Portfolio) })
    } catch {}
    setLoaded(true)
  }, [])

  // autosave draft
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); setSavedAt(Date.now()) } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [data, loaded])

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(PUBLISHED), [data])
  const set = <K extends keyof Portfolio>(k: K, v: Portfolio[K]) => setData((d) => ({ ...d, [k]: v }))

  const reset = () => {
    if (!confirm("Discard all unpublished changes and reload the published content?")) return
    localStorage.removeItem(DRAFT_KEY)
    setData(PUBLISHED)
  }

  return (
    <div className="min-h-dvh bg-[#0a0916] text-white font-sans">
      <div className="pointer-events-none fixed inset-0 opacity-30" style={{ background: "radial-gradient(900px 500px at 10% -10%, rgba(192,123,255,.25), transparent), radial-gradient(700px 400px at 100% 0%, rgba(255,215,106,.12), transparent)" }} />

      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0a0916]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-pixel text-[9px] tracking-[0.2em] text-[#ffe7b0]">
            <span className="h-2.5 w-2.5 bg-[#ffd76a] shadow-[0_0_12px_#ffb347]" /> EDITOR
          </Link>
          <span className={`ml-2 hidden items-center gap-2 rounded-full px-2.5 py-1 text-xs sm:inline-flex ${dirty ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dirty ? "bg-amber-300" : "bg-emerald-300"}`} />
            {dirty ? "Unpublished changes" : "In sync with live site"}
          </span>
          {savedAt && <span className="hidden text-xs text-white/35 md:inline">Draft autosaved in this browser</span>}
          <div className="ml-auto flex items-center gap-2">
            <LinkBtn href="/?preview" title="Preview the game with this draft"><Gamepad2 size={15} /><span className="hidden sm:inline">Preview game</span></LinkBtn>
            <LinkBtn href="/quick?preview" title="Preview quick view with this draft"><Eye size={15} /><span className="hidden sm:inline">Preview page</span></LinkBtn>
            <Btn variant="primary" onClick={() => setTab("publish")}><Rocket size={15} /> Publish</Btn>
          </div>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        {/* sidebar */}
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-22 lg:flex-col lg:self-start dark-scroll">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${tab === t.id ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white"}`}>
              <span className={tab === t.id ? "text-[#ffd76a]" : ""}>{t.icon}</span>{t.label}
              {t.id === "projects" && <span className="ml-auto rounded-md bg-white/[0.06] px-1.5 text-xs text-white/50">{data.projects.length}</span>}
            </button>
          ))}
          <div className="mt-4 hidden border-t border-white/[0.07] pt-4 lg:block">
            <Btn variant="danger" onClick={reset} className="w-full" disabled={!dirty}><RotateCcw size={14} /> Discard draft</Btn>
          </div>
        </nav>

        <main className="min-w-0">
          {tab === "profile" && <ProfileTab data={data} set={set} />}
          {tab === "socials" && <SocialsTab data={data} set={set} />}
          {tab === "projects" && <ProjectsTab data={data} set={set} />}
          {tab === "experience" && <ExperienceTab data={data} set={set} />}
          {tab === "education" && <EducationTab data={data} set={set} />}
          {tab === "achievements" && <AchievementsTab data={data} set={set} />}
          {tab === "skills" && <SkillsTab data={data} set={set} />}
          {tab === "publish" && <PublishTab data={data} setData={setData} dirty={dirty} />}
        </main>
      </div>
    </div>
  )
}

type SetFn = <K extends keyof Portfolio>(k: K, v: Portfolio[K]) => void

function Header({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-white/50">{sub}</p>
      </div>
      {right}
    </div>
  )
}

// ── Profile ─────────────────────────────────────────────────────
function ProfileTab({ data, set }: { data: Portfolio; set: SetFn }) {
  const p = data.profile
  const up = (patch: Partial<Portfolio["profile"]>) => set("profile", { ...p, ...patch })
  return (
    <>
      <Header title="Profile" sub="Shown in the Town Hall, title screen and the quick view hero." />
      <Card className="p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.avatar} alt="" className="h-16 w-16 rounded-xl border border-white/10 object-cover" />
          <div className="flex-1"><Field label="Avatar URL" hint="/images/… or https://…"><Text value={p.avatar} onChange={(v) => up({ avatar: v })} /></Field></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Text value={p.name} onChange={(v) => up({ name: v })} /></Field>
          <Field label="Handle"><Text value={p.handle} onChange={(v) => up({ handle: v })} /></Field>
          <Field label="Title"><Text value={p.title} onChange={(v) => up({ title: v })} /></Field>
          <Field label="Location"><Text value={p.location} onChange={(v) => up({ location: v })} /></Field>
          <Field label="Tagline" hint="typed out on the title screen" span={2}><Text value={p.tagline} onChange={(v) => up({ tagline: v })} /></Field>
          <Field label="Bio" span={2}><Area value={p.bio} onChange={(v) => up({ bio: v })} rows={4} /></Field>
          <Field label="Currently working on" span={2}><Text value={p.now} onChange={(v) => up({ now: v })} /></Field>
          <Field label="Motto"><Text value={p.motto} onChange={(v) => up({ motto: v })} /></Field>
          <Field label="Interests" hint="comma separated"><Tags value={p.interests} onChange={(v) => up({ interests: v })} /></Field>
          <Field label="Availability line"><Text value={p.availability} onChange={(v) => up({ availability: v })} /></Field>
          <Field label="Resume URL" hint="optional"><Text value={p.resumeUrl} onChange={(v) => up({ resumeUrl: v })} placeholder="/resume.pdf" /></Field>
          <div className="sm:col-span-2"><Toggle checked={p.available} onChange={(v) => up({ available: v })} label="Show “available” badge" /></div>
        </div>
      </Card>
    </>
  )
}

function SocialsTab({ data, set }: { data: Portfolio; set: SetFn }) {
  const s = data.socials
  const up = (patch: Partial<Portfolio["socials"]>) => set("socials", { ...s, ...patch })
  return (
    <>
      <Header title="Links" sub="Leave a field empty to hide it everywhere." />
      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Email"><Text value={s.email} onChange={(v) => up({ email: v })} type="email" /></Field>
        <Field label="GitHub"><Text value={s.github} onChange={(v) => up({ github: v })} /></Field>
        <Field label="LinkedIn"><Text value={s.linkedin} onChange={(v) => up({ linkedin: v })} /></Field>
        <Field label="X / Twitter"><Text value={s.twitter} onChange={(v) => up({ twitter: v })} /></Field>
        <Field label="Website"><Text value={s.website} onChange={(v) => up({ website: v })} /></Field>
        <Field label="GitHub username" hint="used to import repos"><Text value={data.meta.githubUsername} onChange={(v) => set("meta", { ...data.meta, githubUsername: v })} /></Field>
      </Card>
    </>
  )
}

// ── Projects ────────────────────────────────────────────────────
function ProjectsTab({ data, set }: { data: Portfolio; set: SetFn }) {
  const [repos, setRepos] = useState<Repo[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [q, setQ] = useState("")
  const [showForks, setShowForks] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const projects = data.projects
  const setProjects = (v: Project[]) => set("projects", v)

  const load = async () => {
    setLoading(true); setErr("")
    try {
      let token: string | undefined
      try { token = localStorage.getItem(TOKEN_KEY) ?? undefined } catch {}
      setRepos(await fetchRepos(data.meta.githubUsername, token))
    } catch (e) { setErr((e as Error).message) }
    setLoading(false)
  }

  const selectedRepos = new Set(projects.map((p) => p.repo.toLowerCase()))
  const toggleRepo = (r: Repo) => {
    if (selectedRepos.has(r.name.toLowerCase())) setProjects(projects.filter((p) => p.repo.toLowerCase() !== r.name.toLowerCase()))
    else setProjects([...projects, projectFromRepo(r, projects.length)])
  }
  const list = (repos ?? [])
    .filter((r) => showForks || !r.fork)
    .filter((r) => !q || `${r.name} ${r.description ?? ""} ${r.language ?? ""}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <Header title="Projects" sub="Only the projects listed here appear on the site, in this order. The first featured one is the Gallery's masterpiece."
        right={<Btn onClick={() => { const p: Project = { ...projectFromRepo({ name: "new-project", full_name: "", description: "", html_url: "", homepage: "", language: "", stargazers_count: 0, forks_count: 0, fork: false, archived: false, created_at: String(new Date().getFullYear()), pushed_at: "" }, projects.length), id: uid("p"), repo: "", title: "New project" }; setProjects([p, ...projects]); setEditing(p.id) }}><Plus size={15} /> Custom project</Btn>} />

      {/* selected */}
      <div className="space-y-2.5">
        {projects.length === 0 && <Card className="p-8 text-center text-white/50">No projects selected yet. Import some from GitHub below.</Card>}
        {projects.map((p, i) => (
          <Card key={p.id} className={`overflow-hidden ${editing === p.id ? "border-[#ffd76a]/40" : ""}`}>
            <div className="flex items-center gap-3 p-3 sm:p-4">
              <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: p.accent }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.title}</span>
                  {p.featured && <Star size={13} className="shrink-0 fill-[#ffd76a] text-[#ffd76a]" />}
                  {p.language && <span className="hidden items-center gap-1 text-xs text-white/40 sm:inline-flex"><span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[p.language] ?? "#888" }} />{p.language}</span>}
                </div>
                <div className="truncate text-sm text-white/45">{p.tagline || <em className="text-white/25">no tagline</em>}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Btn variant="soft" title={p.featured ? "Unfeature" : "Feature"} onClick={() => setProjects(projects.map((x) => x.id === p.id ? { ...x, featured: !x.featured } : x))} className="!px-2">
                  <Star size={15} className={p.featured ? "fill-[#ffd76a] text-[#ffd76a]" : ""} />
                </Btn>
                <Btn variant="soft" title="Move up" onClick={() => setProjects(move(projects, i, -1))} disabled={i === 0} className="!px-2"><ChevronUp size={15} /></Btn>
                <Btn variant="soft" title="Move down" onClick={() => setProjects(move(projects, i, 1))} disabled={i === projects.length - 1} className="!px-2"><ChevronDown size={15} /></Btn>
                <Btn variant="soft" title="Edit" onClick={() => setEditing(editing === p.id ? null : p.id)} className="!px-2">{editing === p.id ? <X size={15} /> : <Pencil size={15} />}</Btn>
                <Btn variant="danger" title="Remove from site" onClick={() => setProjects(projects.filter((x) => x.id !== p.id))} className="!px-2"><Trash2 size={15} /></Btn>
              </div>
            </div>
            {editing === p.id && <ProjectForm p={p} onChange={(np) => setProjects(projects.map((x) => x.id === p.id ? np : x))} />}
          </Card>
        ))}
      </div>

      {/* import */}
      <Card className="mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Github size={18} />
            <div>
              <div className="font-medium">Import from GitHub</div>
              <div className="text-sm text-white/45">Pick which of @{data.meta.githubUsername}&apos;s repos show up. Imported details are a starting point you can edit.</div>
            </div>
          </div>
          <Btn variant="primary" onClick={load} disabled={loading} className="ml-auto">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {repos ? "Refresh" : "Load repositories"}
          </Btn>
        </div>
        {err && <div className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{err}</div>}
        {repos && (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input className={`${inputCls} pl-9`} placeholder="Search repositories…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Toggle checked={showForks} onChange={setShowForks} label="Show forks" />
              <span className="text-sm text-white/40">{list.length} repos</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {list.map((r) => {
                const on = selectedRepos.has(r.name.toLowerCase())
                return (
                  <button key={r.full_name} onClick={() => toggleRepo(r)}
                    className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition ${on ? "border-[#ffd76a]/40 bg-[#ffd76a]/[0.06]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${on ? "border-[#ffd76a] bg-[#ffd76a] text-[#2a1606]" : "border-white/25"}`}>
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{r.name}</span>
                        {r.fork && <span className="rounded bg-white/10 px-1.5 text-[10px] text-white/50">fork</span>}
                        {r.homepage && <span className="rounded bg-emerald-400/10 px-1.5 text-[10px] text-emerald-300">live</span>}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-sm text-white/45">{r.description || "No description"}</span>
                      <span className="mt-1.5 flex items-center gap-3 text-xs text-white/40">
                        {r.language && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[r.language] ?? "#888" }} />{r.language}</span>}
                        {r.stargazers_count > 0 && <span>★ {r.stargazers_count}</span>}
                        <span>updated {r.pushed_at.slice(0, 10)}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </Card>
    </>
  )
}

function ProjectForm({ p, onChange }: { p: Project; onChange: (p: Project) => void }) {
  const up = (patch: Partial<Project>) => onChange({ ...p, ...patch })
  return (
    <div className="grid gap-4 border-t border-white/[0.07] bg-black/20 p-4 sm:grid-cols-2 sm:p-5">
      <Field label="Title"><Text value={p.title} onChange={(v) => up({ title: v })} /></Field>
      <Field label="Category" hint="used for gallery filters"><Text value={p.category} onChange={(v) => up({ category: v })} placeholder="Systems, Platform, ML…" /></Field>
      <Field label="Tagline" hint="one punchy line" span={2}><Text value={p.tagline} onChange={(v) => up({ tagline: v })} /></Field>
      <Field label="Description" span={2}><Area value={p.description} onChange={(v) => up({ description: v })} rows={4} /></Field>
      <Field label="Highlights" hint="one per line" span={2}><Lines value={p.highlights} onChange={(v) => up({ highlights: v })} /></Field>
      <Field label="Tech" hint="comma separated"><Tags value={p.tech} onChange={(v) => up({ tech: v })} /></Field>
      <Field label="Main language"><Text value={p.language} onChange={(v) => up({ language: v })} /></Field>
      <Field label="Live URL"><Text value={p.liveUrl} onChange={(v) => up({ liveUrl: v })} placeholder="https://" /></Field>
      <Field label="Source URL"><Text value={p.githubUrl} onChange={(v) => up({ githubUrl: v })} placeholder="https://github.com/…" /></Field>
      <Field label="Year"><Text value={p.year} onChange={(v) => up({ year: v })} /></Field>
      <Field label="Cover image URL" hint="optional, else generated"><Text value={p.image} onChange={(v) => up({ image: v })} placeholder="https://…/cover.png" /></Field>
      <Field label="Accent colour" span={2}><ColorPick value={p.accent} onChange={(v) => up({ accent: v })} /></Field>
      <div className="sm:col-span-2"><Toggle checked={p.featured} onChange={(v) => up({ featured: v })} label="Featured" /></div>
    </div>
  )
}

// ── Generic list editor for experience / education / honours ────
function ListTab<T extends { id: string }>({ title, sub, items, onChange, blank, summary, form }: {
  title: string; sub: string; items: T[]; onChange: (v: T[]) => void; blank: () => T
  summary: (t: T) => { title: string; sub: string }; form: (t: T, up: (patch: Partial<T>) => void) => React.ReactNode
}) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Header title={title} sub={sub} right={<Btn onClick={() => { const b = blank(); onChange([b, ...items]); setOpen(b.id) }}><Plus size={15} /> Add</Btn>} />
      <div className="space-y-2.5">
        {items.length === 0 && <Card className="p-8 text-center text-white/50">Nothing here yet.</Card>}
        {items.map((it, i) => {
          const s = summary(it)
          return (
            <Card key={it.id} className={open === it.id ? "border-[#ffd76a]/40" : ""}>
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.title || <em className="text-white/30">Untitled</em>}</div>
                  <div className="truncate text-sm text-white/45">{s.sub}</div>
                </div>
                <Btn variant="soft" onClick={() => onChange(move(items, i, -1))} disabled={i === 0} className="!px-2"><ChevronUp size={15} /></Btn>
                <Btn variant="soft" onClick={() => onChange(move(items, i, 1))} disabled={i === items.length - 1} className="!px-2"><ChevronDown size={15} /></Btn>
                <Btn variant="soft" onClick={() => setOpen(open === it.id ? null : it.id)} className="!px-2">{open === it.id ? <X size={15} /> : <Pencil size={15} />}</Btn>
                <Btn variant="danger" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="!px-2"><Trash2 size={15} /></Btn>
              </div>
              {open === it.id && (
                <div className="grid gap-4 border-t border-white/[0.07] bg-black/20 p-4 sm:grid-cols-2 sm:p-5">
                  {form(it, (patch) => onChange(items.map((x) => x.id === it.id ? { ...x, ...patch } : x)))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

function ExperienceTab({ data, set }: { data: Portfolio; set: SetFn }) {
  return (
    <ListTab<Experience>
      title="Experience" sub="Tales told in the Tavern."
      items={data.experience} onChange={(v) => set("experience", v)}
      blank={() => ({ id: uid("exp"), role: "", org: "", url: "", start: "", end: "Present", location: "", description: "", highlights: [], tech: [] })}
      summary={(e) => ({ title: [e.role, e.org].filter(Boolean).join(" · "), sub: [e.start, e.end].filter(Boolean).join(" — ") })}
      form={(e, up) => (
        <>
          <Field label="Role"><Text value={e.role} onChange={(v) => up({ role: v })} /></Field>
          <Field label="Organisation"><Text value={e.org} onChange={(v) => up({ org: v })} /></Field>
          <Field label="Start"><Text value={e.start} onChange={(v) => up({ start: v })} placeholder="2024" /></Field>
          <Field label="End"><Text value={e.end} onChange={(v) => up({ end: v })} placeholder="Present" /></Field>
          <Field label="Location"><Text value={e.location} onChange={(v) => up({ location: v })} /></Field>
          <Field label="Link"><Text value={e.url} onChange={(v) => up({ url: v })} placeholder="https://" /></Field>
          <Field label="Description" span={2}><Area value={e.description} onChange={(v) => up({ description: v })} rows={3} /></Field>
          <Field label="Highlights" hint="one per line" span={2}><Lines value={e.highlights} onChange={(v) => up({ highlights: v })} /></Field>
          <Field label="Tech" hint="comma separated" span={2}><Tags value={e.tech} onChange={(v) => up({ tech: v })} /></Field>
        </>
      )}
    />
  )
}

function EducationTab({ data, set }: { data: Portfolio; set: SetFn }) {
  return (
    <ListTab<Education>
      title="Education" sub="Studies shown in the Academy."
      items={data.education} onChange={(v) => set("education", v)}
      blank={() => ({ id: uid("edu"), school: "", degree: "", field: "", start: "", end: "", note: "" })}
      summary={(e) => ({ title: e.school, sub: [e.degree, e.field].filter(Boolean).join(", ") })}
      form={(e, up) => (
        <>
          <Field label="School / University" span={2}><Text value={e.school} onChange={(v) => up({ school: v })} /></Field>
          <Field label="Degree"><Text value={e.degree} onChange={(v) => up({ degree: v })} /></Field>
          <Field label="Field"><Text value={e.field} onChange={(v) => up({ field: v })} /></Field>
          <Field label="Start"><Text value={e.start} onChange={(v) => up({ start: v })} /></Field>
          <Field label="End"><Text value={e.end} onChange={(v) => up({ end: v })} /></Field>
          <Field label="Note" hint="GPA, honours…" span={2}><Text value={e.note} onChange={(v) => up({ note: v })} /></Field>
        </>
      )}
    />
  )
}

function AchievementsTab({ data, set }: { data: Portfolio; set: SetFn }) {
  return (
    <ListTab<Achievement>
      title="Honours & badges" sub="Certifications, awards, hackathon wins."
      items={data.achievements} onChange={(v) => set("achievements", v)}
      blank={() => ({ id: uid("ach"), title: "", issuer: "", date: "", url: "" })}
      summary={(a) => ({ title: a.title, sub: [a.issuer, a.date].filter(Boolean).join(" · ") })}
      form={(a, up) => (
        <>
          <Field label="Title" span={2}><Text value={a.title} onChange={(v) => up({ title: v })} /></Field>
          <Field label="Issuer"><Text value={a.issuer} onChange={(v) => up({ issuer: v })} /></Field>
          <Field label="Date"><Text value={a.date} onChange={(v) => up({ date: v })} /></Field>
          <Field label="Link" span={2}><Text value={a.url} onChange={(v) => up({ url: v })} placeholder="https://" /></Field>
        </>
      )}
    />
  )
}

function SkillsTab({ data, set }: { data: Portfolio; set: SetFn }) {
  const groups = data.skills
  const setG = (v: Portfolio["skills"]) => set("skills", v)
  return (
    <>
      <Header title="Skills" sub="Grouped bars in the Forge. Level 88+ shows as Legendary, 78+ Epic, 65+ Rare."
        right={<Btn onClick={() => setG([...groups, { group: "New group", items: [] }])}><Plus size={15} /> Group</Btn>} />
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((g, gi) => (
          <Card key={gi} className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <input className={`${inputCls} font-medium`} value={g.group} onChange={(e) => setG(groups.map((x, i) => i === gi ? { ...x, group: e.target.value } : x))} />
              <Btn variant="soft" onClick={() => setG(move(groups, gi, -1))} disabled={gi === 0} className="!px-2"><ChevronUp size={15} /></Btn>
              <Btn variant="soft" onClick={() => setG(move(groups, gi, 1))} disabled={gi === groups.length - 1} className="!px-2"><ChevronDown size={15} /></Btn>
              <Btn variant="danger" onClick={() => setG(groups.filter((_, i) => i !== gi))} className="!px-2"><Trash2 size={15} /></Btn>
            </div>
            <div className="space-y-2">
              {g.items.map((it, ii) => {
                const upItem = (patch: Partial<typeof it>) => setG(groups.map((x, i) => i === gi ? { ...x, items: x.items.map((y, j) => j === ii ? { ...y, ...patch } : y) } : x))
                return (
                  <div key={ii} className="flex items-center gap-2">
                    <input className={`${inputCls} !py-1.5`} value={it.name} onChange={(e) => upItem({ name: e.target.value })} />
                    <input type="range" min={10} max={100} value={it.level} onChange={(e) => upItem({ level: +e.target.value })} className="w-28 accent-[#ffd76a] sm:w-36" />
                    <span className="w-8 text-right font-mono text-xs text-white/50">{it.level}</span>
                    <button onClick={() => setG(groups.map((x, i) => i === gi ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x))} className="rounded p-1 text-white/35 hover:bg-white/10 hover:text-red-300"><X size={14} /></button>
                  </div>
                )
              })}
              <Btn variant="soft" onClick={() => setG(groups.map((x, i) => i === gi ? { ...x, items: [...x.items, { name: "", level: 70 }] } : x))} className="mt-2"><Plus size={14} /> Skill</Btn>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

// ── Publish ─────────────────────────────────────────────────────
function PublishTab({ data, setData, dirty }: { data: Portfolio; setData: (d: Portfolio) => void; dirty: boolean }) {
  const [token, setToken] = useState("")
  const [remember, setRemember] = useState(false)
  const [repo, setRepo] = useState(data.meta.contentRepo)
  const [branch, setBranch] = useState(data.meta.contentBranch)
  const [msg, setMsg] = useState("Update portfolio content")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string; url?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (t) { setToken(t); setRemember(true) }
    } catch {}
  }, [])

  const json = JSON.stringify(data, null, 2) + "\n"

  const publish = async () => {
    setBusy(true); setResult(null)
    try {
      if (remember) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY)
      const { commitUrl } = await publishContent({ token, repo, branch, path: data.meta.contentPath, message: msg, data })
      setResult({ ok: true, text: "Committed! Vercel will redeploy in about a minute.", url: commitUrl })
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message })
    }
    setBusy(false)
  }

  const download = () => {
    const blob = new Blob([json], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "portfolio.json"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as Portfolio
      if (!parsed.profile || !Array.isArray(parsed.projects)) throw new Error("Not a portfolio file")
      setData(parsed)
      setResult({ ok: true, text: `Loaded ${f.name} into the draft.` })
    } catch (e) { setResult({ ok: false, text: `Import failed: ${(e as Error).message}` }) }
  }

  return (
    <>
      <Header title="Publish" sub={dirty ? "Your draft differs from the live site." : "The draft matches the live site."} />
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-1 flex items-center gap-2 font-medium"><Github size={17} /> Commit to GitHub</div>
          <p className="mb-5 text-sm text-white/50">
            Writes <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">{data.meta.contentPath}</code> straight to your repo. Vercel picks up the commit and redeploys automatically. No server involved.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repository"><Text value={repo} onChange={setRepo} placeholder="owner/name" /></Field>
            <Field label="Branch"><Text value={branch} onChange={setBranch} /></Field>
            <Field label="GitHub token" hint="fine-grained, Contents: read & write" span={2}>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input type="password" className={`${inputCls} pl-9 font-mono`} value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" />
              </div>
            </Field>
            <Field label="Commit message" span={2}><Text value={msg} onChange={setMsg} /></Field>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
              <Toggle checked={remember} onChange={setRemember} label="Remember token on this device" />
              <Btn variant="primary" onClick={publish} disabled={busy || !token || !repo}>
                <Rocket size={15} className={busy ? "animate-pulse" : ""} /> {busy ? "Publishing…" : "Publish to live site"}
              </Btn>
            </div>
          </div>
          {result && (
            <div className={`mt-5 rounded-lg border px-3.5 py-3 text-sm ${result.ok ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-red-400/20 bg-red-400/10 text-red-200"}`}>
              {result.text}
              {result.url && <a href={result.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 underline underline-offset-2">View commit <ExternalLink size={13} /></a>}
            </div>
          )}
          <details className="mt-6 text-sm text-white/50">
            <summary className="cursor-pointer text-white/70">How do I create a token?</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5">
              <li>GitHub → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b>.</li>
              <li>Repository access: <b>Only select repositories</b> → pick <code className="text-xs">{repo}</code>.</li>
              <li>Permissions → Repository → <b>Contents: Read and write</b>. Nothing else.</li>
              <li>Paste it above. It is sent only to api.github.com, never to anyone else.</li>
            </ol>
          </details>
        </Card>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="mb-1 font-medium">Manual route</div>
            <p className="mb-4 text-sm text-white/50">Download the file and drop it into <code className="text-xs">content/</code>, then push.</p>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={download}><Download size={15} /> Download JSON</Btn>
              <Btn onClick={async () => { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy JSON"}
              </Btn>
              <Btn onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</Btn>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = "" }} />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="mb-3 font-medium">Preview before publishing</div>
            <div className="flex flex-wrap gap-2">
              <LinkBtn href="/?preview"><Gamepad2 size={15} /> Game</LinkBtn>
              <LinkBtn href="/quick?preview"><LayoutList size={15} /> Quick view</LinkBtn>
            </div>
            <p className="mt-3 text-xs text-white/40">Previews read the draft saved in this browser. Visitors always see the published file.</p>
          </Card>
        </div>
      </div>
    </>
  )
}
