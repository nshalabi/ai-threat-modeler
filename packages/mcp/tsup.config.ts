import { defineConfig } from 'tsup'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf8')
) as { version: string }

// The desktop app's version — the @core barrel re-exports report modules that
// read __APP_VERSION__ at module scope. MCP never calls them, but define it so
// a retained module can't crash at startup.
const appPkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
) as { version: string }

// Bundle the stdio MCP server into a single runnable ESM file.
//
// The server is a thin adapter over the headless core in ../../src. esbuild
// resolves the @core / @shared aliases to that source and inlines it (plus the
// JSON knowledge packs and nanoid) so the published package is self-contained.
// Only the MCP SDK and zod stay external — they are declared dependencies.
const srcRoot = resolve(__dirname, '../../src')

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  bundle: true,
  clean: true,
  sourcemap: false,
  // Keep declared deps external; bundle everything else (core source + nanoid).
  external: ['@modelcontextprotocol/sdk', 'zod'],
  banner: { js: '#!/usr/bin/env node' },
  define: {
    __SERVER_VERSION__: JSON.stringify(pkg.version),
    __APP_VERSION__: JSON.stringify(appPkg.version)
  },
  esbuildOptions(options) {
    options.alias = {
      '@core': resolve(srcRoot, 'core/index.ts'),
      '@shared': resolve(srcRoot, 'shared')
    }
  }
})
