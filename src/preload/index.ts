import { contextBridge, ipcRenderer } from 'electron'

const api = {
  saveProject: (data: string) => ipcRenderer.invoke('project:save', data),
  openProject: () => ipcRenderer.invoke('project:open'),
  exportFindings: (data: string) => ipcRenderer.invoke('project:export-json', data),
  saveReport: (
    payload: { format: 'pdf' | 'docx' | 'csv'; data: ArrayBuffer | string; defaultName: string }
  ) => ipcRenderer.invoke('report:save', payload),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
