import type { BodyStats, SimConfig } from '../data/peptides'

export interface Composition {
  weightKg: number
  fatKg: number
  leanKg: number
  bodyFatPct: number
  bmi: number
}

/** 0..1 values that drive the 3D body. */
export interface BodyShape {
  fat: number
  muscle: number
  /** 0 = male frame, 1 = female frame */
  frame: number
  /** 0..1 extra belly reduction */
  belly: number
  heightCm: number
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export function composition(stats: BodyStats): Composition {
  const fatKg = (stats.weightKg * stats.bodyFatPct) / 100
  const h = stats.heightCm / 100
  return {
    weightKg: stats.weightKg,
    fatKg,
    leanKg: stats.weightKg - fatKg,
    bodyFatPct: stats.bodyFatPct,
    bmi: stats.weightKg / (h * h),
  }
}

export function applyEffect(stats: BodyStats, sim: SimConfig, dose: number, weeks: number) {
  const start = composition(stats)
  const e = sim.effectCurve(dose, weeks, stats)
  const fatKg = Math.max(0, start.fatKg + e.fatKg)
  const leanKg = Math.max(0, start.leanKg + e.leanKg)
  const weightKg = fatKg + leanKg
  const h = stats.heightCm / 100
  const after: Composition = {
    weightKg,
    fatKg,
    leanKg,
    bodyFatPct: (fatKg / weightKg) * 100,
    bmi: weightKg / (h * h),
  }
  return { start, after, belly: e.belly }
}

/**
 * Turn masses into blend amounts. Uses fat mass and lean mass per height²
 * so that height, weight and body fat % all interact sensibly.
 */
export function toShape(stats: BodyStats, c: Composition, belly = 0): BodyShape {
  const h2 = (stats.heightCm / 100) ** 2
  const fmi = c.fatKg / h2
  const ffmi = c.leanKg / h2
  const female = stats.gender === 'female'
  return {
    fat: clamp01(female ? (fmi - 3.5) / 15 : (fmi - 2) / 14),
    muscle: clamp01(female ? (ffmi - 12.5) / 9 : (ffmi - 15) / 11),
    frame: female ? 1 : 0,
    belly: clamp01(belly),
    heightCm: stats.heightCm,
  }
}
