import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Peptide } from '../data/peptides'
import { Molecule, shownResidues } from './Molecule'
import { Disclaimer, EvidenceTag } from './ui'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white">{title}</h3>
      <div className="text-neutral-200">{children}</div>
    </section>
  )
}

export function Detail({ peptide: p, onClose }: { peptide: Peptide; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const partial = p.residues > shownResidues(p.residues)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        layoutId={`card-${p.id}`}
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden border border-white/15 bg-neutral-950 shadow-2xl md:flex-row"
        style={{ borderRadius: 20 }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-neutral-800/90 text-xl text-neutral-200 hover:bg-neutral-700"
        >
          ×
        </button>

        <div
          className="relative h-56 shrink-0 md:h-auto md:w-[42%]"
          style={{ background: `radial-gradient(circle at 50% 45%, ${p.color}33, transparent 70%)` }}
        >
          <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <Molecule seed={p.id} residues={p.residues} accent={p.color} />
          </motion.div>
          <p className="pointer-events-none absolute inset-x-3 bottom-2 text-center text-[11px] leading-tight text-neutral-400">
            Stylized chain of {shownResidues(p.residues)} amino acids{partial ? ` (of ${p.residues})` : ''}. Not the real 3D shape. Drag to
            rotate.
          </p>
        </div>

        <motion.div
          className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ delay: 0.15 }}
        >
          <header className="pr-10">
            <EvidenceTag level={p.evidence} />
            <h2 className="mt-2 text-3xl font-semibold text-white">{p.name}</h2>
            {p.alsoKnownAs && <p className="text-neutral-400">{p.alsoKnownAs}</p>}
            <p className="mt-2 text-sm text-neutral-300">{p.evidenceNote}</p>
          </header>

          <Section title="What it is">{p.whatItIs}</Section>
          <Section title="What it does">{p.whatItDoes}</Section>
          <Section title="How it works (explain like I'm 5)">{p.howItWorks}</Section>
          <Section title="Side effects">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-neutral-100">More common</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {p.sideEffects.common.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-neutral-100">Rare or serious</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {p.sideEffects.rare.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
          <Section title="How long it lasts">{p.durationOfEffect}</Section>
          <Section title="Sources">
            <ul className="space-y-0.5 text-sm">
              {p.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </Section>

          {p.sim ? (
            <a
              href={`#/sim/${p.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-neutral-200"
            >
              Open body simulator <span aria-hidden="true">→</span>
            </a>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">
              <p className="font-medium text-neutral-100">No body simulator for this one</p>
              <p className="mt-1">{p.noSimReason}</p>
            </div>
          )}

          <Disclaimer />
        </motion.div>
      </motion.div>
    </div>
  )
}
