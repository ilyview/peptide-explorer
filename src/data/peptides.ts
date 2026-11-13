// All peptide content lives here. To add a peptide, add an object to PEPTIDES.
//
// IMPORTANT: the `sim` block is a simple, illustrative model built from the
// headline results of the cited trials. It is NOT a medical prediction.

export type EvidenceLevel = 'approved' | 'limited' | 'animal'

export type Category = 'Weight & metabolism' | 'Growth hormone' | 'Healing & recovery'

export interface Source {
  label: string
  url: string
}

export interface BodyStats {
  gender: 'male' | 'female'
  heightCm: number
  weightKg: number
  bodyFatPct: number
}

/** Change in body composition, in kg, relative to the starting body. */
export interface EffectResult {
  fatKg: number
  leanKg: number
  /** 0..1 extra "belly only" reduction, for drugs that mainly target belly fat. */
  belly: number
}

export interface SimConfig {
  doseUnit: string
  dosePer: 'day' | 'week'
  /** Allowed slider stops. Capped to the range used in the label / main trials. */
  doseSteps: number[]
  /** Longest duration the main trial ran. The slider stops here. */
  maxWeeks: number
  /** Who the trial numbers come from. Shown next to the readout. */
  studiedIn: string
  /** Extra plain-language caveats for the readout. */
  notes: string[]
  effectCurve: (dose: number, weeks: number, stats: BodyStats) => EffectResult
}

export interface Peptide {
  id: string
  name: string
  alsoKnownAs?: string
  category: Category
  evidence: EvidenceLevel
  evidenceNote: string
  summary: string
  whatItIs: string
  whatItDoes: string
  howItWorks: string
  sideEffects: { common: string[]; rare: string[] }
  durationOfEffect: string
  /** Number of amino acids. Drives the stylized 3D chain. */
  residues: number
  color: string
  sources: Source[]
  /** Missing = no simulator (not enough human data to base one on). */
  sim?: SimConfig
  noSimReason?: string
}

// ---------- helpers for the illustrative effect curves ----------

/** Rises quickly then levels off: 0 at week 0, ~0.63 at `tau` weeks, toward 1. */
const plateau = (weeks: number, tau: number) => 1 - Math.exp(-weeks / tau)

/** Look up how strong a dose step is (0..1) from a table matching doseSteps. */
const potencyAt = (steps: number[], potency: number[], dose: number) => {
  const i = steps.indexOf(dose)
  return i >= 0 ? potency[i] : 0
}

const startMasses = (s: BodyStats) => {
  const fat = (s.weightKg * s.bodyFatPct) / 100
  return { fat, lean: s.weightKg - fat }
}

/** Weight-loss drugs: lose a % of body weight, split between fat and lean. */
function weightLossCurve(opts: {
  steps: number[]
  potency: number[]
  maxLossPct: number
  tau: number
  fatShare: number
}) {
  return (dose: number, weeks: number, stats: BodyStats): EffectResult => {
    const { fat } = startMasses(stats)
    const pct = opts.maxLossPct * potencyAt(opts.steps, opts.potency, dose) * plateau(weeks, opts.tau)
    const lossKg = (stats.weightKg * pct) / 100
    // Never let the model strip away essential fat.
    const fatLoss = Math.min(lossKg * opts.fatShare, Math.max(0, fat - stats.weightKg * 0.06))
    const leanLoss = lossKg * (1 - opts.fatShare)
    return { fatKg: -fatLoss, leanKg: -leanLoss, belly: 0 }
  }
}

const SEMA_STEPS = [0.25, 0.5, 1, 1.7, 2.4]
const TIRZ_STEPS = [2.5, 5, 7.5, 10, 12.5, 15]
const GH_STEPS = [0.5, 1, 1.5, 2, 2.5, 3]
const TESA_STEPS = [1, 2]

