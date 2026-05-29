import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// Single source of truth for the app version: package.json. The renderer
// reads it via the __APP_VERSION__ build-time constant so AboutDialog and
// report-data stay in sync automatically.
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  version: string
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@core': resolve('src/core/index.ts')
      }
    },
    plugins: [react()]
  }
})
