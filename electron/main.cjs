const { app, BrowserWindow, ipcMain, Menu, screen, shell, systemPreferences } = require('electron');
const path = require('path');

const isDev = Boolean(process.env.YULIST_DEV_URL);

function createAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: 'О приложении yulist' },
              { type: 'separator' },
              { role: 'services', label: 'Службы' },
              { type: 'separator' },
              { role: 'hide', label: 'Скрыть yulist' },
              { role: 'hideOthers', label: 'Скрыть остальные' },
              { role: 'unhide', label: 'Показать все' },
              { type: 'separator' },
              { role: 'quit', label: 'Завершить yulist' },
            ],
          },
        ]
      : []),
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Скопировать' },
        { role: 'paste', label: 'Вставить' },
        {
          label: 'Выделить всё',
          accelerator: 'CmdOrCtrl+A',
          click: (_menuItem, browserWindow) => {
            if (!browserWindow) return;
            browserWindow.webContents
              .executeJavaScript(
                `(() => {
                  const ev = new CustomEvent('yulist:select-all', { cancelable: true });
                  return !window.dispatchEvent(ev);
                })()`
              )
              .then((handled) => {
                if (!handled && !browserWindow.isDestroyed()) {
                  browserWindow.webContents.selectAll();
                }
              })
              .catch(() => {
                if (!browserWindow.isDestroyed()) {
                  browserWindow.webContents.selectAll();
                }
              });
          },
        },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Обновить' },
        { role: 'togglefullscreen', label: 'Полноэкранный режим' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Фактический размер' },
        { role: 'zoomIn', label: 'Увеличить' },
        { role: 'zoomOut', label: 'Уменьшить' },
      ],
    },
    {
      label: 'Окно',
      submenu: [
        { role: 'minimize', label: 'Свернуть' },
        { role: 'zoom', label: 'Изменить масштаб' },
        { type: 'separator' },
        {
          label: 'Правая половина экрана',
          click: (_menuItem, browserWindow) => {
            if (!browserWindow) return;
            if (browserWindow.isFullScreen()) browserWindow.setFullScreen(false);
            const { x, y, width, height } = screen.getDisplayMatching(browserWindow.getBounds()).workArea;
            const halfW = Math.floor(width / 2);
            browserWindow.setBounds({ x: x + (width - halfW), y, width: halfW, height }, true);
          },
        },
        {
          label: 'Левая половина экрана',
          click: (_menuItem, browserWindow) => {
            if (!browserWindow) return;
            if (browserWindow.isFullScreen()) browserWindow.setFullScreen(false);
            const { x, y, width, height } = screen.getDisplayMatching(browserWindow.getBounds()).workArea;
            const halfW = Math.floor(width / 2);
            browserWindow.setBounds({ x, y, width: halfW, height }, true);
          },
        },
        {
          label: 'Развернуть на весь экран',
          click: (_menuItem, browserWindow) => {
            if (!browserWindow) return;
            browserWindow.setFullScreen(!browserWindow.isFullScreen());
          },
        },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front', label: 'Все окна на передний план' },
            ]
          : [{ role: 'close', label: 'Закрыть' }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    minHeight: 480,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    title: 'yulist',
    backgroundColor: '#0B111E',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && process.env.YULIST_DEV_URL) {
    win.loadURL(process.env.YULIST_DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return win;
}

ipcMain.handle('yulist:can-touch-id', () => {
  try {
    return (
      process.platform === 'darwin' &&
      typeof systemPreferences.canPromptTouchID === 'function' &&
      systemPreferences.canPromptTouchID()
    );
  } catch {
    return false;
  }
});

ipcMain.handle('yulist:prompt-touch-id', async (_event, reason) => {
  if (
    process.platform !== 'darwin' ||
    typeof systemPreferences.promptTouchID !== 'function' ||
    !systemPreferences.canPromptTouchID()
  ) {
    return { ok: false, error: 'Touch ID недоступен на этом устройстве' };
  }

  const safeReason =
    typeof reason === 'string' && reason.trim().length > 0
      ? reason.trim().slice(0, 120)
      : 'открыть защищённую заметку в yulist';

  try {
    await systemPreferences.promptTouchID(safeReason);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Проверка Touch ID отменена' };
  }
});

app.whenReady().then(() => {
  app.setName('yulist');
  createAppMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
