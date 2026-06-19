import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'sentiment-data.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '舆情复盘工作站',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f172a',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function ensureDataFile() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({}, null, 2));
  }
}

ipcMain.handle('load-data', () => {
  ensureDataFile();
  try {
    const data = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
});

ipcMain.handle('save-data', (_event, data) => {
  ensureDataFile();
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  return { success: true };
});

ipcMain.handle('export-report', (_event, content, filename) => {
  const docsPath = app.getPath('documents');
  const exportFilename = filename || `舆情复盘_${new Date().toISOString().split('T')[0]}.md`;
  const exportPath = path.join(docsPath, exportFilename);
  fs.writeFileSync(exportPath, content);
  return { success: true, path: exportPath };
});

ipcMain.handle('open-path', async (_event, filePath) => {
  try {
    const result = await shell.openPath(filePath);
    if (result) {
      await shell.showItemInFolder(filePath);
    }
    return { success: true };
  } catch {
    return { success: false };
  }
});

app.whenReady().then(() => {
  ensureDataFile();
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
