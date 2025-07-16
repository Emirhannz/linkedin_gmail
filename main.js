const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('start-find', (event, filePath) => {
  const proc = spawn('node', ['find-all-company-links.js', filePath]);
  proc.stdout.on('data', data => {
    event.sender.send('log', { type: 'find', message: data.toString() });
  });
  proc.stderr.on('data', data => {
    event.sender.send('log', { type: 'find', message: data.toString() });
  });
  proc.on('error', err => {
    event.sender.send('log', { type: 'find', message: err.message });
  });
});

ipcMain.on('start-scrape', (event, data) => {
  // data: { filePath, email, password }
  const { filePath, email, password } = data;
  const proc = spawn('node', ['scrape-company.js', filePath, email, password]);
  proc.stdout.on('data', data => {
    event.sender.send('log', { type: 'scrape', message: data.toString() });
  });
  proc.stderr.on('data', data => {
    event.sender.send('log', { type: 'scrape', message: data.toString() });
  });
  proc.on('error', err => {
    event.sender.send('log', { type: 'scrape', message: err.message });
  });
});

ipcMain.on('start-email', (event, filePath) => {
  const pythonPath = path.join(__dirname, 'scraping_env', 'Scripts', 'python.exe');
  const scriptPath = path.join(__dirname, 'email_uretici.py');
  let allLogs = '';
  const proc = spawn(pythonPath, [scriptPath, filePath], { stdio: 'pipe' });
  proc.stdout.on('data', data => {
    const msg = data.toString();
    allLogs += msg;
    event.sender.send('log', { type: 'email', message: msg });
  });
  proc.stderr.on('data', data => {
    const msg = data.toString();
    allLogs += msg;
    event.sender.send('log', { type: 'email', message: msg });
  });
  proc.on('close', code => {
    if (!allLogs) {
      event.sender.send('log', { type: 'email', message: '[ERROR] Hiç çıktı alınamadı. Script başlamadı veya hata oluştu.' });
    } else {
      event.sender.send('log', { type: 'email', message: `\n[INFO] Script sonlandı. Çıkış kodu: ${code}` });
    }
  });
});

ipcMain.on('start-brevo', (event, data) => {
  // data: { filePath, subject, body, apiKey, senderName, senderEmail }
  const pythonPath = path.join(__dirname, 'scraping_env', 'Scripts', 'python.exe');
  const scriptPath = path.join(__dirname, 'brevo_bulk_mailer.py');
  const args = [
    scriptPath,
    data.filePath,
    data.subject,
    data.body,
    data.apiKey,
    data.senderName,
    data.senderEmail
  ];
  let allLogs = '';
  const proc = spawn(pythonPath, args, { stdio: 'pipe' });
  proc.stdout.on('data', msg => {
    allLogs += msg.toString();
    event.sender.send('log', { type: 'brevo', message: msg.toString() });
  });
  proc.stderr.on('data', msg => {
    allLogs += msg.toString();
    event.sender.send('log', { type: 'brevo', message: msg.toString() });
  });
  proc.on('close', code => {
    if (!allLogs) {
      event.sender.send('log', { type: 'brevo', message: '[ERROR] Hiç çıktı alınamadı. Script başlamadı veya hata oluştu.' });
    } else {
      event.sender.send('log', { type: 'brevo', message: `\n[INFO] Script sonlandı. Çıkış kodu: ${code}` });
    }
  });
});

// Dosya seçimi için dialog handler
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