export const PEPTIDES: Peptide[] = [
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    alsoKnownAs: 'Wegovy, Ozempic',
    category: 'Weight & metabolism',
    evidence: 'approved',
    evidenceNote: 'FDA-approved for type 2 diabetes and for weight management. Prescription only.',
    summary: 'A weekly shot that turns down hunger and helps control blood sugar.',
    whatItIs:
      'A lab-made copy of a gut hormone called GLP-1, tweaked so it lasts a whole week instead of a few minutes.',
    whatItDoes:
      'Makes you feel full sooner and for longer, so most people eat less and lose weight. It also helps the body handle sugar after meals.',
    howItWorks:
      'After you eat, your gut sends a "we\'re full" text message to your brain. That message normally fades in minutes. Semaglutide is the same message written in permanent marker, so your brain keeps hearing "full" all week.',
    sideEffects: {
      common: ['Feeling sick (nausea)', 'Diarrhea or constipation', 'Throwing up', 'Stomach pain', 'Tiredness'],
      rare: [
        'Inflamed pancreas (pancreatitis)',
        'Gallbladder problems',
        'Kidney trouble from dehydration',
        'Label warning about thyroid tumors seen in rodents',
      ],
    },
    durationOfEffect:
      'Half-life is about 1 week, which is why it is taken once a week. It takes 4 to 5 weeks to reach a steady level, and about 5 weeks to leave the body after stopping. Weight often comes back after stopping.',
    residues: 31,
    color: '#34d399',
    sources: [
      { label: 'Wilding et al. 2021, NEJM (STEP 1 trial)', url: 'https://doi.org/10.1056/NEJMoa2032183' },
      { label: 'Wegovy prescribing information (DailyMed)', url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=wegovy' },
    ],
    sim: {
      doseUnit: 'mg',
      dosePer: 'week',
      doseSteps: SEMA_STEPS,
      maxWeeks: 68,
      studiedIn: 'Adults with BMI 30+ (or 27+ with a weight-related condition), alongside diet and exercise. Average loss was about 15% of body weight at 68 weeks on 2.4 mg.',
      notes: [
        'In real use the dose is raised slowly over about 16 weeks; this model ignores that.',
        'Roughly 4 in 10 kg lost in the trial sub-study was lean tissue, not fat.',
      ],
      effectCurve: weightLossCurve({
        steps: SEMA_STEPS,
        potency: [0.2, 0.35, 0.6, 0.85, 1],
        maxLossPct: 15.5,
        tau: 20,
        fatShare: 0.6,
      }),
    },
  },
  {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    alsoKnownAs: 'Zepbound, Mounjaro',
    category: 'Weight & metabolism',
    evidence: 'approved',
    evidenceNote: 'FDA-approved for type 2 diabetes and for weight management. Prescription only.',
    summary: 'A weekly shot that copies two gut hormones at once to cut appetite.',
    whatItIs:
      'One molecule that acts like two gut hormones, GIP and GLP-1. It is a chain of 39 amino acids with a fatty tail that keeps it in the blood for days.',
    whatItDoes:
      'Lowers appetite, slows how fast the stomach empties, and improves blood sugar. In trials it produced some of the largest weight losses seen with a medicine.',
    howItWorks:
      'Imagine your body has two "I\'m full" doorbells. Semaglutide rings one. Tirzepatide rings both at the same time, so the "stop eating" signal is louder.',
    sideEffects: {
      common: ['Feeling sick (nausea)', 'Diarrhea or constipation', 'Throwing up', 'Less appetite', 'Indigestion'],
      rare: [
        'Inflamed pancreas (pancreatitis)',
        'Gallbladder problems',
        'Low blood sugar when mixed with some diabetes drugs',
        'Label warning about thyroid tumors seen in rodents',
      ],
    },
    durationOfEffect:
      'Half-life is about 5 days, so it is taken once a week. It takes about 4 weeks to reach a steady level. Weight often comes back after stopping.',
    residues: 39,
    color: '#60a5fa',
    sources: [
      { label: 'Jastreboff et al. 2022, NEJM (SURMOUNT-1 trial)', url: 'https://doi.org/10.1056/NEJMoa2206038' },
      { label: 'Zepbound prescribing information (DailyMed)', url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=zepbound' },
    ],
    sim: {
      doseUnit: 'mg',
      dosePer: 'week',
      doseSteps: TIRZ_STEPS,
      maxWeeks: 72,
      studiedIn: 'Adults with BMI 30+ (or 27+ with a weight-related condition), without diabetes. Average loss at 72 weeks was about 15% (5 mg), 19.5% (10 mg) and 21% (15 mg).',
      notes: [
        'In real use the dose starts at 2.5 mg and goes up every 4 weeks; this model ignores that.',
        'About three quarters of the weight lost in the trial sub-study was fat.',
      ],
      effectCurve: weightLossCurve({
        steps: TIRZ_STEPS,
        potency: [0.4, 0.72, 0.85, 0.93, 0.97, 1],
        maxLossPct: 22,
        tau: 24,
        fatShare: 0.75,
      }),
    },
  },
  {
    id: 'somatropin',
    name: 'Somatropin',
    alsoKnownAs: 'Human growth hormone, HGH',
    category: 'Growth hormone',
    evidence: 'approved',
    evidenceNote: 'FDA-approved for growth hormone deficiency and a few other conditions. Not approved for anti-aging or bodybuilding.',
    summary: 'Lab-made human growth hormone, for people whose bodies do not make enough.',
    whatItIs:
      'An exact copy of the growth hormone your pituitary gland makes. It is a big molecule: 191 amino acids folded into a small protein.',
    whatItDoes:
      'In people who lack growth hormone, it helps children grow and helps adults lose some fat, gain some lean tissue, and strengthen bones.',
    howItWorks:
      'Growth hormone is like a manager that walks around the body telling cells to "build and repair". It tells the liver to release a helper called IGF-1, which passes the message on to muscles and bones, and it tells fat cells to release stored fat.',
    sideEffects: {
      common: ['Puffy hands and feet (water retention)', 'Joint and muscle aches', 'Tingling or numb hands (carpal tunnel)', 'Headache'],
      rare: [
        'Higher blood sugar or diabetes',
        'Pressure build-up in the skull',
        'May speed up growth of an existing tumor',
        'Coarse facial features with long-term overuse',
      ],
    },
    durationOfEffect:
      'The hormone itself clears in a few hours (half-life about 3 to 4 hours after a shot), so it is taken daily. Its helper IGF-1 stays raised for about a day. Body changes build slowly over months.',
    residues: 191,
    color: '#f59e0b',
    sources: [
      { label: 'Molitch et al. 2011, Endocrine Society guideline for adult GH deficiency', url: 'https://doi.org/10.1210/jc.2010-2692' },
      { label: 'Somatropin prescribing information (DailyMed)', url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=somatropin' },
    ],
    sim: {
      doseUnit: 'IU',
      dosePer: 'day',
      doseSteps: GH_STEPS,
      maxWeeks: 52,
      studiedIn: 'Adults with diagnosed growth hormone deficiency. Typical results over 6 to 12 months are 2 to 3 kg less fat and 2 to 3 kg more lean mass.',
      notes: [
        '3 IU is about 1 mg. Doctors set the dose from blood tests (IGF-1), not from a chart.',
        'Part of the early "lean" gain is water, not muscle.',
        'People with normal hormone levels see smaller changes and more side effects.',
      ],
      effectCurve: (dose, weeks) => {
        const d = dose / (dose + 1.5) / (3 / 4.5)
        const t = plateau(weeks, 16)
        return { fatKg: -3 * d * t, leanKg: 2.5 * d * t, belly: 0.1 * d * t }
      },
    },
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    alsoKnownAs: 'Egrifta',
    category: 'Growth hormone',
    evidence: 'approved',
    evidenceNote: 'FDA-approved only for excess belly fat in adults with HIV-related lipodystrophy. Not approved for general weight loss.',
    summary: 'A daily shot that nudges the body to release more of its own growth hormone.',
    whatItIs:
      'A sturdier copy of GHRH, the natural 44-amino-acid signal your brain uses to ask the pituitary gland for growth hormone.',
    whatItDoes:
      'Reduces deep belly fat (the kind around the organs) in people with HIV-related fat build-up. It does not do much to overall body weight.',
    howItWorks:
      'Instead of adding growth hormone from outside, it knocks on the pituitary gland\'s door and says "please send out some of yours". The body still controls how much is released, in its normal pulses.',
    sideEffects: {
      common: ['Redness or itching where injected', 'Joint and muscle aches', 'Puffy hands and feet', 'Tingling or numbness'],
      rare: ['Higher blood sugar', 'Allergic reactions', 'May speed up growth of an existing tumor'],
    },
    durationOfEffect:
      'Very short half-life (roughly 30 minutes), but the growth hormone pulse it triggers lasts for hours. Belly fat changes take about 3 to 6 months, and the fat returns within months of stopping.',
    residues: 44,
    color: '#a78bfa',
    sources: [
      { label: 'Falutz et al. 2007, NEJM (tesamorelin in HIV patients)', url: 'https://doi.org/10.1056/NEJMoa072375' },
      { label: 'Egrifta prescribing information (DailyMed)', url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=egrifta' },
    ],
    sim: {
      doseUnit: 'mg',
      dosePer: 'day',
      doseSteps: TESA_STEPS,
      maxWeeks: 26,
      studiedIn: 'Adults with HIV and excess belly fat. Deep belly fat fell about 15% at 26 weeks on 2 mg, with little change in total weight.',
      notes: [
        'Results in people without HIV-related fat build-up are much less studied.',
        'The effect faded within months when people in the trial stopped.',
      ],
      effectCurve: (dose, weeks) => {
        const d = dose >= 2 ? 1 : 0.5
        const t = plateau(weeks, 12)
        return { fatKg: -1.1 * d * t, leanKg: 1.2 * d * t, belly: 0.3 * d * t }
      },
    },
  },
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    category: 'Growth hormone',
    evidence: 'limited',
    evidenceNote: 'Tested in a few small human studies. Never approved as a medicine anywhere.',
    summary: 'A tiny 5-piece peptide that triggers a pulse of growth hormone.',
    whatItIs:
      'A very short chain of 5 amino acids, designed in the 1990s to copy the hunger hormone ghrelin\'s effect on growth hormone.',
    whatItDoes:
      'In short human studies it caused a brief burst of growth hormone. Trials for helping the gut recover after surgery did not show a clear benefit. Claims about muscle gain or fat loss have not been tested properly in people.',
    howItWorks:
      'Your pituitary gland has a "release growth hormone" button that the hormone ghrelin normally presses. Ipamorelin is a small key cut to fit that same button, without pressing most of ghrelin\'s other buttons.',
    sideEffects: {
      common: ['Not well mapped in people', 'Headache and flushing have been reported', 'Soreness where injected'],
      rare: ['Long-term safety is unknown', 'Products sold online are unregulated and may be impure or mislabeled'],
    },
    durationOfEffect:
      'Half-life is about 2 hours. The growth hormone burst peaks in under an hour and is gone within a few hours.',
    residues: 5,
    color: '#f472b6',
    sources: [
      { label: 'Raun et al. 1998, Eur J Endocrinol (first description)', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=ipamorelin+first+selective+growth+hormone+secretagogue' },
      { label: 'Human studies of ipamorelin (PubMed search)', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=ipamorelin+human' },
    ],
    noSimReason:
      'There are no good human studies measuring body changes with ipamorelin, so any simulation would be made up. We would rather show nothing than guess.',
  },
  {
    id: 'bpc-157',
    name: 'BPC-157',
    alsoKnownAs: 'Body Protection Compound',
    category: 'Healing & recovery',
    evidence: 'animal',
    evidenceNote: 'Almost all research is in rats and cells. Not approved for people, and banned in sport by WADA.',
    summary: 'A 15-piece peptide studied for healing in rats, with almost no human research.',
    whatItIs:
      'A chain of 15 amino acids based on a fragment of a protein found in stomach juice.',
    whatItDoes:
      'In rat studies it appeared to speed up healing of tendons, muscles and the gut lining. Nobody knows yet if this works, or is safe, in people.',
    howItWorks:
      'In animals it seems to act like a site foreman at an injury: calling in new blood vessels and repair cells. That is the theory from lab studies; it has not been confirmed in humans.',
    sideEffects: {
      common: ['Unknown in people: no proper safety trials exist'],
      rare: [
        'Theoretical worry that growing new blood vessels could feed tumors',
        'Products sold online are unregulated and may be impure or mislabeled',
        'The FDA has raised safety concerns about pharmacies compounding it',
      ],
    },
    durationOfEffect: 'Unknown in people. In rats it is cleared from the blood in well under an hour.',
    residues: 15,
    color: '#fb7185',
    sources: [
      { label: 'BPC-157 research (PubMed search)', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=BPC+157' },
      { label: 'WADA Prohibited List', url: 'https://www.wada-ama.org/en/prohibited-list' },
    ],
    noSimReason:
      'This peptide has only been studied in animals. There is no human data to build a body simulation from, and no established human dose.',
  },
]

export const CATEGORIES: Category[] = ['Weight & metabolism', 'Growth hormone', 'Healing & recovery']

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  approved: 'Approved medicine',
  limited: 'Limited human data',
  animal: 'Animal studies only',
}

export const getPeptide = (id: string) => PEPTIDES.find((p) => p.id === id)
