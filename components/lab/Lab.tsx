"use client"
import { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Panel, Button, IconButton, Ribbon, Chip, Pill, Bar, Kbd, Rule } from "@/components/ui/kit"
import { AboutSheet, ProjectsInventory, QuestLog, Ico } from "./Sheets"
import { useContent } from "@/lib/content"
import { PixelFilter } from "@/components/ui/ProjectCover"
import { Map as MapIcon, Music, Volume2, Globe, X } from "lucide-react"

function Inner() {
  const q = useSearchParams()
  const world = q.get("world") ?? "village"
  const c = useContent()
  useEffect(() => { document.documentElement.dataset.world = world }, [world])
  return (
    <div className="lab" data-lab={world}>
      <div className="lab-in"><PixelFilter />
        <h1 className="lab-title">UI LAB · {world.toUpperCase()}</h1>

        <div className="lab-row">
          <Panel v="hud" className="hud-card lab-hud">
            <div className="hud-top">
              <div className="hud-face">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/na/chars/Villager3/face.png" alt="" className="pixelated" /></div>
              <div className="hud-id"><div className="hud-pass">ADVENTURER</div><div className="hud-name">{c.profile.name.toUpperCase()}</div><div className="hud-title">{c.profile.title}</div>
                <div className="hud-prog"><Bar value={0.43} /><span>3/7</span></div></div>
            </div>
          </Panel>
          <div className="lab-btns">
            <Button variant="cta">START ADVENTURE</Button><Button>QUICK VIEW</Button><Button variant="accent" accent="#5fa24a">WORLDS</Button><Button disabled>DISABLED</Button>
            <IconButton title="a"><MapIcon size={18} /></IconButton><IconButton title="b"><Music size={18} /></IconButton><IconButton title="c"><Volume2 size={18} /></IconButton><IconButton title="d"><Globe size={18} /></IconButton><IconButton title="x" danger><X size={18} /></IconButton>
          </div>
          <div className="lab-btns">
            <Ribbon>A PLAYABLE PORTFOLIO</Ribbon><Chip>TypeScript</Chip><Chip color="#4aa3e8">Rust</Chip><Pill>12 EXHIBITS</Pill><Kbd>E</Kbd><Kbd wide>CLICK</Kbd><Ico n="coin" /><Ico n="key" /><Ico n="potion" /><Ico n="cup-gold" />
          </div>
        </div>

        <div className="lab-row lab-row--2">
          <Panel v="toast" className="toast-pos lab-toast" style={{ padding: "16px 18px 14px 16px" }}>
            <div className="toast-kick">UNLOCKED</div><div className="toast-icon">🏺</div>
            <div className="toast-txt"><div className="toast-note">ACHIEVEMENT</div><div className="toast-title">FIRST STEPS</div><div className="toast-desc">Entered Hearthvale</div></div>
          </Panel>
          <Panel v="dialog" className="dlg lab-dlg">
            <div className="dlg-face">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/na/chars/Villager3/face.png" alt="" className="pixelated" /></div>
            <div className="dlg-body"><div className="dlg-name"><Ribbon small>MIRA THE INNKEEPER</Ribbon></div>
              <div className="dlg-text">Welcome in, traveller! Sit down by the fire. The stew is hot and the stories are better.</div>
              <div className="dlg-foot"><span>1 / 2</span><span className="dlg-next">▼</span></div></div>
          </Panel>
          <div className="o3-sign" style={{ ["--ac" as string]: "#3a6ea5", alignSelf: "start" }}><div className="o3-sign__t">TOWN HALL</div><div className="o3-sign__s">ABOUT</div></div>
        </div>

        <Rule />
        <Panel v="modal" className="lab-card"><div className="bm-title"><Ribbon>THE HERO&apos;S CHRONICLE</Ribbon></div><div className="bm-body lab-body"><AboutSheet world={world} /></div></Panel>
        <Panel v="modal" className="lab-card"><div className="bm-title"><Ribbon>THE GALLERY</Ribbon></div><div className="bm-body lab-body"><ProjectsInventory /></div></Panel>
        <Panel v="modal" className="lab-card"><div className="bm-title"><Ribbon>THE TAVERN</Ribbon></div><div className="bm-body lab-body"><QuestLog /></div></Panel>
      </div>
    </div>
  )
}

export default function Lab() {
  return <Suspense fallback={null}><Inner /></Suspense>
}
