/**
 * Web platform implementation — uses standard browser APIs (file input, blob
 * downloads, window.open) so the same renderer code can run on GitHub Pages
 * with no Electron dependencies.
 */
import type {
  OpenResult,
  Platform,
  ReportFormat,
  SampleEntry,
  SaveResult
} from './types'
import { listSamples, loadSample } from './samples'

const MIME: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  csv: 'text/csv'
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'

    const cleanup = () => {
      input.remove()
      window.removeEventListener('focus', onFocus)
    }

    // If the user cancels the picker, no `change` event fires. Detect via
    // window focus to resolve with null.
    let resolved = false
    const onFocus = () => {
      // Give the change event a chance to fire first.
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(null)
        }
      }, 300)
    }

    input.addEventListener('change', () => {
      resolved = true
      const file = input.files?.[0] ?? null
      cleanup()
      resolve(file)
    })

    document.body.appendChild(input)
    window.addEventListener('focus', onFocus, { once: true })
    input.click()
  })
}

export const webPlatform: Platform = {
  kind: 'web',

  async openProject(): Promise<OpenResult> {
    const file = await pickFile('.aitm,application/json')
    if (!file) return { success: false }
    const data = await file.text()
    return { success: true, data, path: file.name }
  },

  async saveProject(data: string, defaultName = 'project.aitm'): Promise<SaveResult> {
    const blob = new Blob([data], { type: 'application/json' })
    const name = defaultName.endsWith('.aitm') ? defaultName : `${defaultName}.aitm`
    downloadBlob(blob, name)
    return { success: true, path: name }
  },

  async saveReport(payload: {
    format: ReportFormat
    data: ArrayBuffer | string
    defaultName: string
  }): Promise<SaveResult> {
    const { format, data, defaultName } = payload
    const blob =
      typeof data === 'string'
        ? new Blob([data], { type: MIME[format] })
        : new Blob([data], { type: MIME[format] })
    downloadBlob(blob, defaultName)
    return { success: true, path: defaultName }
  },

  async openExternal(url: string): Promise<{ success: boolean }> {
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    return { success: !!opened }
  },

  listSamples(): SampleEntry[] {
    return listSamples()
  },

  loadSample(id: string): Promise<string> {
    return loadSample(id)
  }
}
