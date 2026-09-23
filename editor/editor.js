(() => {
  'use strict';

  const bridge = window.ccWebsiteEditor;
  if (!bridge || !window.grapesjs) {
    document.body.innerHTML = '<pre>Website Editor konnte nicht gestartet werden. GrapesJS oder die Electron-Bridge fehlt.</pre>';
    return;
  }

  const state = {
    page: 'index.html',
    assetBaseUrl: '',
    loading: false,
    dirty: false,
  };

  const pageSelect = document.querySelector('#page-select');
  const status = document.querySelector('#status');
  const repoPath = document.querySelector('#repo-path');
  const codeDialog = document.querySelector('#code-dialog');
  const codeHtml = document.querySelector('#code-html');
  const codeCss = document.querySelector('#code-css');

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    noticeOnUnload: false,
    selectorManager: { componentFirst: true },
    deviceManager: {
      devices: [
        { name: 'Desktop', width: '' },
        { name: 'Tablet', width: '820px', widthMedia: '900px' },
        { name: 'Mobil', width: '390px', widthMedia: '680px' },
      ],
    },
    styleManager: {
      sectors: [
        {
          name: 'Größe & Abstand',
          open: true,
          buildProps: ['display', 'position', 'width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
        },
        {
          name: 'Typografie',
          open: false,
          buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height', 'text-align', 'text-transform', 'color'],
        },
        {
          name: 'Fläche',
          open: false,
          buildProps: ['background-color', 'background', 'border', 'border-radius', 'box-shadow', 'opacity'],
        },
        {
          name: 'Flex / Grid',
          open: false,
          buildProps: ['flex-direction', 'justify-content', 'align-items', 'gap', 'grid-template-columns'],
        },
      ],
    },
  });

  const blocks = editor.BlockManager;
  blocks.add('cc-section', {
    label: 'Abschnitt',
    category: 'Layout',
    content: '<section class="section section-shell"><p class="kicker">NEUER ABSCHNITT</p><h2>Überschrift</h2><p>Neuer Inhalt</p></section>',
  });
  blocks.add('cc-heading', {
    label: 'Überschrift',
    category: 'Inhalt',
    content: '<h2>Neue Überschrift</h2>',
  });
  blocks.add('cc-text', {
    label: 'Text',
    category: 'Inhalt',
    content: '<p>Neuer Text</p>',
  });
  blocks.add('cc-image', {
    label: 'Bild',
    category: 'Inhalt',
    content: { type: 'image', src: 'images/products/kohesion-pendant.png', alt: '' },
  });
  blocks.add('cc-link', {
    label: 'Link',
    category: 'Inhalt',
    content: '<a class="text-link" href="#">Neuer Link</a>',
  });
  blocks.add('cc-button', {
    label: 'Button',
    category: 'Inhalt',
    content: '<a class="button button-solid" href="#">Button</a>',
  });
  blocks.add('cc-divider', {
    label: 'Trenner',
    category: 'Layout',
    content: '<hr>',
  });

  function setStatus(message, kind) {
    status.textContent = message;
    status.dataset.kind = kind || '';
  }

  function setDirty(value) {
    state.dirty = Boolean(value);
    if (state.dirty) {
      setStatus('Ungespeichert', 'dirty');
    } else {
      setStatus('Gespeichert', 'ok');
    }
    document.title = (state.dirty ? '● ' : '') + 'CircuitCurios Website Editor';
  }

  function injectCanvasHelpers() {
    const frame = editor.Canvas.getFrameEl();
    const doc = frame && frame.contentDocument;
    if (!doc || !doc.head) return;

    let base = doc.querySelector('base[data-cc-editor-base]');
    if (!base) {
      base = doc.createElement('base');
      base.dataset.ccEditorBase = 'true';
      doc.head.prepend(base);
    }
    base.href = state.assetBaseUrl || '';

    let helper = doc.querySelector('style[data-cc-editor-only]');
    if (!helper) {
      helper = doc.createElement('style');
      helper.dataset.ccEditorOnly = 'true';
      doc.head.appendChild(helper);
    }
    helper.textContent = [
      '.reveal{opacity:1!important;transform:none!important;}',
      'a[href]{cursor:default;}',
    ].join('');
  }

  async function loadPage(page, options) {
    const opts = options || {};
    if (!opts.force && state.dirty) {
      const discard = window.confirm('Ungespeicherte Änderungen verwerfen und Seite wechseln?');
      if (!discard) {
        pageSelect.value = state.page;
        return;
      }
    }

    state.loading = true;
    setStatus('Lade…');
    try {
      const data = await bridge.loadPage(page);
      state.page = data.page;
      state.assetBaseUrl = data.assetBaseUrl;
      repoPath.textContent = data.repoRoot || 'CircuitCurios';

      editor.setComponents(data.body);
      editor.setStyle(data.css);

      const assetManager = editor.AssetManager;
      if (typeof assetManager.clear === 'function') assetManager.clear();
      if (Array.isArray(data.assets) && data.assets.length) {
        assetManager.add(data.assets);
      }

      pageSelect.value = data.page;
      if (editor.UndoManager && typeof editor.UndoManager.clear === 'function') {
        editor.UndoManager.clear();
      }

      window.setTimeout(() => {
        injectCanvasHelpers();
        state.loading = false;
        setDirty(false);
      }, 30);
    } catch (error) {
      state.loading = false;
      setStatus('Fehler', 'error');
      window.alert('Seite konnte nicht geladen werden:\n\n' + (error?.message || error));
    }
  }

  async function savePage() {
    if (state.loading) return false;
    setStatus('Speichere…');
    try {
      await bridge.savePage({
        page: state.page,
        body: editor.getHtml(),
        css: editor.getCss(),
      });
      setDirty(false);
      return true;
    } catch (error) {
      setStatus('Fehler', 'error');
      window.alert('Speichern fehlgeschlagen:\n\n' + (error?.message || error));
      return false;
    }
  }

  async function openPreview() {
    if (state.dirty) {
      const saved = await savePage();
      if (!saved) return;
    }
    await bridge.openPreview(state.page);
  }

  async function importImages() {
    try {
      const imported = await bridge.importImages();
      if (!Array.isArray(imported) || imported.length === 0) return;
      editor.AssetManager.add(imported);
      setStatus(imported.length + ' Bild(er) importiert', 'ok');
      editor.runCommand('open-assets');
    } catch (error) {
      window.alert('Bildimport fehlgeschlagen:\n\n' + (error?.message || error));
    }
  }

  function openCodeDialog() {
    codeHtml.value = editor.getHtml();
    codeCss.value = editor.getCss();
    codeDialog.showModal();
  }

  function applyCodeDialog() {
    state.loading = true;
    editor.setComponents(codeHtml.value);
    editor.setStyle(codeCss.value);
    state.loading = false;
    injectCanvasHelpers();
    setDirty(true);
    codeDialog.close();
  }

  async function initPages() {
    const pages = await bridge.listPages();
    pageSelect.innerHTML = '';
    pages.forEach(page => {
      const option = document.createElement('option');
      option.value = page.file;
      option.textContent = page.label;
      pageSelect.appendChild(option);
    });
    await loadPage('index.html', { force: true });
  }

  editor.on('update', () => {
    if (!state.loading) setDirty(true);
  });

  editor.on('canvas:frame:load', injectCanvasHelpers);

  pageSelect.addEventListener('change', () => {
    loadPage(pageSelect.value);
  });

  document.querySelectorAll('[data-device]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-device]').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      editor.setDevice(button.dataset.device);
    });
  });

  document.querySelector('[data-action="undo"]').addEventListener('click', () => editor.UndoManager.undo());
  document.querySelector('[data-action="redo"]').addEventListener('click', () => editor.UndoManager.redo());
  document.querySelector('[data-action="assets"]').addEventListener('click', () => editor.runCommand('open-assets'));
  document.querySelector('[data-action="import"]').addEventListener('click', importImages);
  document.querySelector('[data-action="code"]').addEventListener('click', openCodeDialog);
  document.querySelector('[data-action="preview"]').addEventListener('click', openPreview);
  document.querySelector('[data-action="save"]').addEventListener('click', savePage);

  document.querySelectorAll('[data-code-close]').forEach(button => {
    button.addEventListener('click', () => codeDialog.close());
  });
  document.querySelector('#code-apply').addEventListener('click', applyCodeDialog);

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      savePage();
    }
    if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      editor.UndoManager.undo();
    }
    if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault();
      editor.UndoManager.redo();
    }
  });

  window.addEventListener('beforeunload', event => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  initPages().catch(error => {
    setStatus('Startfehler', 'error');
    window.alert('Editor konnte nicht initialisiert werden:\n\n' + (error?.message || error));
  });
})();
