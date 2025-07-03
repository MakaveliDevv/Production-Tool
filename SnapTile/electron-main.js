// electron-main.js
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createRequire } from 'module';

// ESM __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// create CommonJS require
const requireCjs = createRequire(import.meta.url);

async function handleOpenFile() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Images & Projects', extensions: ['png', 'jpg', 'json'] }],
    properties: ['openFile']
  });
  return canceled ? null : filePaths[0];
}

async function handleSaveProject(event, jsonData) {
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: 'project.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  await fs.promises.writeFile(filePath, jsonData, 'utf-8');
  return filePath;
}

async function handleLoadProject() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled) return null;
  return fs.promises.readFile(filePaths[0], 'utf-8');
}

async function handleExportFile(event, buffer, defaultName) {
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'PNG', extensions: ['png'] },
      { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
      { name: 'SVG', extensions: ['svg'] }
    ]
  });
  if (canceled || !filePath) return false;
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

async function handleOpenDirectory() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return canceled ? null : filePaths[0];
}

async function handleListDirectory(event, folderPath) {
  return fs.promises.readdir(folderPath).catch(() => []);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    // use CommonJS require to load electron-reload safely
    try {
      const er = requireCjs('electron-reload');
      er(__dirname, {
        ignored: /node_modules|[\/\\]\./,
        electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
        awaitWriteFinish: true
      });
    } catch (e) {
      console.warn('electron-reload failed to start:', e);
    }

    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:openFile',      handleOpenFile);
  ipcMain.handle('dialog:openDirectory', handleOpenDirectory);
  ipcMain.handle('dialog:saveProject',   handleSaveProject);
  ipcMain.handle('dialog:loadProject',   handleLoadProject);
  ipcMain.handle('dialog:exportFile',    handleExportFile);
  ipcMain.handle('dialog:listDirectory', handleListDirectory);
  ipcMain.handle('dialog:readFileDataURL', async (_event, filePath) => {
    // runs in Node-land (main process), so fs & path are fine here
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = ext === 'png'   ? 'image/png'
              : ext === 'jpg'   ? 'image/jpeg'
              : ext === 'jpeg'  ? 'image/jpeg'
              : ext === 'svg'   ? 'image/svg+xml'
              : 'application/octet-stream';
    const buffer = await fs.promises.readFile(filePath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  });

  createWindow();
});
