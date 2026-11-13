import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CATEGORIES, PEPTIDES, type Peptide } from '../data/peptides'
import { ChainIcon, EvidenceTag } from './ui'
import { Detail } from './Detail'

export function Grid() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [open, setOpen] = useState<Peptide | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PEPTIDES.filter(
      (p) =>
        (category === 'All' || p.category === category) &&
        (!q || [p.name, p.alsoKnownAs ?? '', p.summary, p.category].join(' ').toLowerCase().includes(q)),
    )
  }, [query, category])

  return (
    <>
      <section className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Peptides, in plain words</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Pick a peptide to see what it is, what it does, and how strong the evidence is. Approved medicines also have
          an illustrative body simulator.
        </p>
      </section>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search peptides"
          aria-label="Search peptides"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                category === c ? 'bg-cyan-300 font-medium text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          No peptides match. Try a different search or filter.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <motion.button
                layoutId={`card-${p.id}`}
                onClick={() => setOpen(p)}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900 p-5 text-left hover:border-white/25 focus-visible:outline-2 focus-visible:outline-cyan-300"
                style={{ borderRadius: 16 }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <ChainIcon count={p.residues} color={p.color} />
                  <EvidenceTag level={p.evidence} />
                </div>
                <h2 className="text-xl font-semibold text-white">{p.name}</h2>
                {p.alsoKnownAs && <p className="text-sm text-slate-400">{p.alsoKnownAs}</p>}
                <p className="mt-2 text-slate-300">{p.summary}</p>
                <p className="mt-auto pt-4 text-xs uppercase tracking-wider text-slate-500">{p.category}</p>
              </motion.button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>{open && <Detail peptide={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  )
}
