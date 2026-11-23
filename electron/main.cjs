const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const fs = require('fs');
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
        { role: 'selectAll', label: 'Выделить всё' },
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
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 620,
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

ipcMain.handle('yulist:export-pdf', async (event, suggestedFilename) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { saved: false, error: 'Window unavailable' };
  }

  const defaultName =
    typeof suggestedFilename === 'string' && suggestedFilename.endsWith('.pdf')
      ? suggestedFilename
      : 'yulist-отчет.pdf';

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Сохранить отчёт PDF',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'PDF документы', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    return { saved: false };
  }

  try {
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });
    fs.writeFileSync(filePath, pdfBuffer);
    return { saved: true, filePath };
  } catch (err) {
    return { saved: false, error: err instanceof Error ? err.message : String(err) };
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
