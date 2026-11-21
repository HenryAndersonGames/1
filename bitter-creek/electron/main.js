// Оболочка Electron 22 — последняя версия, которая работает на Windows 7.
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// Старые видеокарты на Win7 часто в «чёрном списке» Chromium — разрешаем их, иначе WebGL уйдёт в медленный программный режим.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let win;
function create() {
  win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 960, minHeight: 540,
    backgroundColor: '#0b0a09', title: 'Биттер-Крик', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // самопроверка сборки: BC_SELFTEST=путь.png — снимок экрана через 8 с и выход
  if (process.env.BC_SELFTEST) {
    setTimeout(async () => {
      const ok = await win.webContents.executeJavaScript('!!(window.game && window.native && window.game.mode)');
      const img = await win.webContents.capturePage();
      require('fs').writeFileSync(process.env.BC_SELFTEST, img.toPNG());
      console.log('SELFTEST game+native:', ok);
      app.quit();
    }, 8000);
  }
  win.on('closed', () => { win = null; });
}
ipcMain.on('quit', () => app.quit());
ipcMain.on('fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); });

app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
