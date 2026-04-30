/**
 * Platform abstraction — lets the renderer call the same APIs whether it's
 * running inside Electron (with `window.api` IPC) or in a browser tab
 * (deployed to GitHub Pages).
 */

export type ReportFormat = 'pdf' | 'docx' | 'csv'

export interface SaveResult {
  success: boolean
  path?: string
}

export interface OpenResult {
  success: boolean
  data?: string
  path?: string
}

export interface SampleEntry {
  id: string
  name: string
  description: string
}

export interface Platform {
  /** Display name of the runtime — used for diagnostics and About dialog. */
  readonly kind: 'electron' | 'web'

  /** Open a project file via native dialog (electron) or file input (web). */
  openProject(): Promise<OpenResult>

  /** Save a project file via native dialog (electron) or anchor download (web). */
  saveProject(data: string, defaultName?: string): Promise<SaveResult>

  /** Save a generated report (PDF/DOCX/CSV) to disk. */
  saveReport(payload: {
    format: ReportFormat
    data: ArrayBuffer | string
    defaultName: string
  }): Promise<SaveResult>

  /** Open an external URL — native shell on electron, new tab on web. */
  openExternal(url: string): Promise<{ success: boolean }>

  /** List bundled sample projects. Both platforms include the same set. */
  listSamples(): SampleEntry[]

  /** Load a bundled sample by id. Returns the parsed project JSON as a string. */
  loadSample(id: string): Promise<string>
}
