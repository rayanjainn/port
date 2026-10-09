"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import { BUILDINGS } from "@/lib/world/village"
import { BUILDING_ART } from "@/lib/na"

interface Vox { w: number; h: number; t: string; c: string; trees: [number, number, number][] }

const TREE_COL: Record<number, [string, number]> = {
  0: ["#7cc04a", 1.6], 1: ["#3f8a4a", 2.1], 2: ["#5aa64a", 1.7], 3: ["#ffb3c8", 1.7], 4: ["#9ccf3f", 1.6], 5: ["#a8c84a", 1.6],
  6: ["#7a5236", 1.3], 7: ["#ffa8c2", 2.4], 8: ["#5fb046", 2.4], 9: ["#ffb35c", 2.4], 10: ["#6bbf4a", 2.6],
}
const SECTION_ANCHOR: Record<string, string> = { townhall: "#about", gallery: "#work", tavern: "#experience", forge: "#skills", academy: "#studies", wizard: "#contact", cave: "#work" }

function Island({ data, onPick }: { data: Vox; onPick: (id: string) => void }) {
  const group = useRef<THREE.Group>(null)
  const ground = useRef<THREE.InstancedMesh>(null)
  const under = useRef<THREE.InstancedMesh>(null)
  const canopy = useRef<THREE.InstancedMesh>(null)
  const trunks = useRef<THREE.InstancedMesh>(null)
  const water = useRef<THREE.InstancedMesh>(null)
  const { W, H } = { W: data.w, H: data.h }
  const cx = W / 2, cz = H / 2

  const counts = useMemo(() => {
    let g = 0, w = 0
    for (const k of data.t) { if (k === "w") w++; else g++ }
    return { g, w }
  }, [data])

  useEffect(() => {
    const m = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3()
    let gi = 0, wi = 0, ui = 0
    for (let r = 0; r < H; r++)
      for (let c = 0; c < W; c++) {
        const i = r * W + c
        const k = data.t[i]
        const hex = data.c.slice(i * 6, i * 6 + 6)
        const edge = Math.min(c, r, W - 1 - c, H - 1 - r)
        if (k === "w") {
          p.set(c - cx, 0.3, r - cz); s.set(1, 0.6, 1)
          m.compose(p, q, s); water.current!.setMatrixAt(wi, m)
          col.set(`#${hex}`).lerp(new THREE.Color("#5fd3ff"), 0.4); water.current!.setColorAt(wi, col); wi++
        } else {
          const hgt = k === "d" ? 0.92 : 1 + ((c * 13 + r * 7) % 5) * 0.03
          p.set(c - cx, hgt / 2, r - cz); s.set(1, hgt, 1)
          m.compose(p, q, s); ground.current!.setMatrixAt(gi, m)
          col.set(`#${hex}`)
          if (k === "g") col.offsetHSL(0, 0.04, 0.02)
          ground.current!.setColorAt(gi, col); gi++
        }
        // tapered rocky underside
        const depth = 1.2 + Math.min(edge, 12) * 0.55 + (Math.sin(c * 0.7) + Math.cos(r * 0.9)) * 0.6
        p.set(c - cx, -depth / 2, r - cz); s.set(1, depth, 1)
        m.compose(p, q, s); under.current!.setMatrixAt(ui, m)
        col.set(edge < 2 ? "#6b4a3a" : "#4a3247").offsetHSL(0, 0, (Math.sin(c * 1.3 + r) * 0.04))
        under.current!.setColorAt(ui, col); ui++
      }
    data.trees.forEach(([c, r, k], i) => {
      const [hex, hgt] = TREE_COL[k] ?? TREE_COL[0]
      const big = hgt > 2.2 ? 1.25 : 0.95
      p.set(c - cx, 1 + 0.5 + hgt * 0.55, r - cz); s.set(big, hgt * 0.7, big)
      m.compose(p, q, s); canopy.current!.setMatrixAt(i, m)
      col.set(hex).offsetHSL(0, 0, ((c + r) % 3 - 1) * 0.03); canopy.current!.setColorAt(i, col)
      p.set(c - cx, 1 + 0.35, r - cz); s.set(0.28, 0.7, 0.28)
      m.compose(p, q, s); trunks.current!.setMatrixAt(i, m)
    })
    for (const im of [ground, under, canopy, trunks, water]) { im.current!.instanceMatrix.needsUpdate = true; if (im.current!.instanceColor) im.current!.instanceColor.needsUpdate = true }
  }, [data, W, H, cx, cz])

  const buildings = useMemo(() => BUILDINGS.map((b) => {
    const a = BUILDING_ART[b.art]
    const w = a.rect[2] / 16, d = Math.max(2, a.rect[3] / 16 - 1)
    return { ...b, w, d, x: b.c + w / 2 - cx - 0.5, z: b.r + d / 2 + 0.6 - cz, tall: b.art === "hall" || b.art === "lodge" ? 2.6 : b.art === "straw" ? 1.2 : 1.8 }
  }), [cx, cz])

  const t0 = useRef(0)
  useFrame((state, dt) => {
    t0.current += dt
    const g = group.current
    if (!g) return
    const px = state.pointer.x, py = state.pointer.y
    g.rotation.y += ((-0.55 + px * 0.25 + Math.sin(t0.current * 0.12) * 0.25) - g.rotation.y) * 0.04
    g.rotation.x += ((py * 0.06) - g.rotation.x) * 0.04
    g.position.y = Math.sin(t0.current * 0.8) * 0.6
    if (water.current) (water.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + Math.sin(t0.current * 2) * 0.08
  })

  return (
    <group ref={group} scale={0.098}>
      <instancedMesh ref={ground} args={[undefined, undefined, counts.g]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={water} args={[undefined, undefined, counts.w]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.15} metalness={0.1} emissive="#2aa6ff" emissiveIntensity={0.25} transparent opacity={0.92} />
      </instancedMesh>
      <instancedMesh ref={under} args={[undefined, undefined, W * H]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={canopy} args={[undefined, undefined, data.trees.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, data.trees.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7a4a2a" roughness={1} />
      </instancedMesh>
      {buildings.map((b) => (
        <group key={b.id} position={[b.x, 1, b.z]}>
          <mesh position={[0, b.tall / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w * 0.9, b.tall, b.d * 0.85]} />
            <meshStandardMaterial color={b.art === "kiln" || b.art === "beige" ? "#e9d3a6" : "#c98a52"} roughness={0.85} />
          </mesh>
          <mesh position={[0, b.tall + 0.55, 0]} rotation={[0, 0, 0]} castShadow>
            <boxGeometry args={[b.w * 1.02, 1.1, b.d * 0.98]} />
            <meshStandardMaterial color={b.accent ?? (b.art.includes("orange") ? "#e8743a" : "#b0573a")} roughness={0.7} emissive={b.accent ?? "#000"} emissiveIntensity={b.accent ? 0.18 : 0} />
          </mesh>
          <mesh position={[0, b.tall + 1.35, 0]}>
            <boxGeometry args={[b.w * 0.7, 0.5, b.d * 0.6]} />
            <meshStandardMaterial color={b.accent ?? "#a8502f"} roughness={0.7} />
          </mesh>
          {b.section && (
            <Html position={[0, b.tall + 3.2, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
              <button onClick={() => onPick(b.id)} className="island-tag" style={{ ["--c" as string]: b.accent }}>
                <span className="dot" /> {b.section.charAt(0) + b.section.slice(1).toLowerCase()}
              </button>
            </Html>
          )}
        </group>
      ))}
      <Clouds />
    </group>
  )
}

function Clouds() {
  const ref = useRef<THREE.Group>(null)
  const clouds = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    x: (Math.sin(i * 7.1) * 0.5) * 90, z: -38 + (i % 4) * 12, y: 18 + (i % 3) * 4, s: 2 + (i % 4) * 0.7, sp: 1.2 + (i % 3) * 0.6,
  })), [])
  useFrame((_, dt) => {
    ref.current?.children.forEach((c, i) => {
      c.position.x += clouds[i].sp * dt
      if (c.position.x > 60) c.position.x = -60
    })
  })
  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          <mesh><boxGeometry args={[c.s * 2.2, c.s * 0.6, c.s * 1.2]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.7} roughness={1} /></mesh>
          <mesh position={[c.s * 0.4, c.s * 0.4, 0]}><boxGeometry args={[c.s * 1.1, c.s * 0.6, c.s]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.7} roughness={1} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Rig() {
  const { camera } = useThree()
  useEffect(() => { camera.lookAt(0, -0.8, 0) }, [camera])
  return null
}

export default function VoxelIsland({ onPick }: { onPick: (anchor: string) => void }) {
  const [data, setData] = useState<Vox | null>(null)
  useEffect(() => {
    fetch("/village-voxels.json").then((r) => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.75]}
      camera={{ position: [9.5, 8.5, 9.5], fov: 34, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Rig />
      <hemisphereLight args={["#ffe9d6", "#3a2560", 0.9]} />
      <directionalLight position={[8, 14, 4]} intensity={2.1} color="#ffd8a8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-0.0005} />
      <directionalLight position={[-8, 4, -6]} intensity={0.6} color="#b69cff" />
      <fog attach="fog" args={["#0d0a1c", 18, 40]} />
      {data && <Island data={data} onPick={(id) => onPick(SECTION_ANCHOR[id] ?? "#work")} />}
    </Canvas>
  )
}
