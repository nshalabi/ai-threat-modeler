// Generate platform icons (PNG + ICO + ICNS-friendly PNG set) from resources/icon.svg.
// Run with: npm run icons
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svgPath = resolve(root, 'resources/icon.svg')
const outDir = resolve(root, 'resources')

if (!existsSync(svgPath)) {
  console.error('Missing resources/icon.svg')
  process.exit(1)
}
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const svg = readFileSync(svgPath)

const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
const pngBuffers = {}

for (const size of sizes) {
  const buf = await sharp(svg).resize(size, size).png().toBuffer()
  pngBuffers[size] = buf
}

// Main icon.png (electron-builder uses 512+ for mac/linux)
writeFileSync(resolve(outDir, 'icon.png'), pngBuffers[512])

// Windows ICO bundles multiple sizes
const icoBuffer = await pngToIco([
  pngBuffers[16],
  pngBuffers[24],
  pngBuffers[32],
  pngBuffers[48],
  pngBuffers[64],
  pngBuffers[128],
  pngBuffers[256]
])
writeFileSync(resolve(outDir, 'icon.ico'), icoBuffer)

console.log('Generated:')
console.log('  resources/icon.png (512x512)')
console.log('  resources/icon.ico (multi-size)')
