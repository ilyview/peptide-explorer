import { EVIDENCE_LABEL, type EvidenceLevel } from '../data/peptides'

// Black and white: strength of evidence is shown by how "solid" the tag is.
const EVIDENCE_STYLE: Record<EvidenceLevel, string> = {
  approved: 'bg-white text-black ring-white',
  approvedElsewhere: 'bg-neutral-300 text-black ring-neutral-300',
  trial: 'bg-white/15 text-white ring-white/60',
  limited: 'bg-transparent text-neutral-300 ring-neutral-500',
  animal: 'bg-transparent text-neutral-400 ring-neutral-600',
  none: 'bg-transparent text-neutral-500 ring-neutral-700',
}

export function EvidenceTag({ level }: { level: EvidenceLevel }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${EVIDENCE_STYLE[level]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {EVIDENCE_LABEL[level]}
    </span>
  )
}

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`rounded-xl border border-white/30 bg-black px-4 py-2.5 text-sm text-neutral-200 ${className}`}>
      <strong className="font-semibold">Educational only, not medical advice.</strong> This site does not recommend any
      peptide or dose. Talk to a doctor before taking anything.
    </p>
  )
}

/** Small decorative chain of dots used on cards (cheap: no WebGL per card). */
export function ChainIcon({ count, color }: { count: number; color: string }) {
  const n = Math.min(count, 14)
  const pts = Array.from({ length: n }, (_, i) => {
    const x = 8 + (i * 84) / Math.max(n - 1, 1)
    const y = 24 + Math.sin(i * 1.25) * 11
    return [x, y] as const
  })
  return (
    <svg viewBox="0 0 100 48" className="h-12 w-24" aria-hidden="true">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="2" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4.2 : 3.2} fill={color} fillOpacity={i % 3 === 0 ? 1 : 0.65} />
      ))}
    </svg>
  )
}
