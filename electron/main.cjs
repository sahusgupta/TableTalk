const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const nodemailer = require('nodemailer');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const branding = require('../branding.config.json');

const isDev = process.env.ELECTRON_DEV === 'true';
const updateCheckIntervalMs = 30 * 60 * 1000;

if (process.env.TABLEMANAGER_USER_DATA_DIR) {
  app.setPath('userData', process.env.TABLEMANAGER_USER_DATA_DIR);
}

app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disk-cache-size', '0');

const windows = new Map();
const validRoutes = new Set(['floor', 'builder', 'profiles', 'signals', 'summary', 'customization', 'kpis', 'pilot', 'outreach']);
let database;
let embeddedBackend;
let embeddedBackendStatus = { running: false, host: '127.0.0.1', port: 0, reportCount: 0 };
let updateCheckTimer;

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function validateStatePayload(state) {
  if (!isRecord(state)) throw new Error('State payload must be an object.');
  if (!Array.isArray(state.games)) throw new Error('State payload is missing games.');
  if (!Array.isArray(state.sessions)) throw new Error('State payload is missing sessions.');
  if (!Array.isArray(state.playerSessions)) throw new Error('State payload is missing player sessions.');
  if (!isRecord(state.settings)) throw new Error('State payload is missing settings.');
}

function openTrustedExternal(url) {
  try {
    const parsed = new URL(url);
    if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
      shell.openExternal(url);
    }
  } catch {
    // Ignore malformed external links.
  }
}

function getLegacyDataPath() {
  return path.join(app.getPath('userData'), 'tablemanager-db.json');
}

function getDataPath() {
  return path.join(app.getPath('userData'), 'tablemanager.sqlite3');
}

function sanitizeAccountKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function getAccountKeyFromAccess(access) {
  if (!isRecord(access)) return '';
  return sanitizeAccountKey(access.licenseId || access.authorizationCode || access.issuedTo);
}

