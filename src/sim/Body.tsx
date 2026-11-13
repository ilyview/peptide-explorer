import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { BodyShape } from './model'

// A stylized mannequin built from stretched spheres and capsules.
// Every part eases toward its target size, so slider moves look smooth.
// (Swap this file for a GLB with morph targets later if you get a rigged model.)

const sphereGeo = new THREE.SphereGeometry(1, 40, 28)
// radius 1, straight section 2 → total height 4
const capsuleGeo = new THREE.CapsuleGeometry(1, 2, 10, 28)

type V3 = [number, number, number]
interface PartSpec {
  key: string
  kind: 'sphere' | 'capsule'
  p: V3
  s: V3
  rz?: number
}

function Part({ spec, material }: { spec: PartSpec; material: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null!)
  useLayoutEffect(() => {
    ref.current.position.set(...spec.p)
    ref.current.scale.set(...spec.s)
    ref.current.rotation.z = spec.rz ?? 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-9 * dt)
    const m = ref.current
    m.position.x += (spec.p[0] - m.position.x) * k
    m.position.y += (spec.p[1] - m.position.y) * k
    m.position.z += (spec.p[2] - m.position.z) * k
    m.scale.x += (spec.s[0] - m.scale.x) * k
    m.scale.y += (spec.s[1] - m.scale.y) * k
    m.scale.z += (spec.s[2] - m.scale.z) * k
    m.rotation.z += ((spec.rz ?? 0) - m.rotation.z) * k
  })
  return <mesh ref={ref} geometry={spec.kind === 'sphere' ? sphereGeo : capsuleGeo} material={material} castShadow />
}

/** A limb segment between two points, as a capsule. */
function limb(key: string, top: V3, bottom: V3, r: number, rz: number): PartSpec {
  const len = Math.hypot(top[0] - bottom[0], top[1] - bottom[1])
  return {
    key,
    kind: 'capsule',
    p: [(top[0] + bottom[0]) / 2, (top[1] + bottom[1]) / 2, (top[2] + bottom[2]) / 2],
    s: [r, len / 4 + r * 0.25, r],
    rz,
  }
}

function buildParts(sh: BodyShape): PartSpec[] {
  const f = sh.fat
  const m = sh.muscle
  const g = sh.frame
  // Belly fat responds to the extra "belly" reduction.
  const fb = f * (1 - 0.6 * sh.belly)

  const chestW = 0.165 + 0.03 * m + 0.035 * f - 0.022 * g
  const parts: PartSpec[] = [
    { key: 'head', kind: 'sphere', p: [0, 1.65, 0], s: [0.09 + 0.01 * f, 0.115, 0.1 + 0.005 * f] },
    { key: 'neck', kind: 'capsule', p: [0, 1.5, 0], s: [0.044 + 0.012 * m + 0.012 * f, 0.036, 0.044 + 0.012 * m + 0.012 * f] },
    { key: 'chest', kind: 'sphere', p: [0, 1.32, 0.005 + 0.01 * f], s: [chestW, 0.19, 0.105 + 0.022 * m + 0.045 * f] },
    {
      key: 'waist',
      kind: 'sphere',
      p: [0, 1.12, 0.008 + 0.04 * fb],
      s: [0.128 + 0.08 * fb + 0.012 * m - 0.014 * g, 0.175, 0.095 + 0.11 * fb],
    },
    { key: 'hips', kind: 'sphere', p: [0, 0.95, 0], s: [0.148 + 0.058 * f + 0.022 * g, 0.14, 0.105 + 0.055 * f] },
  ]

  for (const side of [-1, 1]) {
    const n = side < 0 ? 'L' : 'R'
    // Arms hang a little further out as the torso gets wider.
    const a = 0.1 + 0.14 * f + 0.05 * m
    const sx = side * (chestW + 0.012)
    const shoulder: V3 = [sx, 1.43, 0]
    const dir: V3 = [side * Math.sin(a), -Math.cos(a), 0]
    const elbow: V3 = [shoulder[0] + dir[0] * 0.3, shoulder[1] + dir[1] * 0.3, 0]
    const wrist: V3 = [elbow[0] + dir[0] * 0.26, elbow[1] + dir[1] * 0.26, 0.02]
    const upperR = 0.037 + 0.02 * m + 0.018 * f
    const foreR = 0.03 + 0.011 * m + 0.01 * f
    const sr = 0.056 + 0.024 * m + 0.012 * f
    parts.push(
      { key: 'shoulder' + n, kind: 'sphere', p: shoulder, s: [sr, sr, sr] },
      limb('upperArm' + n, shoulder, elbow, upperR, side * a),
      limb('foreArm' + n, elbow, wrist, foreR, side * a),
      { key: 'hand' + n, kind: 'sphere', p: [wrist[0] + dir[0] * 0.06, wrist[1] + dir[1] * 0.06, 0.025], s: [0.03, 0.055, 0.038], rz: side * a },
    )

    const hx = side * (0.085 + 0.022 * f + 0.008 * g)
    const thighR = 0.066 + 0.018 * m + 0.036 * f
    const calfR = 0.046 + 0.011 * m + 0.014 * f
    parts.push(
      limb('thigh' + n, [hx, 0.93, 0], [hx * 0.95, 0.5, 0], thighR, 0),
      limb('calf' + n, [hx * 0.95, 0.5, 0], [hx * 0.9, 0.09, 0], calfR, 0),
      { key: 'foot' + n, kind: 'sphere', p: [hx * 0.9, 0.035, 0.05], s: [0.045, 0.035, 0.11] },
    )
  }
  return parts
}

export function Body({ shape, color = '#8fb8de' }: { shape: BodyShape; color?: string }) {
  const parts = useMemo(() => buildParts(shape), [shape])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 }), [color])
  const group = useRef<THREE.Group>(null!)
  const target = shape.heightCm / 175

  useLayoutEffect(() => {
    group.current.scale.setScalar(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-9 * dt)
    const s = group.current.scale.x + (target - group.current.scale.x) * k
    group.current.scale.setScalar(s)
  })

  return (
    <group ref={group}>
      {parts.map((p) => (
        <Part key={p.key} spec={p} material={material} />
      ))}
    </group>
  )
}
