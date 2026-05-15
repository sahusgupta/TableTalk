const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const branding = require('../branding.config.json');

const isDev = process.env.ELECTRON_DEV === 'true';

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disk-cache-size', '0');

const windows = new Map();
const validRoutes = new Set(['floor', 'builder', 'profiles', 'signals', 'summary', 'customization', 'kpis', 'pilot', 'outreach']);
let database;

function getLegacyDataPath() {
  return path.join(app.getPath('userData'), 'tablemanager-db.json');
}

function getDataPath() {
  return path.join(app.getPath('userData'), 'tablemanager.sqlite3');
}

function getDatabase() {
  if (database) return database;
  const filePath = getDataPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  database = new DatabaseSync(filePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL,
      saved_at TEXT NOT NULL,
      state_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birthday TEXT,
      membership_start_date TEXT,
      membership_expiration_date TEXT,
      total_time_played_hours REAL NOT NULL DEFAULT 0,
      last_session_time_played_hours REAL NOT NULL DEFAULT 0,
      preferred_game_id TEXT,
      preferred_stakes TEXT,
      notes TEXT,
      raw_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_companions (
      profile_id TEXT NOT NULL,
      companion_profile_id TEXT NOT NULL,
      PRIMARY KEY (profile_id, companion_profile_id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (companion_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);
  return database;
}

function readLegacyLocalDatabase() {
  const filePath = getLegacyDataPath();
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readLocalDatabase() {
  const db = getDatabase();
  const row = db.prepare('SELECT schema_version, saved_at, state_json FROM app_state WHERE id = 1').get();
  if (row) {
    return {
      schemaVersion: row.schema_version,
      savedAt: row.saved_at,
      state: JSON.parse(row.state_json)
    };
  }

  const legacyRecord = readLegacyLocalDatabase();
  if (legacyRecord?.state) {
    writeLocalDatabase(legacyRecord.state);
    return legacyRecord;
  }

  return null;
}

function writeLocalDatabase(state) {
  const db = getDatabase();
  const savedAt = new Date().toISOString();
  const stateJson = JSON.stringify(state);
  const saveState = db.prepare(`
    INSERT INTO app_state (id, schema_version, saved_at, state_json)
    VALUES (1, 2, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      schema_version = excluded.schema_version,
      saved_at = excluded.saved_at,
      state_json = excluded.state_json
  `);
  const upsertProfile = db.prepare(`
    INSERT INTO profiles (
      id,
      name,
      birthday,
      membership_start_date,
      membership_expiration_date,
      total_time_played_hours,
      last_session_time_played_hours,
      preferred_game_id,
      preferred_stakes,
      notes,
      raw_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      birthday = excluded.birthday,
      membership_start_date = excluded.membership_start_date,
      membership_expiration_date = excluded.membership_expiration_date,
      total_time_played_hours = excluded.total_time_played_hours,
      last_session_time_played_hours = excluded.last_session_time_played_hours,
      preferred_game_id = excluded.preferred_game_id,
      preferred_stakes = excluded.preferred_stakes,
      notes = excluded.notes,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at
  `);
  const deleteProfiles = db.prepare('DELETE FROM profiles');
  const insertCompanion = db.prepare('INSERT OR IGNORE INTO profile_companions (profile_id, companion_profile_id) VALUES (?, ?)');
  const validProfileIds = new Set((state.profiles ?? []).map((profile) => profile.id));
  db.exec('BEGIN IMMEDIATE');
  try {
    saveState.run(savedAt, stateJson);
    deleteProfiles.run();
    for (const profile of state.profiles ?? []) {
      upsertProfile.run(
        profile.id,
        profile.name,
        profile.birthday ?? '',
        profile.membershipStartDate ?? '',
        profile.membershipExpirationDate ?? '',
        Number(profile.totalTimePlayedHours ?? 0),
        Number(profile.lastSessionTimePlayedHours ?? 0),
        profile.preferredGameId ?? profile.preferredGameIds?.[0] ?? '',
        profile.preferredStakes ?? '',
        profile.notes ?? '',
        JSON.stringify(profile),
        savedAt
      );
    }
    for (const profile of state.profiles ?? []) {
      for (const companionId of profile.commonlyPlaysWithProfileIds ?? []) {
        if (validProfileIds.has(companionId)) {
          insertCompanion.run(profile.id, companionId);
        }
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { ok: true, path: getDataPath(), engine: 'sqlite' };
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
    customization: { width: 920, height: 700, minWidth: 760, minHeight: 600, title: branding.desktop.windowTitles.customization ?? 'Customization' },
    kpis: { width: 860, height: 620, minWidth: 720, minHeight: 520, title: branding.desktop.windowTitles.kpis ?? 'KPIs' },
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
