import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// A stylized ball-and-stick peptide chain. The number of links matches the
// peptide's real amino-acid count (capped), but the shape is illustrative,
// not the real 3D structure. Swap in PDB/PubChem coordinates later if wanted.

const MAX_RESIDUES = 44

const ATOM = {
  C: { color: '#9aa7b8', r: 0.34 },
  N: { color: '#5b8def', r: 0.33 },
  O: { color: '#ef5b6b', r: 0.31 },
  S: { color: '#f2c94c', r: 0.4 },
} as const
type El = keyof typeof ATOM

function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function build(seed: string, residues: number) {
  const rand = rng(seed)
  const n = Math.min(residues, MAX_RESIDUES)
  const atoms: { pos: THREE.Vector3; el: El }[] = []
  const bonds: [number, number][] = []
  const R = 3.4
  const rise = 0.85
  const turn = (100 * Math.PI) / 180
  const at = (t: number, radius = R) =>
    new THREE.Vector3(Math.cos(t * turn) * radius, t * rise, Math.sin(t * turn) * radius)

  let prev = -1
  for (let i = 0; i < n; i++) {
    const backbone: El[] = ['N', 'C', 'C']
    const ids = backbone.map((el, j) => {
      atoms.push({ pos: at(i + j / 3), el })
      const id = atoms.length - 1
      if (prev >= 0) bonds.push([prev, id])
      prev = id
      return id
    })
    // Carbonyl oxygen
    const o = at(i + 2 / 3, R + 1.2)
    o.y += 0.5
    atoms.push({ pos: o, el: 'O' })
    bonds.push([ids[2], atoms.length - 1])
    // Side chain off the middle carbon
    const len = 1 + Math.floor(rand() * 3)
    let from = ids[1]
    for (let k = 1; k <= len; k++) {
      const p = at(i + 1 / 3 + (rand() - 0.5) * 0.25, R + 1.3 * k)
      p.y += (rand() - 0.5) * 1.2
      const roll = rand()
      const el: El = k < len ? 'C' : roll < 0.5 ? 'C' : roll < 0.72 ? 'N' : roll < 0.94 ? 'O' : 'S'
      atoms.push({ pos: p, el })
      bonds.push([from, atoms.length - 1])
      from = atoms.length - 1
    }
  }
  // Center on the origin and report size for framing.
  const box = new THREE.Box3().setFromPoints(atoms.map((a) => a.pos))
  const center = box.getCenter(new THREE.Vector3())
  atoms.forEach((a) => a.pos.sub(center))
  const dims = box.getSize(new THREE.Vector3())
  // length runs along the chain's axis (y); width is across it
  return { atoms, bonds, length: dims.y + 1, width: Math.max(dims.x, dims.z) + 1 }
}

const atomGeo = new THREE.SphereGeometry(1, 20, 14)
const bondGeo = new THREE.CylinderGeometry(0.11, 0.11, 1, 8)
const up = new THREE.Vector3(0, 1, 0)

function Chain({ seed, residues, accent }: { seed: string; residues: number; accent: string }) {
  const group = useRef<THREE.Group>(null!)
  const { atoms, bonds, length, width } = useMemo(() => build(seed, residues), [seed, residues])
  const mats = useMemo(() => {
    const m = {} as Record<El, THREE.Material>
    ;(Object.keys(ATOM) as El[]).forEach((el) => {
      m[el] = new THREE.MeshStandardMaterial({ color: ATOM[el].color, roughness: 0.35, metalness: 0.1 })
    })
    return m
  }, [])
  const bondMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, emissive: accent, emissiveIntensity: 0.15 }),
    [accent],
  )
  const bondData = useMemo(
    () =>
      bonds.map(([a, b]) => {
        const pa = atoms[a].pos
        const pb = atoms[b].pos
        const dir = pb.clone().sub(pa)
        const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
        return { pos: pa.clone().add(pb).multiplyScalar(0.5), q, len: dir.length() }
      }),
    [atoms, bonds],
  )

  useFrame((_, dt) => {
    group.current.rotation.y += dt * 0.45
  })

  // Fit the chain to the canvas: stand it upright in tall canvases, lay it
  // on its side in wide ones.
  const { viewport } = useThree()
  const upright = viewport.height >= viewport.width
  const along = upright ? viewport.height : viewport.width
  const across = upright ? viewport.width : viewport.height
  const scale = 0.7 * Math.min(along / Math.max(length, 12), across / width)
  return (
    <group rotation={[0, 0, upright ? 0.2 : Math.PI / 2 - 0.2]}>
      <group ref={group} scale={scale}>
        {atoms.map((a, i) => (
          <mesh key={i} geometry={atomGeo} material={mats[a.el]} position={a.pos} scale={ATOM[a.el].r} />
        ))}
        {bondData.map((b, i) => (
          <mesh key={i} geometry={bondGeo} material={bondMat} position={b.pos} quaternion={b.q} scale={[1, b.len, 1]} />
        ))}
      </group>
    </group>
  )
}

export function Molecule({ seed, residues, accent }: { seed: string; residues: number; accent: string }) {
  return (
    <Canvas camera={{ position: [0, 0, 6.2], fov: 45 }} dpr={[1, 2]} resize={{ offsetSize: true, scroll: false }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, -2, -3]} intensity={0.6} color={accent} />
      <Chain seed={seed} residues={residues} accent={accent} />
      <OrbitControls enablePan={false} enableZoom={false} />
    </Canvas>
  )
}

export const shownResidues = (n: number) => Math.min(n, MAX_RESIDUES)
