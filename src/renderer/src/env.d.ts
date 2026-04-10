/// <reference types="vite/client" />

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
