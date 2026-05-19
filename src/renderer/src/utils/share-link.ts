/**
 * Shareable model links (#5). Encodes the *design only* into the URL hash —
 * no analysis results and no #6 disposition/change log. Findings are
 * deterministically reproducible: the recipient opens the model and clicks
 * Analyze to get identical results from the bundled rule pack. For full
 * analyzed/audited work, share the .aitm file or an exported report instead.
 *
 * Client-side only: the fragment is never sent to a server, but anyone with
 * the link has the full design.
 */
import LZString from 'lz-string'
import { validateProject } from '@shared/schemas/project-schema'
import type { ThreatModelProject } from '@shared/types/model'

const SHARE_VERSION = 1
/** Hard ceiling — above this most chat/email clients mangle the URL. */
export const MAX_URL_LENGTH = 8000
/** Soft warning — may not paste cleanly everywhere. */
export const SOFT_URL_LENGTH = 2000
/** Decompression-bomb guard. */
const MAX_DECOMPRESSED_CHARS = 2_000_000

export interface ShareOptions {
  includeNotes: boolean
  anonymize: boolean
}

export interface EncodeResult {
  url: string
  length: number
  tooLarge: boolean
  warnLong: boolean
}

/** Apply the redaction options to produce a design-only, optionally
 *  anonymized copy of the project. Structural / analysis-relevant fields
 *  (types, security properties, classifications, topology) are preserved so
 *  the recipient's re-analysis is faithful. */
function buildShareableProject(
  project: ThreatModelProject,
  opts: ShareOptions
): ThreatModelProject {
  const p: ThreatModelProject = JSON.parse(JSON.stringify(project))

  if (opts.anonymize) {
    p.name = 'Shared Model'
    p.description = ''
    p.nodes.forEach((n, i) => {
      n.label = `Component ${i + 1}`
      // Free-text leak vectors — drop, keep structural/security props.
      delete n.properties.description
      delete n.properties.provider
      delete n.properties.modelType
    })
    p.flows.forEach((f, i) => {
      f.label = `Flow ${i + 1}`
    })
    p.boundaries.forEach((b, i) => {
      b.label = `Zone ${i + 1}`
    })
  }

  // Notes are free text (often real names/context). Dropped when anonymizing
  // or when the user opts out of sharing them.
  if (opts.anonymize || !opts.includeNotes) {
    p.notes = []
  }

  return p
}

export function encodeProjectToHash(
  project: ThreatModelProject,
  opts: ShareOptions,
  baseUrl: string
): EncodeResult {
  const payload = { v: SHARE_VERSION, p: buildShareableProject(project, opts) }
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload))
  const url = `${baseUrl}#m=${compressed}`
  return {
    url,
    length: url.length,
    tooLarge: url.length > MAX_URL_LENGTH,
    warnLong: url.length > SOFT_URL_LENGTH && url.length <= MAX_URL_LENGTH
  }
}

export interface DecodeOk {
  ok: true
  project: ThreatModelProject
}
export interface DecodeErr {
  ok: false
  error: string
}

/** Decode a `#m=...` fragment. Validates against the project schema and
 *  guards against oversized / malformed payloads. */
export function decodeHashToProject(rawHash: string): DecodeOk | DecodeErr {
  const m = /[#&]m=([^&]+)/.exec(rawHash)
  if (!m) return { ok: false, error: 'No shared model in the link.' }

  let json: string | null
  try {
    json = LZString.decompressFromEncodedURIComponent(m[1])
  } catch {
    json = null
  }
  if (!json) return { ok: false, error: 'The shared link is corrupt or unreadable.' }
  if (json.length > MAX_DECOMPRESSED_CHARS) {
    return { ok: false, error: 'The shared model is too large to open safely.' }
  }

  let obj: unknown
  try {
    obj = JSON.parse(json)
  } catch {
    return { ok: false, error: 'The shared link is corrupt.' }
  }

  const rec = obj as { v?: unknown; p?: unknown }
  if (rec.v !== SHARE_VERSION) {
    return {
      ok: false,
      error: `Unsupported share format (v${String(rec.v)}). Update the app or ask for a fresh link.`
    }
  }

  const validated = validateProject(rec.p)
  if (Array.isArray(validated)) {
    return { ok: false, error: `Shared model failed validation: ${validated[0]}` }
  }
  return { ok: true, project: validated as ThreatModelProject }
}
