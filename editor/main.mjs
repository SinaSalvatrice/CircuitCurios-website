import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE_LABELS = new Map([
  ['index.html', 'Startseite'],
  ['impressum.html', 'Impressum'],
  ['datenschutz.html', 'Datenschutz'],
]);

let repoRoot = '';
let previewWindow = null;

function looksLikeRepo(candidate) {
  return existsSync(path.join(candidate, 'index.html'))
    && existsSync(path.join(candidate, 'css', 'style.css'))
    && existsSync(path.join(candidate, 'CNAME'));
}

function walkForRepo(start) {
  if (!start) return null;
  let current = path.resolve(start);
  for (let i = 0; i < 10; i += 1) {
    if (looksLikeRepo(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function findRepoRoot() {
  const candidates = [
    process.env.CIRCUITCURIOS_WEBSITE_ROOT,
    process.cwd(),
    here,
    path.dirname(process.execPath),
  ];

  for (const candidate of candidates) {
    const found = walkForRepo(candidate);
    if (found) return found;
  }

  // Last fallback for packaged builds started from a sibling repository.
  for (const candidate of candidates.filter(Boolean)) {
    let current = path.resolve(candidate);
    for (let i = 0; i < 10; i += 1) {
      const sibling = path.join(path.dirname(current), 'CircuitCurios-website');
      if (looksLikeRepo(sibling)) return sibling;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  throw new Error(
    'CircuitCurios-website Repo nicht gefunden. Erwartet wird das Website-Repo neben dem Hauptrepo oder CIRCUITCURIOS_WEBSITE_ROOT.'
  );
}

function assertPage(page) {
  if (!PAGE_LABELS.has(page)) {
    throw new Error('Diese Datei darf der Website-Editor nicht bearbeiten: ' + page);
  }
  return path.join(repoRoot, page);
}

function extractBody(documentText) {
  const match = documentText.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error('Kein <body>-Bereich in der HTML-Datei gefunden.');
  return match[1].trim();
}

function replaceBody(documentText, nextBody) {
  const bodyPattern = /(<body\b[^>]*>)[\s\S]*?(<\/body>)/i;
  if (!bodyPattern.test(documentText)) {
    throw new Error('Kein <body>-Bereich in der HTML-Datei gefunden.');
  }
  return documentText.replace(bodyPattern, (_, opening, closing) => {
    return opening + '\n' + String(nextBody).trim() + '\n' + closing;
  });
}

function extractTitle(documentText) {
  const match = documentText.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

async function listImageAssets() {
  const root = path.join(repoRoot, 'images');
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
  const assets = [];

  async function scan(directory) {
    if (!existsSync(directory)) return;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await scan(absolute);
        continue;
      }
      if (!allowed.has(path.extname(entry.name).toLowerCase())) continue;
      const relative = path.relative(repoRoot, absolute).split(path.sep).join('/');
      assets.push({
        type: 'image',
        src: relative,
        name: entry.name,
      });
    }
  }

  await scan(root);
  return assets;
}

async function createBackup(page) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(repoRoot, 'editor', '.backups', stamp);
  await mkdir(target, { recursive: true });
  await copyFile(path.join(repoRoot, page), path.join(target, page));
  await mkdir(path.join(target, 'css'), { recursive: true });
  await copyFile(path.join(repoRoot, 'css', 'style.css'), path.join(target, 'css', 'style.css'));
}

async function uniqueDestination(sourcePath) {
  const uploads = path.join(repoRoot, 'images', 'uploads');
  await mkdir(uploads, { recursive: true });

  const ext = path.extname(sourcePath).toLowerCase();
  const base = path.basename(sourcePath, path.extname(sourcePath))
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'image';

  let candidate = path.join(uploads, base + ext);
  let counter = 2;
  while (existsSync(candidate)) {
    candidate = path.join(uploads, base + '-' + counter + ext);
    counter += 1;
  }
  return candidate;
}

function configureExternalLinks(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function registerIpc() {
  ipcMain.handle('editor:list-pages', async () => {
    return Array.from(PAGE_LABELS, ([file, label]) => ({ file, label }));
  });

  ipcMain.handle('editor:load-page', async (_, page) => {
    const pagePath = assertPage(page);
    const [documentText, css, assets] = await Promise.all([
      readFile(pagePath, 'utf8'),
      readFile(path.join(repoRoot, 'css', 'style.css'), 'utf8'),
      listImageAssets(),
    ]);

    return {
      page,
      title: extractTitle(documentText),
      body: extractBody(documentText),
      css,
      assets,
      assetBaseUrl: pathToFileURL(repoRoot + path.sep).href,
      repoRoot,
    };
  });

  ipcMain.handle('editor:save-page', async (_, payload) => {
    const page = String(payload?.page || '');
    const body = String(payload?.body || '');
    const css = String(payload?.css || '');

    if (body.length > 3_000_000 || css.length > 3_000_000) {
      throw new Error('Speichern abgebrochen: Inhalt ist unerwartet groß.');
    }

    const pagePath = assertPage(page);
    const currentDocument = await readFile(pagePath, 'utf8');
    const nextDocument = replaceBody(currentDocument, body);

    await createBackup(page);
    await writeFile(pagePath, nextDocument, 'utf8');
    await writeFile(path.join(repoRoot, 'css', 'style.css'), css.trimEnd() + '\n', 'utf8');

    return { savedAt: new Date().toISOString() };
  });

  ipcMain.handle('editor:import-images', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Bilder in die Website importieren',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Bilder', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] },
      ],
    });

    if (result.canceled) return [];

    const imported = [];
    for (const source of result.filePaths) {
      const destination = await uniqueDestination(source);
      await copyFile(source, destination);
      imported.push({
        type: 'image',
        src: path.relative(repoRoot, destination).split(path.sep).join('/'),
        name: path.basename(destination),
      });
    }
    return imported;
  });

  ipcMain.handle('editor:open-preview', async (_, page) => {
    const pagePath = assertPage(page);
    if (previewWindow && !previewWindow.isDestroyed()) {
      await previewWindow.loadFile(pagePath);
      previewWindow.show();
      previewWindow.focus();
      return true;
    }

    previewWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      minWidth: 480,
      minHeight: 600,
      title: 'CircuitCurios Website Vorschau',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    configureExternalLinks(previewWindow);
    previewWindow.on('closed', () => { previewWindow = null; });
    await previewWindow.loadFile(pagePath);
    return true;
  });
}

function createEditorWindow() {
  const window = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#17191d',
    title: 'CircuitCurios GrapesJS Editor',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  configureExternalLinks(window);
  window.loadFile(path.join(here, 'index.html'));
}

app.whenReady().then(() => {
  repoRoot = findRepoRoot();
  registerIpc();
  createEditorWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createEditorWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
