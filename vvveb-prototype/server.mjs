import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const vendorRoot = path.join(here, '.vendor', 'VvvebJs');
const port = Number(process.env.CC_VVVEB_PORT || 8877);
const host = '127.0.0.1';
const editablePages = new Set(['index.html', 'impressum.html', 'datenschutz.html']);

if (!existsSync(path.join(vendorRoot, 'editor.html'))) {
  console.error('VvvebJs vendor files are missing. Run start-vvveb.ps1 first.');
  process.exit(2);
}

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
]);

function safeJoin(root, requestPath) {
  const clean = requestPath.replace(/^\/+/, '').replace(/\\/g, '/');
  const resolved = path.resolve(root, clean);
  const normalizedRoot = path.resolve(root) + path.sep;
  if (resolved !== path.resolve(root) && !resolved.startsWith(normalizedRoot)) return null;
  return resolved;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function sendFile(res, file) {
  if (!file || !existsSync(file)) {
    send(res, 404, 'Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
}

function circuitPagesJs() {
  return `let defaultPages = {
    "index": {
      name: "index",
      filename: "index.html",
      file: "index.html",
      url: "/site/index.html",
      title: "Startseite",
      folder: null,
      description: "CircuitCurios Startseite"
    },
    "impressum": {
      name: "impressum",
      filename: "impressum.html",
      file: "impressum.html",
      url: "/site/impressum.html",
      title: "Impressum",
      folder: null,
      description: "Impressum"
    },
    "datenschutz": {
      name: "datenschutz",
      filename: "datenschutz.html",
      file: "datenschutz.html",
      url: "/site/datenschutz.html",
      title: "Datenschutz",
      folder: null,
      description: "Datenschutz"
    }
  };

  `;
}

function prototypeCss() {
  return `
<style id="cc-vvveb-prototype">
  .sidebar .nav-item.heading,
  .sidebar .nav-item.heading + .nav-item,
  #new-file-btn,
  #download-btn,
  #designer-mode-btn,
  #showChangesBtn,
  #save-offcanvas {
    display: none !important;
  }

  #top-panel::before {
    content: "CircuitCurios · VvvebJs Test";
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    font: 700 11px/1.2 system-ui, sans-serif;
    letter-spacing: .04em;
    color: var(--bs-body-color);
    white-space: nowrap;
  }

  #top-panel .save-btn {
    min-width: 88px;
  }

  #filemanager .header .search::before {
    content: "SEITEN";
    display: block;
    margin-bottom: 5px;
    font: 700 10px/1 system-ui, sans-serif;
    letter-spacing: .08em;
    opacity: .65;
  }
</style>
`;
}

function prototypeScript() {
  return `
<script>
window.addEventListener('DOMContentLoaded', () => {
  const labels = {
    '#pages-tab .title': 'Seiten',
    '#components-tab .title': 'Elemente',
    '#sections-tab .title': 'Abschnitte',
    '#configuration-tab .title': 'Stil',
    '#content-tab span': 'Inhalt',
    '#style-tab span': 'Stil',
    '#advanced-tab span': 'Erweitert'
  };
  for (const [selector, value] of Object.entries(labels)) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  document.querySelectorAll('[placeholder="Search components"]').forEach(el => el.placeholder = 'Elemente suchen');
  document.querySelectorAll('[placeholder="Search blocks"]').forEach(el => el.placeholder = 'Blöcke suchen');
  document.querySelectorAll('[placeholder="Search sections"]').forEach(el => el.placeholder = 'Abschnitte suchen');
  document.querySelectorAll('[placeholder="Pages"]').forEach(el => el.placeholder = 'Seiten suchen');

  const saveText = document.querySelector('#top-panel .save-btn .button-text span');
  if (saveText) saveText.textContent = 'Speichern';

  document.title = 'CircuitCurios · VvvebJs Test';
});
</script>
`;
}

async function transformedEditor() {
  let html = await readFile(path.join(vendorRoot, 'editor.html'), 'utf8');

  html = html.replace(/<title>[\s\S]*?<\/title>/i, '<title>CircuitCurios · VvvebJs Test</title>');
  html = html.replace('</head>', prototypeCss() + '\n</head>');

  const start = html.indexOf('let defaultPages = {');
  const after = html.indexOf('let pages = defaultPages;', start);
  if (start < 0 || after < 0) {
    throw new Error('VvvebJs editor.html changed: defaultPages block not found.');
  }
  html = html.slice(0, start) + circuitPagesJs() + html.slice(after);

  html = html
    .replace("window.mediaPath = '../../media';", "window.mediaPath = '/site/images';")
    .replace("Vvveb.themeBaseUrl = 'demo/landing/';", "Vvveb.themeBaseUrl = '/site/';")
    .replace(/\s*<script src="demo\/landing\/sections\/sections\.js"><\/script>/, '')
    .replace(/\s*<script src="demo\/landing\/styles\/styles\.js"><\/script>/, '');

  html = html.replace('</body>', prototypeScript() + '\n</body>');
  return html;
}

async function collectBody(req, limit = 25 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Request too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function savePage(req, res) {
  const raw = await collectBody(req);
  const form = new URLSearchParams(raw);
  const requested = path.basename((form.get('file') || '').replace(/\\/g, '/'));
  const html = form.get('html');

  if (!editablePages.has(requested)) {
    send(res, 403, 'Diese Datei darf der Prototyp nicht überschreiben.');
    return;
  }
  if (!html || html.length < 30) {
    send(res, 400, 'Kein HTML empfangen.');
    return;
  }

  const target = path.join(repoRoot, requested);
  const backupRoot = path.join(here, '.backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(backupRoot, { recursive: true });
  await copyFile(target, path.join(backupRoot, `${stamp}-${requested}`));
  await writeFile(target, html.trim() + '\n', 'utf8');

  send(res, 200, `${requested} gespeichert (Backup angelegt).`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'POST' && pathname === '/save.php') {
      await savePage(req, res);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed');
      return;
    }

    if (pathname === '/' || pathname === '/editor.html') {
      const html = await transformedEditor();
      send(res, 200, html, 'text/html; charset=utf-8');
      return;
    }

    if (pathname.startsWith('/site/')) {
      const file = safeJoin(repoRoot, pathname.slice('/site/'.length));
      sendFile(res, file);
      return;
    }

    const vendorFile = safeJoin(vendorRoot, pathname);
    sendFile(res, vendorFile);
  } catch (error) {
    console.error(error);
    send(res, 500, error?.message || String(error));
  }
});

server.listen(port, host, () => {
  console.log('');
  console.log('=== CircuitCurios VvvebJs Prototyp ===');
  console.log(`Editor:  http://${host}:${port}/editor.html`);
  console.log(`Website: ${repoRoot}`);
  console.log('Speichern ist nur für index.html, impressum.html und datenschutz.html freigegeben.');
  console.log('Strg+C beendet den Prototyp.');
  console.log('');
});
