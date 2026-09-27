(() => {
  'use strict';

  const qs = new URLSearchParams(location.search);
  const file = qs.get('file') || 'index.html';
  const statusEl = document.getElementById('cc-status');
  const dirtyEl = document.getElementById('cc-dirty');
  const pageTitleEl = document.getElementById('cc-page-title');
  let originalHead = '';
  let originalDoctype = '<!doctype html>';
  let originalBodyAttrs = '';
  let headStyles = [];
  let inlineHeadStyles = [];
  let dirty = false;
  let loading = true;

  const setStatus = (text) => { statusEl.textContent = text; };
  const setDirty = (value) => {
    dirty = value;
    dirtyEl.textContent = value ? 'Ungespeicherte Änderungen' : '';
  };

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    panels: { defaults: [] },
    selectorManager: { componentFirst: true },
    layerManager: { appendTo: '#cc-layers' },
    blockManager: { appendTo: '#cc-blocks' },
    traitManager: { appendTo: '#cc-traits' },
    styleManager: {
      appendTo: '#cc-styles',
      sectors: [
        {
          name: 'Layout',
          open: true,
          buildProps: [
            'display', 'flex-direction', 'flex-wrap', 'justify-content',
            'align-items', 'align-content', 'gap', 'grid-template-columns',
            'grid-template-rows', 'grid-column-gap', 'grid-row-gap'
          ]
        },
        {
          name: 'Abstand & Größe',
          open: true,
          buildProps: [
            'margin', 'padding', 'width', 'height', 'min-width', 'max-width',
            'min-height', 'max-height'
          ]
        },
        {
          name: 'Typografie',
          open: false,
          buildProps: [
            'font-family', 'font-size', 'font-weight', 'letter-spacing',
            'line-height', 'color', 'text-align', 'text-decoration',
            'text-transform'
          ]
        },
        {
          name: 'Hintergrund & Rahmen',
          open: false,
          buildProps: [
            'background-color', 'background', 'border', 'border-radius',
            'box-shadow', 'opacity'
          ]
        },
        {
          name: 'Position',
          open: false,
          buildProps: [
            'position', 'top', 'right', 'bottom', 'left', 'z-index',
            'overflow'
          ]
        },
        {
          name: 'Transform & Effekte',
          open: false,
          buildProps: [
            'transform', 'filter', 'transition'
          ]
        }
      ]
    },
    deviceManager: {
      devices: [
        { id: 'Desktop', name: 'Desktop', width: '' },
        { id: 'Tablet', name: 'Tablet', width: '820px', widthMedia: '992px' },
        { id: 'Mobile', name: 'Mobile', width: '390px', widthMedia: '576px' }
      ]
    },
    canvas: {
      styles: []
    },
    assetManager: {
      upload: false,
      autoAdd: false
    }
  });

  pageTitleEl.textContent = file;

  const addBlocks = () => {
    const bm = editor.BlockManager;
    bm.add('cc-section', {
      label: 'Abschnitt',
      category: 'Struktur',
      content: '<section class="cc-section"><div class="container"><h2>Neue Sektion</h2><p>Text</p></div></section>'
    });
    bm.add('cc-container', {
      label: 'Container',
      category: 'Struktur',
      content: '<div class="container"><p>Inhalt</p></div>'
    });
    bm.add('cc-columns', {
      label: '2 Spalten',
      category: 'Struktur',
      content: '<div style="display:flex;gap:24px"><div style="flex:1">Spalte 1</div><div style="flex:1">Spalte 2</div></div>'
    });
    bm.add('cc-heading', {
      label: 'Überschrift',
      category: 'Inhalt',
      content: '<h2>Überschrift</h2>'
    });
    bm.add('cc-text', {
      label: 'Text',
      category: 'Inhalt',
      content: '<p>Neuer Text</p>'
    });
    bm.add('cc-image', {
      label: 'Bild',
      category: 'Inhalt',
      content: { type: 'image', src: 'images/placeholders/placeholder-product.svg' }
    });
    bm.add('cc-link', {
      label: 'Link / Button',
      category: 'Inhalt',
      content: '<a href="#" class="btn btn-primary">Link</a>'
    });
    bm.add('cc-divider', {
      label: 'Trenner',
      category: 'Inhalt',
      content: '<hr>'
    });
  };
  addBlocks();

  const resolveSiteUrl = (url) => {
    if (!url) return url;
    if (/^(https?:|data:|blob:|#|mailto:|tel:)/i.test(url)) return url;
    if (url.startsWith('/site/')) return url;
    if (url.startsWith('/')) return '/site' + url;
    return '/site/' + url.replace(/^\.\//, '');
  };

  const injectCanvasHead = () => {
    const doc = editor.Canvas.getDocument();
    if (!doc || !doc.head) return;

    if (!doc.head.querySelector('base[data-cc-base]')) {
      const base = doc.createElement('base');
      base.dataset.ccBase = '1';
      base.href = location.origin + '/site/';
      doc.head.prepend(base);
    }

    doc.head.querySelectorAll('[data-cc-source-style]').forEach(el => el.remove());

    headStyles.forEach(href => {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.ccSourceStyle = '1';
      link.href = resolveSiteUrl(href);
      doc.head.appendChild(link);
    });

    inlineHeadStyles.forEach(css => {
      const style = doc.createElement('style');
      style.dataset.ccSourceStyle = '1';
      style.textContent = css;
      doc.head.appendChild(style);
    });
  };

  editor.on('canvas:frame:load', injectCanvasHead);

  const stripScripts = (root) => {
    root.querySelectorAll('script').forEach(el => el.remove());
  };

  const loadPage = async () => {
    loading = true;
    setStatus('Seite wird geladen …');

    const res = await fetch('/site/' + encodeURIComponent(file), { cache: 'no-store' });
    if (!res.ok) throw new Error('Seite konnte nicht geladen werden: ' + res.status);
    const source = await res.text();

    const doctypeMatch = source.match(/<!doctype[^>]*>/i);
    if (doctypeMatch) originalDoctype = doctypeMatch[0];

    const parser = new DOMParser();
    const doc = parser.parseFromString(source, 'text/html');
    originalHead = doc.head.innerHTML;
    originalBodyAttrs = Array.from(doc.body.attributes)
      .map(a => a.name + '="' + a.value.replace(/"/g, '&quot;') + '"')
      .join(' ');

    headStyles = Array.from(doc.head.querySelectorAll('link[rel~="stylesheet"]'))
      .map(el => el.getAttribute('href'))
      .filter(Boolean)
      .filter(href => !/css\/editor-overrides\.css(?:\?|$)/i.test(href));

    inlineHeadStyles = Array.from(doc.head.querySelectorAll('style'))
      .map(el => el.textContent || '');

    const body = doc.body.cloneNode(true);
    stripScripts(body);

    editor.setComponents(body.innerHTML);

    let overrideCss = '';
    try {
      const cssRes = await fetch('/site/css/editor-overrides.css', { cache: 'no-store' });
      if (cssRes.ok) overrideCss = await cssRes.text();
    } catch (_) {}
    editor.setStyle(overrideCss);

    injectCanvasHead();
    await loadAssets();
    setDirty(false);
    loading = false;
    setStatus('Bereit');
  };

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/assets', { cache: 'no-store' });
      if (!res.ok) return;
      const assets = await res.json();
      editor.AssetManager.clear();
      editor.AssetManager.add(assets);
    } catch (_) {}
  };

  const normalizeBodyForSave = (html) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = html;

    const attrs = ['src', 'href', 'poster'];
    wrap.querySelectorAll('*').forEach(el => {
      attrs.forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && value.startsWith('/site/')) {
          el.setAttribute(attr, value.slice('/site/'.length));
        }
      });

      const srcset = el.getAttribute('srcset');
      if (srcset) {
        el.setAttribute(
          'srcset',
          srcset.split(',').map(item => {
            const bits = item.trim().split(/\s+/);
            if (bits[0] && bits[0].startsWith('/site/')) {
              bits[0] = bits[0].slice('/site/'.length);
            }
            return bits.join(' ');
          }).join(', ')
        );
      }
    });

    return wrap.innerHTML;
  };

  const normalizeCssForSave = (css) =>
    css.replace(/url\((['"]?)\/site\//gi, 'url($1');

  const save = async () => {
    const body = normalizeBodyForSave(editor.getHtml());
    const css = normalizeCssForSave(editor.getCss());

    setStatus('Speichere …');
    const res = await fetch('/api/save?file=' + encodeURIComponent(file), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ body, css })
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Speichern fehlgeschlagen');

    setDirty(false);
    setStatus('Gespeichert');
  };

  const chooseImage = async () => {
    setStatus('Bild auswählen …');
    const res = await fetch('/api/pick-image', { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    if (result.cancelled) {
      setStatus('Bereit');
      return;
    }

    await loadAssets();
    const src = '/site/' + result.path;
    const selected = editor.getSelected();
    if (selected && selected.is('image')) {
      selected.addAttributes({ src });
      setDirty(true);
    } else {
      editor.addComponents({ type: 'image', src });
      setDirty(true);
    }
    setStatus('Bild eingefügt');
  };

  const openCode = () => {
    const html = editor.getHtml();
    const css = editor.getCss();
    const content = document.createElement('div');
    content.className = 'cc-code-modal';
    content.innerHTML =
      '<label>HTML<textarea id="cc-code-html"></textarea></label>' +
      '<label>CSS<textarea id="cc-code-css"></textarea></label>' +
      '<div class="cc-code-actions">' +
      '<button class="cc-button" id="cc-code-cancel">Abbrechen</button>' +
      '<button class="cc-button cc-primary" id="cc-code-apply">Übernehmen</button>' +
      '</div>';

    editor.Modal.setTitle('HTML / CSS');
    editor.Modal.setContent(content);
    editor.Modal.open();

    content.querySelector('#cc-code-html').value = html;
    content.querySelector('#cc-code-css').value = css;

    content.querySelector('#cc-code-cancel').onclick = () => editor.Modal.close();
    content.querySelector('#cc-code-apply').onclick = () => {
      editor.setComponents(content.querySelector('#cc-code-html').value);
      editor.setStyle(content.querySelector('#cc-code-css').value);
      setDirty(true);
      editor.Modal.close();
    };
  };

  const updateSelectionUi = () => {
    const selected = editor.getSelected();
    const label = document.getElementById('cc-selection-label');
    const duplicate = document.getElementById('cc-duplicate');
    const del = document.getElementById('cc-delete');

    if (!selected) {
      label.textContent = 'Nichts ausgewählt';
      duplicate.disabled = true;
      del.disabled = true;
      return;
    }

    const tag = selected.get('tagName') || selected.get('type') || 'Element';
    const classes = selected.getClasses ? selected.getClasses() : [];
    label.textContent = '<' + tag + '>' + (classes.length ? ' .' + classes.join('.') : '');
    duplicate.disabled = false;
    del.disabled = false;
  };

  editor.on('component:selected', updateSelectionUi);
  editor.on('component:deselected', updateSelectionUi);
  editor.on('component:add component:remove component:update styleable:change', () => {
    if (!loading) setDirty(true);
  });
  editor.on('style:property:update', () => {
    if (!loading) setDirty(true);
  });

  document.getElementById('cc-save').onclick = () => save().catch(err => setStatus(err.message));
  document.getElementById('cc-undo').onclick = () => editor.UndoManager.undo();
  document.getElementById('cc-redo').onclick = () => editor.UndoManager.redo();
  document.getElementById('cc-code').onclick = openCode;
  document.getElementById('cc-open-code-advanced').onclick = openCode;
  document.getElementById('cc-pick-image').onclick = () => chooseImage().catch(err => setStatus(err.message));
  document.getElementById('cc-open-assets').onclick = () => editor.runCommand('open-assets');

  document.getElementById('cc-preview').onclick = (event) => {
    const active = editor.Commands.isActive('core:preview');
    if (active) {
      editor.stopCommand('core:preview');
      event.currentTarget.classList.remove('is-active');
    } else {
      editor.runCommand('core:preview');
      event.currentTarget.classList.add('is-active');
    }
  };

  document.getElementById('cc-duplicate').onclick = () => {
    const selected = editor.getSelected();
    if (!selected) return;
    const parent = selected.parent();
    if (!parent) return;
    parent.append(selected.clone());
    setDirty(true);
  };

  document.getElementById('cc-delete').onclick = () => {
    const selected = editor.getSelected();
    if (!selected) return;
    selected.remove();
    setDirty(true);
  };

  document.getElementById('cc-add-class').onclick = () => {
    const selected = editor.getSelected();
    if (!selected) return;
    const name = prompt('CSS-Klasse:');
    if (name && name.trim()) {
      selected.addClass(name.trim().replace(/^\./, ''));
      setDirty(true);
    }
  };

  document.getElementById('cc-clear-styles').onclick = () => {
    const selected = editor.getSelected();
    if (!selected) return;
    selected.setStyle({});
    setDirty(true);
  };

  document.querySelectorAll('.cc-device').forEach(button => {
    button.onclick = () => {
      editor.setDevice(button.dataset.device);
      document.querySelectorAll('.cc-device').forEach(el => el.classList.remove('is-active'));
      button.classList.add('is-active');
    };
  });

  document.querySelectorAll('.cc-sidebar').forEach(sidebar => {
    sidebar.querySelectorAll('.cc-tab').forEach(tab => {
      tab.onclick = () => {
        const panel = tab.dataset.panel;
        sidebar.querySelectorAll('.cc-tab').forEach(el => el.classList.toggle('is-active', el === tab));
        sidebar.querySelectorAll('.cc-panel').forEach(el =>
          el.classList.toggle('is-active', el.dataset.panelContent === panel)
        );
      };
    });
  });

  window.addEventListener('keydown', event => {
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save().catch(err => setStatus(err.message));
    }
  });

  window.addEventListener('beforeunload', event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  loadPage().catch(err => {
    loading = false;
    setStatus(err.message);
  });
})();
