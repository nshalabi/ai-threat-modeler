/// <reference types="vite/client" />

// Build-time constant injected by Vite — set to 'web' by vite.config.web.ts.
// Undefined when running under electron-vite, in which case the platform
// adapter falls back to feature detection on `window.api`.
declare const __APP_TARGET__: 'electron' | 'web' | undefined

// Single source of truth for the app version — injected at build time from
// package.json by electron.vite.config.ts and vite.config.web.ts.
declare const __APP_VERSION__: string

interface Window {
  api: {
    saveProject: (data: string) => Promise<{ success: boolean; path?: string }>
    openProject: () => Promise<{ success: boolean; data?: string; path?: string }>
    exportFindings: (data: string) => Promise<{ success: boolean; path?: string }>
    saveReport: (payload: {
      format: 'pdf' | 'docx' | 'csv'
      data: ArrayBuffer | string
      defaultName: string
    }) => Promise<{ success: boolean; path?: string }>
    openExternal: (url: string) => Promise<{ success: boolean }>
  }
}