function getAccountKeyFromState(state) {
  const pilotKey = getAccountKeyFromAccess(state?.settings?.pilotAccess);
  if (pilotKey) return pilotKey;
  const club = state?.settings?.clubAccount;
  return sanitizeAccountKey(club?.email || club?.clubName || 'unlicensed-local') || 'unlicensed-local';
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

    CREATE TABLE IF NOT EXISTS account_state (
      account_key TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      saved_at TEXT NOT NULL,
      state_json TEXT NOT NULL,
      is_last_opened INTEGER NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS account_profiles (
      account_key TEXT NOT NULL,
      id TEXT NOT NULL,
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
      updated_at TEXT NOT NULL,
      PRIMARY KEY (account_key, id),
      FOREIGN KEY (account_key) REFERENCES account_state(account_key) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account_profile_companions (
      account_key TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      companion_profile_id TEXT NOT NULL,
      PRIMARY KEY (account_key, profile_id, companion_profile_id),
      FOREIGN KEY (account_key, profile_id) REFERENCES account_profiles(account_key, id) ON DELETE CASCADE,
      FOREIGN KEY (account_key, companion_profile_id) REFERENCES account_profiles(account_key, id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytical_reports (
      id TEXT PRIMARY KEY,
      account_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      report_json TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'stored',
      delivered_at TEXT,
      delivery_error TEXT
    );
  `);
  return database;
}

function readLegacyLocalDatabase() {
  const filePath = getLegacyDataPath();
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readLocalDatabase(accountKey) {
  const db = getDatabase();
  const normalizedAccountKey = sanitizeAccountKey(accountKey);
  const row = normalizedAccountKey
    ? db.prepare('SELECT schema_version, saved_at, state_json FROM account_state WHERE account_key = ?').get(normalizedAccountKey)
    : db.prepare('SELECT schema_version, saved_at, state_json FROM account_state WHERE is_last_opened = 1 ORDER BY saved_at DESC LIMIT 1').get();
  if (row) {
    return {
      schemaVersion: row.schema_version,
      savedAt: row.saved_at,
      state: JSON.parse(row.state_json)
    };
  }

  if (normalizedAccountKey) return null;

  const legacySqliteRow = db.prepare('SELECT schema_version, saved_at, state_json FROM app_state WHERE id = 1').get();
  if (legacySqliteRow) {
    const state = JSON.parse(legacySqliteRow.state_json);
    writeLocalDatabase(state);
    return {
      schemaVersion: legacySqliteRow.schema_version,
      savedAt: legacySqliteRow.saved_at,
      state
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
  validateStatePayload(state);
  const db = getDatabase();
  const savedAt = new Date().toISOString();
  const stateJson = JSON.stringify(state);
  const accountKey = getAccountKeyFromState(state);
  const clearLastOpened = db.prepare('UPDATE account_state SET is_last_opened = 0');
  const saveState = db.prepare(`
    INSERT INTO account_state (account_key, schema_version, saved_at, state_json, is_last_opened)
    VALUES (?, 3, ?, ?, 1)
    ON CONFLICT(account_key) DO UPDATE SET
      schema_version = excluded.schema_version,
      saved_at = excluded.saved_at,
      state_json = excluded.state_json,
      is_last_opened = 1
  `);
  const upsertProfile = db.prepare(`
    INSERT INTO account_profiles (
      account_key,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_key, id) DO UPDATE SET
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
  const deleteProfiles = db.prepare('DELETE FROM account_profiles WHERE account_key = ?');
  const insertCompanion = db.prepare('INSERT OR IGNORE INTO account_profile_companions (account_key, profile_id, companion_profile_id) VALUES (?, ?, ?)');
  const validProfileIds = new Set((state.profiles ?? []).map((profile) => profile.id));
  db.exec('BEGIN IMMEDIATE');
  try {
    clearLastOpened.run();
    saveState.run(accountKey, savedAt, stateJson);
    deleteProfiles.run(accountKey);
    for (const profile of state.profiles ?? []) {
      upsertProfile.run(
        accountKey,
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
          insertCompanion.run(accountKey, profile.id, companionId);
        }
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { ok: true, path: getDataPath(), engine: 'sqlite', accountKey };
}

function getReportCount() {
  const row = getDatabase().prepare('SELECT COUNT(*) AS count FROM analytical_reports').get();
  return Number(row?.count ?? 0);
}

function validateReportPayload(report) {
  if (!isRecord(report)) throw new Error('Report payload must be an object.');
  if (!isRecord(report.account)) throw new Error('Report payload is missing account details.');
  if (!isRecord(report.operational)) throw new Error('Report payload is missing operational metrics.');
  if (!isRecord(report.usage)) throw new Error('Report payload is missing usage metrics.');
}

async function forwardReportIfConfigured(report) {
  const endpoint = process.env.TABLEMANAGER_REPORT_ENDPOINT;
  const emailTo = process.env.TABLEMANAGER_REPORT_EMAIL_TO;
  const deliveryResults = [];

  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report)
    });

    if (!response.ok) {
      throw new Error(`Report endpoint returned ${response.status}`);
    }
    deliveryResults.push('endpoint');
  }

  if (emailTo) {
    await sendReportEmail(report, emailTo);
    deliveryResults.push('email');
  }

  if (!deliveryResults.length) return { status: 'stored' };
  return { status: 'delivered', deliveredAt: new Date().toISOString(), channels: deliveryResults };
}

function getSmtpTransport() {
  const host = process.env.TABLEMANAGER_SMTP_HOST;
  const user = process.env.TABLEMANAGER_SMTP_USER;
  const pass = process.env.TABLEMANAGER_SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('Email delivery requires TABLEMANAGER_SMTP_HOST, TABLEMANAGER_SMTP_USER, and TABLEMANAGER_SMTP_PASS.');
  }

  const port = Number(process.env.TABLEMANAGER_SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function buildReportEmailText(report) {
  const operational = report.operational ?? {};
  const usage = report.usage ?? {};
  const features = Array.isArray(usage.features) ? usage.features.slice(0, 8) : [];
  const actions = Array.isArray(usage.actions) ? usage.actions.slice(0, 8) : [];
  return [
    `TableManager report for ${report.account?.clubName || report.account?.accountName || 'Unknown club'}`,
    `Generated: ${report.generatedAt}`,
    '',
    `Occupied seat-hours: ${operational.occupiedSeatHours ?? 0}`,
    `Estimated time-fee revenue: $${operational.estimatedTimeFeeRevenue ?? 0}`,
    `Recorded table drop: $${operational.recordedDropTotal ?? 0}`,
    `Estimated drop revenue: $${operational.estimatedDropRevenue ?? 0}`,
    `Average wait: ${operational.averageWaitMinutes ?? 0}m`,
    `Waitlist conversion: ${operational.waitlistConversionRate ?? 0}%`,
    `Games started: ${operational.gamesStarted ?? 0}`,
    `Failed starts: ${operational.failedStarts ?? 0}`,
    `Table breaks: ${operational.tableBreaks ?? 0}`,
    '',
    'Feature usage:',
    ...features.map((entry) => `- ${entry.feature}: ${entry.count}`),
    '',
    'Action usage:',
    ...actions.map((entry) => `- ${entry.action} (${entry.feature}): ${entry.count}`),
    '',
    'Full JSON report is attached.'
  ].join('\n');
}

async function sendReportEmail(report, emailTo) {
  const transport = getSmtpTransport();
  const clubName = report.account?.clubName || report.account?.accountName || 'TableManager';
  const generatedDate = String(report.generatedAt || new Date().toISOString()).slice(0, 10);
  await transport.sendMail({
    from: process.env.TABLEMANAGER_SMTP_FROM || process.env.TABLEMANAGER_SMTP_USER,
    to: emailTo,
    subject: `TableManager report - ${clubName} - ${generatedDate}`,
    text: buildReportEmailText(report),
    attachments: [
      {
        filename: `tablemanager-report-${generatedDate}.json`,
        content: JSON.stringify(report, null, 2),
        contentType: 'application/json'
      }
    ]
  });
}

async function storeAnalyticalReport(report) {
  validateReportPayload(report);
  const db = getDatabase();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const accountKey = sanitizeAccountKey(report.account.accountKey || report.account.license || report.account.email || report.account.clubName || 'unlicensed-local') || 'unlicensed-local';
  let delivery = { status: 'stored' };
  let deliveryError = '';

  try {
    delivery = await forwardReportIfConfigured(report);
  } catch (error) {
    delivery = { status: 'queued' };
    deliveryError = error instanceof Error ? error.message : 'Unable to deliver report.';
  }

  db.prepare(`
    INSERT INTO analytical_reports (
      id,
      account_key,
      created_at,
      report_json,
      delivery_status,
      delivered_at,
      delivery_error
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    accountKey,
    createdAt,
    JSON.stringify(report),
    delivery.status,
    delivery.deliveredAt ?? null,
    deliveryError
  );

  embeddedBackendStatus = { ...embeddedBackendStatus, reportCount: getReportCount() };
  return { ok: true, id, accountKey, createdAt, deliveryStatus: delivery.status, backend: embeddedBackendStatus };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function startEmbeddedBackend() {
  if (embeddedBackend) return;

  embeddedBackend = http.createServer(async (request, response) => {
    try {
      const remoteAddress = request.socket.remoteAddress;
      const isLoopback = remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
      if (!isLoopback) {
        sendJson(response, 403, { ok: false, error: 'Embedded backend only accepts loopback requests.' });
        return;
      }

      if (request.method === 'GET' && request.url === '/health') {
        sendJson(response, 200, { ok: true, ...embeddedBackendStatus, reportCount: getReportCount() });
        return;
      }

      if (request.method === 'POST' && request.url === '/analytical-reports') {
        const body = await readRequestBody(request);
        const result = await storeAnalyticalReport(JSON.parse(body));
        sendJson(response, 201, result);
        return;
      }

      sendJson(response, 404, { ok: false, error: 'Not found.' });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : 'Request failed.' });
    }
  });

  embeddedBackend.listen(0, '127.0.0.1', () => {
    const address = embeddedBackend.address();
    embeddedBackendStatus = {
      running: true,
      host: '127.0.0.1',
      port: typeof address === 'object' && address ? address.port : 0,
      reportCount: getReportCount()
    };
  });

  embeddedBackend.on('close', () => {
    embeddedBackendStatus = { ...embeddedBackendStatus, running: false, port: 0 };
  });
}

function broadcastUpdateStatus(status) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('update-status', status);
    }
  }
}

function startAutoUpdates() {
  if (isDev || !app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ state: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({ state: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', (info) => {
    broadcastUpdateStatus({ state: 'current', version: info.version });
  });
  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdateStatus({ state: 'downloading', percent: Math.round(progress.percent ?? 0) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({ state: 'downloaded', version: info.version });
  });
  autoUpdater.on('error', (error) => {
    broadcastUpdateStatus({ state: 'error', message: error instanceof Error ? error.message : 'Update check failed.' });
  });

  const checkForUpdates = () => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      broadcastUpdateStatus({ state: 'error', message: error instanceof Error ? error.message : 'Update check failed.' });
    });
  };

  checkForUpdates();
  updateCheckTimer = setInterval(checkForUpdates, updateCheckIntervalMs);
}

ipcMain.handle('open-route-window', (_event, route) => {
  const normalizedRoute = route === 'outreach' ? 'signals' : validRoutes.has(route) ? route : 'floor';
  createWindow(normalizedRoute);
});

ipcMain.handle('load-state', () => readLocalDatabase());

ipcMain.handle('load-state-for-account', (_event, access) => readLocalDatabase(getAccountKeyFromAccess(access)));

ipcMain.handle('save-state', (_event, state) => writeLocalDatabase(state));

ipcMain.handle('get-backend-status', () => ({ ...embeddedBackendStatus, reportCount: getReportCount() }));

ipcMain.handle('submit-analytical-report', (_event, report) => storeAnalyticalReport(report));

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
    openTrustedExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url !== currentUrl && !url.startsWith('file://') && !url.startsWith('http://127.0.0.1:5173/')) {
      event.preventDefault();
      openTrustedExternal(url);
    }
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
  startEmbeddedBackend();
  startAutoUpdates();

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

app.on('before-quit', () => {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = undefined;
  }
  if (embeddedBackend) {
    embeddedBackend.close();
    embeddedBackend = undefined;
  }
  if (database) {
    database.close();
    database = undefined;
  }
});

