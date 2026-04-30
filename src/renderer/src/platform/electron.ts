/**
 * Electron platform implementation — delegates to the IPC API exposed by the
 * preload script (`window.api`).
 */
import type {
  OpenResult,
  Platform,
  ReportFormat,
  SampleEntry,
  SaveResult
} from './types'
import { listSamples, loadSample } from './samples'

export const electronPlatform: Platform = {
  kind: 'electron',

  openProject(): Promise<OpenResult> {
    return window.api.openProject()
  },

  saveProject(data: string): Promise<SaveResult> {
    return window.api.saveProject(data)
  },

  saveReport(payload: {
    format: ReportFormat
    data: ArrayBuffer | string
    defaultName: string
  }): Promise<SaveResult> {
    return window.api.saveReport(payload)
  },

  openExternal(url: string): Promise<{ success: boolean }> {
    return window.api.openExternal(url)
  },

  listSamples(): SampleEntry[] {
    return listSamples()
  },

  loadSample(id: string): Promise<string> {
    return loadSample(id)
  }
}
