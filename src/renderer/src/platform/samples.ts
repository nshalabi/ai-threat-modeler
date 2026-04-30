/**
 * Bundled sample projects — embedded at build time via Vite's import.meta.glob
 * so they're available to both the Electron app and the web build without any
 * file-system access.
 */
import type { SampleEntry } from './types'

// Vite reads the .aitm files at build time and inlines them as raw strings.
const rawSamples = import.meta.glob('../../../../samples/*.aitm', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

interface ParsedSample {
  entry: SampleEntry
  raw: string
}

const samples: ParsedSample[] = Object.entries(rawSamples)
  .map(([path, raw]) => {
    const filename = path.split('/').pop() ?? path
    const id = filename.replace(/\.aitm$/i, '')
    let name = id
    let description = ''
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed.name === 'string') name = parsed.name
      if (typeof parsed.description === 'string') description = parsed.description
    } catch {
      // Malformed sample — fall back to filename.
    }
    return { entry: { id, name, description }, raw }
  })
  .sort((a, b) => a.entry.name.localeCompare(b.entry.name))

export function listSamples(): SampleEntry[] {
  return samples.map((s) => s.entry)
}

export async function loadSample(id: string): Promise<string> {
  const found = samples.find((s) => s.entry.id === id)
  if (!found) throw new Error(`Sample not found: ${id}`)
  return found.raw
}
