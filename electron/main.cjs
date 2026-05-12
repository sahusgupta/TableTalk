const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const branding = require('../branding.config.json');

const isDev = process.env.ELECTRON_DEV === 'true';

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disk-cache-size', '0');

const windows = new Map();
const validRoutes = new Set(['floor', 'builder', 'profiles', 'signals', 'summary', 'pilot', 'outreach']);

function getDataPath() {
  return path.join(app.getPath('userData'), 'tablemanager-db.json');
}

function readLocalDatabase() {
  const filePath = getDataPath();
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeLocalDatabase(state) {
  const filePath = getDataPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        state
      },
      null,
      2
    )
  );
  return { ok: true, path: filePath };
}

ipcMain.handle('open-route-window', (_event, route) => {
  const normalizedRoute = route === 'outreach' ? 'signals' : validRoutes.has(route) ? route : 'floor';
  createWindow(normalizedRoute);
});

ipcMain.handle('load-state', () => readLocalDatabase());

ipcMain.handle('save-state', (_event, state) => writeLocalDatabase(state));

function loadRoute(window, route) {
  if (isDev) {
    window.loadURL(`http://127.0.0.1:5173/#/${route}`);
    return;
  }

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
    hash: `/${route}`
  });
}

function createWindow(route = 'floor') {
  const existing = windows.get(route);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return existing;
  }

  const routeConfig = {
    floor: { width: 1280, height: 860, minWidth: 1040, minHeight: 720, title: branding.desktop.windowTitles.floor },
    builder: { width: 920, height: 760, minWidth: 760, minHeight: 620, title: branding.desktop.windowTitles.builder },
    profiles: { width: 940, height: 760, minWidth: 760, minHeight: 620, title: branding.desktop.windowTitles.profiles },
    signals: { width: 980, height: 780, minWidth: 780, minHeight: 640, title: branding.desktop.windowTitles.signals },
    summary: { width: 1040, height: 820, minWidth: 820, minHeight: 640, title: branding.desktop.windowTitles.summary },
    pilot: { width: 980, height: 760, minWidth: 780, minHeight: 620, title: branding.desktop.windowTitles.pilot }
  }[route] ?? { width: 900, height: 700, minWidth: 700, minHeight: 560, title: branding.product.name };

  const mainWindow = new BrowserWindow({
    ...routeConfig,
    backgroundColor: branding.desktop.backgroundColor,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    windows.delete(route);
  });

  windows.set(route, mainWindow);
  loadRoute(mainWindow, route);

  if (isDev && route === 'floor') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          { role: 'reload' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ])
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
