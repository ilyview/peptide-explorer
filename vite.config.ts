import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' keeps the build working on GitHub Pages sub-paths as well as Vercel/Netlify.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
