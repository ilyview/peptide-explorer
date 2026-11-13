import { useEffect, useState } from 'react'
import { Grid } from './components/Grid'
import { Disclaimer } from './components/ui'
import { getPeptide } from './data/peptides'
import { Simulator } from './sim/Simulator'

// Tiny hash router: "#/" is the grid, "#/sim/<id>" is the simulator.
// Hash routes work on any static host with no server config.
function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export function App() {
  const hash = useHash()
  const simId = hash.match(/^#\/sim\/([\w-]+)/)?.[1]
  const peptide = simId ? getPeptide(simId) : undefined

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <a href="#/" className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-black">Pe</span>
          Peptide Explorer
        </a>
      </header>

      <main className="flex-1">
        {peptide?.sim ? (
          <Simulator key={peptide.id} peptide={peptide} />
        ) : (
          <>
            <Disclaimer className="mb-6" />
            {simId && (
              <p className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-neutral-300">
                There is no simulator for that peptide. Pick one from the list below.
              </p>
            )}
            <Grid />
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-white/10 pt-4 text-xs text-neutral-500">
        Educational only, not medical advice. The body simulator is a simple illustration built from published trial
        averages, not a prediction for any individual. Many peptides sold online are unapproved and unregulated.
      </footer>
    </div>
  )
}
