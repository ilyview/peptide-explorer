import { useMemo, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import type { BodyStats, Peptide, SimConfig } from '../data/peptides'
import { Disclaimer, EvidenceTag } from '../components/ui'
import { Body } from './Body'
import { applyEffect, composition, toShape } from './model'

const LIMITS = {
  heightCm: { min: 140, max: 210 },
  weightKg: { min: 40, max: 180 },
  bodyFatPct: { min: 5, max: 55 },
}

const DEFAULTS: Record<BodyStats['gender'], BodyStats> = {
  male: { gender: 'male', heightCm: 178, weightKg: 98, bodyFatPct: 32 },
  female: { gender: 'female', heightCm: 165, weightKg: 88, bodyFatPct: 42 },
}

const fmt = (n: number, d = 1) => n.toFixed(d)
const signed = (n: number, d = 1) => (Math.abs(n) < 0.05 ? '0' : `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`)

function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display: ReactNode
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-slate-300">{props.label}</span>
        <span className="font-semibold tabular-nums text-white">{props.display}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-cyan-300"
      />
    </label>
  )
}

function Row({ label, start, after, unit, digits = 1 }: { label: string; start: number; after: number; unit: string; digits?: number }) {
  const delta = after - start
  return (
    <tr className="border-t border-white/10">
      <th scope="row" className="py-2 pr-2 text-left font-normal text-slate-300">{label}</th>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-400">{fmt(start, digits)}</td>
      <td className="py-2 pr-2 text-right font-semibold tabular-nums text-white">{fmt(after, digits)} {unit}</td>
      <td className={`py-2 text-right tabular-nums ${delta < -0.05 ? 'text-emerald-300' : delta > 0.05 ? 'text-sky-300' : 'text-slate-500'}`}>
        {signed(delta, digits)}
      </td>
    </tr>
  )
}

/** Weight over time, with a dot at the selected week. */
function Curve({ stats, sim, dose, weeks, color }: { stats: BodyStats; sim: SimConfig; dose: number; weeks: number; color: string }) {
  const W = 300
  const H = 90
  const pad = 6
  const series = useMemo(
    () => Array.from({ length: sim.maxWeeks + 1 }, (_, w) => applyEffect(stats, sim, dose, w).after.weightKg),
    [stats, sim, dose],
  )
  const lo = Math.min(...series)
  const hi = Math.max(...series)
  const span = Math.max(hi - lo, 1)
  const x = (w: number) => pad + (w / sim.maxWeeks) * (W - 2 * pad)
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - 2 * pad)
  const path = series.map((v, w) => `${w ? 'L' : 'M'}${x(w).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <figure>
      <figcaption className="mb-1 flex justify-between text-xs text-slate-400">
        <span>Estimated weight over time</span>
        <span>week 0 to {sim.maxWeeks}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-slate-950/60" role="img" aria-label={`Estimated weight goes from ${fmt(series[0])} to ${fmt(series[weeks])} kg by week ${weeks}`}>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.35" />
        <path d={series.slice(0, weeks + 1).map((v, w) => `${w ? 'L' : 'M'}${x(w).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" />
        <circle cx={x(weeks)} cy={y(series[weeks])} r="4.5" fill={color} stroke="#0f172a" strokeWidth="2" />
      </svg>
    </figure>
  )
}

