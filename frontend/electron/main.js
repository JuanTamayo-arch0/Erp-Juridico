const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const isDev = !!process.env.VITE_DEV_SERVER_URL;
// Allow forcing software rendering to avoid GBM/driver issues (set FORCE_SOFTWARE_RENDERING=1)
const forceSoftware = process.env.FORCE_SOFTWARE_RENDERING === '1' || process.env.DISABLE_GPU === '1';

if (forceSoftware) {
  // Disable hardware acceleration early
  try {
    const { app: electronApp } = require('electron');
    electronApp.disableHardwareAcceleration();
  } catch (e) {
    // ignore
  }
}

// Linux: default to X11 unless user explicitly opts into Wayland.
if (process.platform === 'linux' && !process.env.ELECTRON_OZONE_PLATFORM_HINT) {
  process.env.ELECTRON_OZONE_PLATFORM_HINT = 'x11';
}

// Add extra Chromium flags when running in software mode to avoid GBM loading
if (forceSoftware) {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  // Prefer SwiftShader software GL implementation
  app.commandLine.appendSwitch('use-gl', 'swiftshader');
  app.commandLine.appendSwitch('in-process-gpu');
}
const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

async function clearAuthIfRequested() {
  // When CLEAR_AUTH=1 is set, wipe localStorage/cookies so the app starts at /login
  if (process.env.CLEAR_AUTH === '1') {
    try {
      await session.defaultSession.clearStorageData({
        // No origin specified -> clear for all; safe in dev and handy for resets
        storages: ['localstorage', 'cookies'],
      });
      // Also clear cache to avoid stale responses affecting auth flows
      await session.defaultSession.clearCache();
      // eslint-disable-next-line no-console
      console.log('[electron] Cleared localStorage/cookies (CLEAR_AUTH=1)');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[electron] Failed to clear auth storage', e);
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (isDev) {
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
    // Helpful diagnostics in packaged builds
    win.webContents.on('did-fail-load', (e, code, desc, url) => {
      // eslint-disable-next-line no-console
      console.error('[electron] did-fail-load', { code, desc, url, indexPath });
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      // eslint-disable-next-line no-console
      console.error('[electron] render-process-gone', details);
    });
  }
}

app.on('ready', async () => {
  await clearAuthIfRequested();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
