# Peptide Explorer

Educational site: browse peptides, open a fly-out with a spinning 3D model and plain-language info, and try an illustrative body simulator. **Not medical advice.**

## Run

```bash
npm install
npm run dev
```

`npm run build` writes a static site to `dist/` that can be hosted on Vercel, Netlify or GitHub Pages as-is.

## Where things are

- `src/data/peptides.ts`: all peptide copy, sources, dose ranges and effect curves. Add a peptide here.
- `src/components/`: grid, fly-out detail panel, 3D molecule.
- `src/sim/`: body simulator (`Body.tsx` is the 3D mannequin, `model.ts` the maths).

## Notes

- The body is a procedural mannequin and the molecules are stylized chains (real amino-acid count, not the real 3D structure). Both are labelled as such in the UI.
- Effect curves are simple illustrations fitted to headline trial averages. Sliders are capped to label/trial ranges.
- Peptides without human body-composition data have no simulator on purpose.
