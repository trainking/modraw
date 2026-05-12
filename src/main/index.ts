import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Modraw',
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('file-save-mdr', async (_event, payload: { defaultName: string; content: string }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: 'Save MoDraw canvas',
    defaultPath: payload.defaultName.endsWith('.mdr') ? payload.defaultName : `${payload.defaultName}.mdr`,
    filters: [
      { name: 'MoDraw Canvas', extensions: ['mdr'] }
    ]
  })
  if (result.canceled || !result.filePath) return { canceled: true as const }

  const filePath = result.filePath.endsWith('.mdr') ? result.filePath : `${result.filePath}.mdr`
  await writeFile(filePath, payload.content, 'utf-8')
  return { canceled: false as const, filePath }
})

ipcMain.handle('file-open-mdr', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Open MoDraw canvas',
    properties: ['openFile'],
    filters: [
      { name: 'MoDraw Canvas', extensions: ['mdr'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return { canceled: true as const }

  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  return { canceled: false as const, filePath, content }
})

app.whenReady().then(() => {
  app.applicationMenu = null
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