export function Simulator({ peptide: p }: { peptide: Peptide }) {
  const sim = p.sim!
  const [stats, setStats] = useState<BodyStats>(DEFAULTS.male)
  const [doseIdx, setDoseIdx] = useState(sim.doseSteps.length - 1)
  const [weeks, setWeeks] = useState(Math.round(sim.maxWeeks / 2))
  const [showStart, setShowStart] = useState(false)

  const dose = sim.doseSteps[doseIdx]
  const { start, after, belly } = useMemo(() => applyEffect(stats, sim, dose, weeks), [stats, sim, dose, weeks])
  const shape = useMemo(
    () => (showStart ? toShape(stats, composition(stats)) : toShape(stats, after, belly)),
    [stats, after, belly, showStart],
  )
  const set = <K extends keyof BodyStats>(k: K, v: BodyStats[K]) => setStats((s) => ({ ...s, [k]: v }))

  const outsideTrial = p.category === 'Weight & metabolism' && start.bmi < 27

  return (
    <div>
      <a href="#/" className="mb-4 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200">
        <span aria-hidden="true">←</span> All peptides
      </a>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{p.name} body simulator</h1>
        <EvidenceTag level={p.evidence} />
      </div>
      <Disclaimer className="mb-5" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* 3D view */}
        <div className="relative h-[380px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900 sm:h-[520px] lg:sticky lg:top-4 lg:h-[640px]">
          <Canvas shadows camera={{ position: [0, 1.15, 4.3], fov: 32 }} dpr={[1, 2]}>
            <ambientLight intensity={0.75} />
            <directionalLight position={[3, 5, 4]} intensity={2.4} castShadow />
            <directionalLight position={[-4, 2, -3]} intensity={0.8} color={p.color} />
            <Body shape={shape} color={showStart ? '#94a3b8' : '#8fb8de'} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <circleGeometry args={[0.75, 64]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={3} blur={2.4} far={2} />
            <OrbitControls target={[0, 1.0, 0]} enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.2} minPolarAngle={1.1} maxPolarAngle={1.7} />
          </Canvas>
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs text-slate-200">
              {showStart ? 'Starting body' : `Illustration at week ${weeks}`}
            </span>
            <button
              onClick={() => setShowStart((v) => !v)}
              aria-pressed={showStart}
              className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-medium text-cyan-200 ring-1 ring-cyan-300/40 hover:bg-slate-950"
            >
              {showStart ? 'Show estimate' : 'Show starting body'}
            </button>
          </div>
          <p className="pointer-events-none absolute inset-x-3 bottom-2 text-center text-[11px] text-slate-400">
            Stylized mannequin. Drag to rotate.
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">Starting body</h2>
            <div className="mb-4 inline-flex rounded-xl bg-white/5 p-1" role="group" aria-label="Gender">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setStats(DEFAULTS[g])}
                  aria-pressed={stats.gender === g}
                  className={`rounded-lg px-4 py-1.5 text-sm capitalize ${stats.gender === g ? 'bg-cyan-300 font-medium text-slate-900' : 'text-slate-300'}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Slider label="Height" {...LIMITS.heightCm} value={stats.heightCm} display={`${stats.heightCm} cm`} onChange={(v) => set('heightCm', v)} />
              <Slider label="Weight" {...LIMITS.weightKg} value={stats.weightKg} display={`${stats.weightKg} kg`} onChange={(v) => set('weightKg', v)} />
              <Slider label="Body fat" {...LIMITS.bodyFatPct} value={stats.bodyFatPct} display={`${stats.bodyFatPct}%`} onChange={(v) => set('bodyFatPct', v)} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {fmt(stats.heightCm / 30.48, 1)} ft · {fmt(stats.weightKg * 2.2046, 0)} lb · BMI {fmt(start.bmi)}
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-300">Dose and time</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Slider
                label={`Dose per ${sim.dosePer}`}
                min={0}
                max={sim.doseSteps.length - 1}
                value={doseIdx}
                display={`${dose} ${sim.doseUnit}`}
                onChange={setDoseIdx}
              />
              <Slider label="Duration" min={0} max={sim.maxWeeks} value={weeks} display={`${weeks} weeks`} onChange={setWeeks} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Sliders only cover the doses and time span used in the product label and main trial. This is not a dosing
              guide; a doctor decides the dose.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5" aria-live="polite">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-cyan-300">Estimated change over time</h2>
            <p className="mb-3 text-xs text-slate-400">A rough illustration from trial averages. Real results vary a lot from person to person.</p>
            <table className="mb-4 w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="pb-1 text-left font-normal" />
                  <th className="pb-1 pr-2 text-right font-normal">Start</th>
                  <th className="pb-1 pr-2 text-right font-normal">Week {weeks}</th>
                  <th className="pb-1 text-right font-normal">Change</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Weight" start={start.weightKg} after={after.weightKg} unit="kg" />
                <Row label="Body fat" start={start.bodyFatPct} after={after.bodyFatPct} unit="%" />
                <Row label="Fat mass" start={start.fatKg} after={after.fatKg} unit="kg" />
                <Row label="Lean mass" start={start.leanKg} after={after.leanKg} unit="kg" />
              </tbody>
            </table>
            <Curve stats={stats} sim={sim} dose={dose} weeks={weeks} color={p.color} />

            {outsideTrial && (
              <p className="mt-3 rounded-lg bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                This starting body has a BMI under 27. The trials did not include people like this, and the medicine is
                not approved for them, so the estimate here is not meaningful.
              </p>
            )}
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>
                <span className="font-medium text-slate-100">Who was studied: </span>
                {sim.studiedIn}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-slate-400">
                {sim.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="text-xs text-slate-500">
                Sources:{' '}
                {p.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && ' · '}
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                      {s.label}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
