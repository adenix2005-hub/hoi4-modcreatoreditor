const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const APP_DIR = path.join(__dirname, '..', 'app');

// Serve the UI from app://local/ so ES modules load like on a normal website.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#1b1d1a',
    title: 'HOI4 Mod Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  win.loadURL('app://local/index.html');
}

function hoi4ModDir() {
  return path.join(app.getPath('documents'), 'Paradox Interactive', 'Hearts of Iron IV', 'mod');
}

ipcMain.handle('defaultModDir', () => hoi4ModDir());

ipcMain.handle('pickFolder', async (_e, defaultPath) => {
  const start = defaultPath && fs.existsSync(defaultPath) ? defaultPath : app.getPath('documents');
  const res = await dialog.showOpenDialog({
    title: 'Choose your HOI4 "mod" folder',
    defaultPath: start,
    properties: ['openDirectory', 'createDirectory'],
  });
  return res.canceled ? null : res.filePaths[0];
});

// Writes generated mod files. Every path must stay inside baseDir.
ipcMain.handle('writeFiles', async (_e, baseDir, files) => {
  const root = path.resolve(baseDir);
  for (const f of files) {
    const target = path.resolve(root, f.path);
    if (!target.startsWith(root + path.sep)) throw new Error('Refusing to write outside the mod folder: ' + f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const data = typeof f.data === 'string' ? f.data : Buffer.from(f.data);
    fs.writeFileSync(target, data);
  }
  return files.length;
});

ipcMain.handle('saveProject', async (_e, json, suggestedName) => {
  const res = await dialog.showSaveDialog({
    title: 'Save project',
    defaultPath: path.join(app.getPath('documents'), suggestedName || 'my_mod.hoi4proj.json'),
    filters: [{ name: 'HOI4 Mod Studio project', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return null;
  fs.writeFileSync(res.filePath, json, 'utf8');
  return res.filePath;
});

ipcMain.handle('saveProjectTo', async (_e, filePath, json) => {
  fs.writeFileSync(filePath, json, 'utf8');
  return filePath;
});

ipcMain.handle('openProject', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Open project',
    filters: [{ name: 'HOI4 Mod Studio project', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return { path: res.filePaths[0], json: fs.readFileSync(res.filePaths[0], 'utf8') };
});

ipcMain.handle('openFolder', async (_e, p) => shell.openPath(p));

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '');
    const file = path.resolve(APP_DIR, rel || 'index.html');
    if (!file.startsWith(APP_DIR + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
