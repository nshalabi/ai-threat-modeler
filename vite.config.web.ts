/**
 * Web build — produces a static single-page app deployable to GitHub Pages.
 * Uses the same renderer source as the Electron build, but defines
 * `__APP_TARGET__` so the platform adapter selects the browser implementation.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const repoBase = process.env.VITE_BASE ?? '/ai-threat-modeler/'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: repoBase,
  define: {
    __APP_TARGET__: JSON.stringify('web')
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false
  },
  server: {
    port: 5174
  }
})
