(() => {
  'use strict';

  const bridge = window.ccWebsiteEditor;
  if (!bridge || !window.grapesjs) {
    document.body.innerHTML = '<pre>GrapesJS Editor konnte nicht gestartet werden.</pre>';
    return;
  }

  const state = { page: 'index.html', assetBaseUrl: '', loading: false, dirty: false };
  const pageSelect = document.querySelector('#page-select');
  const status = document.querySelector('#status');
  const repoPath = document.querySelector('#repo-path');
  const selectedName = document.querySelector('#selected-name');
  const codeDialog = document.querySelector('#code-dialog');
  const codeHtml = document.querySelector('#code-html');
  const codeCss = document.querySelector('#code-css');
  const publishButton = document.querySelector('[data-action="publish"]');
  const selectionButtons = ['select-parent', 'duplicate', 'delete']
    .map(name => document.querySelector('[data-action="' + name + '"]'));

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    noticeOnUnload: false,
    panels: { defaults: [] },
    blockManager: { appendTo: '#blocks' },
    layerManager: { appendTo: '#layers' },
    traitManager: { appendTo: '#traits' },
    selectorManager: { componentFirst: true },
    deviceManager: {
      devices: [
        { name: 'Desktop', width: '' },
        { name: 'Tablet', width: '820px', widthMedia: '900px' },
        { name: 'Mobil', width: '390px', widthMedia: '680px' },
      ],
    },
    styleManager: {
      appendTo: '#styles',
      sectors: [
        { name: 'Layout', open: true, buildProps: ['display', 'position', 'width', 'height', 'max-width', 'min-height', 'margin', 'padding', 'overflow'] },
        { name: 'Typografie', open: true, buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'line-height', 'text-align', 'text-transform', 'color'] },
        { name: 'Fläche', open: false, buildProps: ['background-color', 'background', 'border', 'border-radius', 'box-shadow', 'opacity'] },
        { name: 'Flex / Grid', open: false, buildProps: ['flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap', 'grid-template-columns'] },
      ],
    },
  });

  const blocks = editor.BlockManager;
  [
    ['cc-section', 'Abschnitt', 'Layout', '<section class="section section-shell"><p class="kicker">NEUER ABSCHNITT</p><h2>Überschrift</h2><p>Neuer Inhalt</p></section>'],
    ['cc-two-columns', '2 Spalten', 'Layout', '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px"><div><p>Spalte 1</p></div><div><p>Spalte 2</p></div></div>'],
    ['cc-heading', 'Überschrift', 'Inhalt', '<h2>Neue Überschrift</h2>'],
    ['cc-text', 'Text', 'Inhalt', '<p>Neuer Text</p>'],
    ['cc-link', 'Link', 'Inhalt', '<a class="text-link" href="#">Neuer Link</a>'],
    ['cc-button', 'Button', 'Inhalt', '<a class="button button-solid" href="#">Button</a>'],
    ['cc-divider', 'Trenner', 'Layout', '<hr>'],
  ].forEach(([id, label, category, content]) => blocks.add(id, { label, category, content }));

  blocks.add('cc-image', {
    label: 'Bild',
    category: 'Inhalt',
    content: { type: 'image', src: 'images/products/kohesion-pendant.png', alt: '' },
  });

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function setDirty(value) {
    state.dirty = Boolean(value);
    setStatus(state.dirty ? 'Ungespeichert' : 'Gespeichert', state.dirty ? 'dirty' : 'ok');
    document.title = (state.dirty ? '● ' : '') + 'CircuitCurios GrapesJS Editor';
  }

  function componentLabel(component) {
    if (!component) return 'Nichts ausgewählt';
    const tag = component.get('tagName') || component.get('type') || 'Element';
    const id = component.getId ? component.getId() : '';
    const classes = component.getClasses ? component.getClasses() : [];
    const suffix = id ? '#' + id : classes.length ? '.' + classes.slice(0, 2).join('.') : '';
    return String(tag).toUpperCase() + suffix;
  }

  function updateSelectionUi() {
    const selected = editor.getSelected();
    selectedName.textContent = componentLabel(selected);
    selectionButtons.forEach(button => { button.disabled = !selected; });
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
    helper.textContent = '.reveal{opacity:1!important;transform:none!important}.site-header{pointer-events:auto!important}a[href]{cursor:default!important}';
  }

  async function loadPage(page, { force = false } = {}) {
    if (!force && state.dirty) {
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
      repoPath.textContent = data.repoRoot || 'CircuitCurios-website';

      editor.setComponents(data.body);
      editor.setStyle(data.css);

      if (Array.isArray(data.assets) && data.assets.length) {
        editor.AssetManager.add(data.assets);
      }

      pageSelect.value = data.page;
      editor.select(null);
      editor.UndoManager.clear();

      window.setTimeout(() => {
        injectCanvasHelpers();
        state.loading = false;
        setDirty(false);
        updateSelectionUi();
      }, 50);
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
        css: editor.getCss({ keepUnusedStyles: true }),
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
    if (state.dirty && !(await savePage())) return;
    await bridge.openPreview(state.page);
  }

  async function publishSite() {
    if (state.loading || publishButton.disabled) return;
    if (state.dirty && !(await savePage())) return;

    publishButton.disabled = true;
    const previousText = publishButton.textContent;
    publishButton.textContent = 'Veröffentliche…';
    setStatus('Veröffentliche…');

    try {
      const result = await bridge.publishSite();
      setStatus('Veröffentlicht', 'ok');
      const detail = result?.commit ? ' · Commit ' + result.commit : '';
      window.alert(
        'Website veröffentlicht' + detail + '.\n\n'
        + 'GitHub Pages übernimmt die Änderung automatisch für circuitcurios.de.'
      );
    } catch (error) {
      setStatus('Publish-Fehler', 'error');
      window.alert(
        'Veröffentlichung fehlgeschlagen:\n\n'
        + (error?.message || error)
      );
    } finally {
      publishButton.disabled = false;
      publishButton.textContent = previousText;
    }
  }

  function openAssets() {
    editor.AssetManager.open({
      select(asset, complete) {
        const selected = editor.getSelected();
        if (selected && selected.is('image')) {
          selected.addAttributes({ src: asset.getSrc() });
          setDirty(true);
        }
        if (complete) editor.AssetManager.close();
      },
    });
  }

  async function importImages() {
    try {
      const imported = await bridge.importImages();
      if (!Array.isArray(imported) || !imported.length) return;
      editor.AssetManager.add(imported);
      setStatus(imported.length + ' Bild(er) importiert', 'ok');
      openAssets();
    } catch (error) {
      window.alert('Bildimport fehlgeschlagen:\n\n' + (error?.message || error));
    }
  }

  function openCodeDialog() {
    codeHtml.value = editor.getHtml();
    codeCss.value = editor.getCss({ keepUnusedStyles: true });
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

  function selectParent() {
    const selected = editor.getSelected();
    const parent = selected && selected.parent && selected.parent();
    if (parent && parent !== editor.getWrapper()) editor.select(parent);
  }

  function duplicateSelected() {
    const selected = editor.getSelected();
    const parent = selected && selected.parent && selected.parent();
    if (!selected || !parent || typeof selected.clone !== 'function') return;
    const siblings = parent.components();
    const index = typeof siblings.indexOf === 'function' ? siblings.indexOf(selected) : -1;
    const clone = selected.clone();
    parent.append(clone, index >= 0 ? { at: index + 1 } : undefined);
    editor.select(clone);
  }

  function deleteSelected() {
    const selected = editor.getSelected();
    if (!selected || selected.get('removable') === false) return;
    const parent = selected.parent && selected.parent();
    selected.remove();
    if (parent && parent !== editor.getWrapper()) editor.select(parent);
  }

  function activateInspector(name) {
    document.querySelectorAll('[data-inspector]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.inspector === name);
    });
    document.querySelectorAll('.inspector-pane').forEach(pane => {
      pane.classList.toggle('is-active', pane.id === name);
    });
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

  editor.on('update', () => { if (!state.loading) setDirty(true); });
  editor.on('canvas:frame:load', injectCanvasHelpers);
  editor.on('component:selected', updateSelectionUi);
  editor.on('component:deselected', updateSelectionUi);

  pageSelect.addEventListener('change', () => loadPage(pageSelect.value));

  document.querySelectorAll('[data-device]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-device]').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      editor.setDevice(button.dataset.device);
    });
  });

  document.querySelectorAll('[data-inspector]').forEach(button => {
    button.addEventListener('click', () => activateInspector(button.dataset.inspector));
  });

  document.querySelector('[data-action="undo"]').addEventListener('click', () => editor.UndoManager.undo());
  document.querySelector('[data-action="redo"]').addEventListener('click', () => editor.UndoManager.redo());
  document.querySelector('[data-action="assets"]').addEventListener('click', openAssets);
  document.querySelector('[data-action="import"]').addEventListener('click', importImages);
  document.querySelector('[data-action="code"]').addEventListener('click', openCodeDialog);
  document.querySelector('[data-action="preview"]').addEventListener('click', openPreview);
  document.querySelector('[data-action="save"]').addEventListener('click', savePage);
  publishButton.addEventListener('click', publishSite);
  document.querySelector('[data-action="select-parent"]').addEventListener('click', selectParent);
  document.querySelector('[data-action="duplicate"]').addEventListener('click', duplicateSelected);
  document.querySelector('[data-action="delete"]').addEventListener('click', deleteSelected);

  document.querySelectorAll('[data-code-close]').forEach(button => button.addEventListener('click', () => codeDialog.close()));
  document.querySelector('#code-apply').addEventListener('click', applyCodeDialog);

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      savePage();
    } else if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      editor.UndoManager.undo();
    } else if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault();
      editor.UndoManager.redo();
    } else if (event.key === 'Delete' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      deleteSelected();
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
