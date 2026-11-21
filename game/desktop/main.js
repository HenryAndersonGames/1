// Обёртка Electron: запускает игру отдельным окном (Windows 7+ при Electron 22)
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(() => {
  const w = new BrowserWindow({
    width: 1280, height: 720, fullscreen: true, backgroundColor: '#0b0a09', autoHideMenuBar: true, title: 'Shattered Dawn',
    webPreferences: { backgroundThrottling: false },
  });
  w.setMenu(null);
  w.loadFile(path.join(__dirname, 'index.html'));
  w.webContents.on('before-input-event', (e, inp) => {
    if (inp.type === 'keyDown' && inp.key === 'F11') w.setFullScreen(!w.isFullScreen());
    if (inp.type === 'keyDown' && inp.key === 'F4' && inp.alt) app.quit();
  });
});
app.on('window-all-closed', () => app.quit());
