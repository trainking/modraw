import { app, BrowserWindow, Menu, dialog } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Modraw',
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

const menuTemplate: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new') },
      { type: 'separator' },
      {
        label: 'Export PNG',
        accelerator: 'CmdOrCtrl+Shift+E',
        click: () => mainWindow?.webContents.send('menu-export-png')
      },
      {
        label: 'Export SVG',
        accelerator: 'CmdOrCtrl+Alt+E',
        click: () => mainWindow?.webContents.send('menu-export-svg')
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => mainWindow?.webContents.send('menu-undo') },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => mainWindow?.webContents.send('menu-redo') },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { role: 'selectAll' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow?.webContents.send('menu-zoom-in') },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow?.webContents.send('menu-zoom-out') },
      { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.send('menu-zoom-reset') },
      { type: 'separator' },
      { role: 'toggleDevTools' },
      { role: 'togglefullscreen' }
    ]
  }
]

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
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
