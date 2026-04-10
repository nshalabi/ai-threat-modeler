import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'

const iconPath = join(__dirname, '../../resources/icon.png')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1400,
    minHeight: 900,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sonny.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function setupIpcHandlers(): void {
  ipcMain.handle('project:save', async (_event, data: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Threat Model Project',
        defaultPath: 'untitled.aitm',
        filters: [
          { name: 'Sonny Project', extensions: ['aitm'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (canceled || !filePath) {
        return { success: false }
      }

      fs.writeFileSync(filePath, data, 'utf-8')
      return { success: true, path: filePath }
    } catch (error) {
      console.error('Failed to save project:', error)
      return { success: false }
    }
  })

  ipcMain.handle('project:open', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open Threat Model Project',
        filters: [
          { name: 'Sonny Project', extensions: ['aitm'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (canceled || filePaths.length === 0) {
        return { success: false }
      }

      const filePath = filePaths[0]
      const data = fs.readFileSync(filePath, 'utf-8')
      return { success: true, data, path: filePath }
    } catch (error) {
      console.error('Failed to open project:', error)
      return { success: false }
    }
  })

  ipcMain.handle(
    'report:save',
    async (
      _event,
      payload: { format: 'pdf' | 'docx' | 'csv'; data: ArrayBuffer | string; defaultName: string }
    ) => {
      try {
        const filters: Record<string, Electron.FileFilter[]> = {
          pdf: [{ name: 'PDF Report', extensions: ['pdf'] }],
          docx: [{ name: 'Word Document', extensions: ['docx'] }],
          csv: [{ name: 'CSV', extensions: ['csv'] }]
        }
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save Report',
          defaultPath: payload.defaultName,
          filters: filters[payload.format] ?? [{ name: 'All Files', extensions: ['*'] }]
        })
        if (canceled || !filePath) return { success: false }

        if (payload.format === 'csv') {
          fs.writeFileSync(filePath, String(payload.data), 'utf-8')
        } else {
          const buf = Buffer.from(payload.data as ArrayBuffer)
          fs.writeFileSync(filePath, buf)
        }
        return { success: true, path: filePath }
      } catch (error) {
        console.error('Failed to save report:', error)
        return { success: false }
      }
    }
  )

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (typeof url !== 'string') return { success: false }
    if (!/^https?:\/\//i.test(url)) return { success: false }
    await shell.openExternal(url)
    return { success: true }
  })

  ipcMain.handle('project:export-json', async (_event, data: string) => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Findings as JSON',
        defaultPath: 'findings.json',
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (canceled || !filePath) {
        return { success: false }
      }

      fs.writeFileSync(filePath, data, 'utf-8')
      return { success: true, path: filePath }
    } catch (error) {
      console.error('Failed to export findings:', error)
      return { success: false }
    }
  })
}
