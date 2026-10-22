import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Relative base lets the build work under any GitHub Pages path (/<repo>/) with no router.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
