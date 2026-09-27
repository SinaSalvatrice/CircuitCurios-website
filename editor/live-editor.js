(() => {
  const file = window.CC_EDITOR_FILE || 'index.html';
  let selected = null;
  let hover = null;
  let dragged = null;

  const panel = document.createElement('aside');
  panel.id = 'cc-live-editor';
  panel.setAttribute('data-cc-editor-ui', '');
  panel.innerHTML =
    '<div class="cc-head"><div class="cc-title">Layout bearbeiten</div><div class="cc-state" id="cc-editor-state">ungespeichert</div></div>' +
    '<div class="cc-selected" id="cc-editor-selection">Element anklicken</div>' +
    '<div class="cc-grid">' +
    '<button data-action="text">Text</button><button data-action="image">Bild</button>' +
    '<button data-action="link">Link</button><button data-action="duplicate">Duplizieren</button>' +
    '<button data-action="up">↑ hoch</button><button data-action="down">↓ runter</button>' +
    '<button data-action="add-text">+ Text</button><button data-action="add-divider">+ Trenner</button>' +
    '<button data-action="delete">Löschen</button><button class="cc-primary" data-action="save">Speichern</button>' +
    '</div><div class="cc-hint">Element anklicken. Markierte Elemente lassen sich ziehen oder mit ↑/↓ verschieben. Doppelklick bearbeitet Text direkt.</div>';
  document.body.appendChild(panel);

  const toast = document.createElement('div');
  toast.id = 'cc-editor-toast';
  toast.setAttribute('data-cc-editor-ui', '');
  document.body.appendChild(toast);
  const selectionLabel = panel.querySelector('#cc-editor-selection');
  const stateLabel = panel.querySelector('#cc-editor-state');

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 1300);
  }

  function setDirty() {
    stateLabel.textContent = 'ungespeichert';
  }

  function elementLabel(el) {
    if (!el) return 'Element anklicken';
    const id = el.id ? '#' + el.id : '';
    const cls = [...el.classList].slice(0, 2).map(v => '.' + v).join('');
    return el.tagName.toLowerCase() + id + cls;
  }

  function clearSelection() {
    if (!selected) return;
    selected.removeAttribute('data-cc-selected');
    if (selected.hasAttribute('data-cc-draggable')) {
      selected.removeAttribute('data-cc-draggable');
      selected.removeAttribute('draggable');
    }
  }
  function selectElement(el) {
    if (!el || el.closest('[data-cc-editor-ui]')) return;
    clearSelection();
    selected = el;
    selected.setAttribute('data-cc-selected', '');
    selected.setAttribute('data-cc-draggable', '');
    selected.setAttribute('draggable', 'true');
    selectionLabel.textContent = elementLabel(selected);
  }

  function editableTextTarget() {
    if (!selected) return null;
    const selector = 'p,h1,h2,h3,h4,h5,h6,span,a,strong,em,small,figcaption,dt,dd,li,button';
    if (selected.matches(selector)) return selected;
    return selected.querySelector(selector);
  }

  function imageTarget() {
    if (!selected) return null;
    if (selected.matches('img')) return selected;
    return selected.querySelector('img');
  }

  function linkTarget() {
    if (!selected) return null;
    if (selected.matches('a')) return selected;
    return selected.closest('a') || selected.querySelector('a');
  }
  async function chooseImage(target) {
    if (!target) {
      showToast('Erst ein Bild wählen');
      return;
    }
    const response = await fetch('/api/pick-image', {cache: 'no-store'});
    const data = await response.json();
    if (!data.path) return;
    target.setAttribute('src', data.path);
    setDirty();
    showToast('Bild ersetzt');
  }

  function insertAfter(reference, node) {
    const parent = reference?.parentNode;
    if (!parent) return;
    parent.insertBefore(node, reference.nextSibling);
    selectElement(node);
    setDirty();
  }

  function cleanHtml() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll(
      '[data-cc-editor-ui], [data-cc-editor-style], [data-cc-editor-config], ' +
      '[data-cc-editor-script], base[data-cc-editor-base]'
    ).forEach(el => el.remove());
    clone.querySelectorAll('[data-cc-selected], [data-cc-hover]').forEach(el => {
      el.removeAttribute('data-cc-selected');
      el.removeAttribute('data-cc-hover');
    });
    clone.querySelectorAll('[data-cc-draggable]').forEach(el => {
      el.removeAttribute('data-cc-draggable');
      el.removeAttribute('draggable');
    });
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });
    return '<!doctype html>\n' + clone.outerHTML;
  }

  async function save() {
    stateLabel.textContent = 'speichert …';
    const response = await fetch('/api/save?file=' + encodeURIComponent(file), {
      method: 'POST',
      headers: {'Content-Type': 'text/html; charset=utf-8'},
      body: cleanHtml()
    });
    if (!response.ok) {
      stateLabel.textContent = 'Fehler';
      showToast('Speichern fehlgeschlagen');
      return;
    }
    stateLabel.textContent = 'gespeichert';
    showToast('Gespeichert');
  }

  panel.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'save') {
      await save();
      return;
    }
    if (!selected && !action.startsWith('add-')) {
      showToast('Erst ein Element anklicken');
      return;
    }

    if (action === 'text') {
      const target = editableTextTarget();
      if (!target) return showToast('Kein Text in Auswahl');
      target.setAttribute('contenteditable', 'true');
      target.setAttribute('spellcheck', 'true');
      target.focus();
      setDirty();
      return;
    }

    if (action === 'image') {
      await chooseImage(imageTarget());
      return;
    }
    if (action === 'link') {
      const target = linkTarget();
      if (!target) return showToast('Kein Link in Auswahl');
      const value = window.prompt('Link-Ziel', target.getAttribute('href') || '');
      if (value !== null) {
        target.setAttribute('href', value.trim());
        setDirty();
      }
      return;
    }

    if (action === 'duplicate') {
      const clone = selected.cloneNode(true);
      clone.removeAttribute('data-cc-selected');
      clone.removeAttribute('data-cc-draggable');
      clone.removeAttribute('draggable');
      insertAfter(selected, clone);
      return;
    }

    if (action === 'up') {
      const prev = selected.previousElementSibling;
      if (prev) {
        selected.parentNode.insertBefore(selected, prev);
        setDirty();
      }
      return;
    }

    if (action === 'down') {
      const next = selected.nextElementSibling;
      if (next) {
        selected.parentNode.insertBefore(next, selected);
        setDirty();
      }
      return;
    }

    if (action === 'delete') {
      const doomed = selected;
      clearSelection();
      selected = null;
      selectionLabel.textContent = 'Element anklicken';
      doomed.remove();
      setDirty();
      return;
    }

    if (action === 'add-text') {
      const node = document.createElement('p');
      node.textContent = 'Neuer Text';
      if (selected) insertAfter(selected, node);
      else document.querySelector('main')?.appendChild(node);
      selectElement(node);
      node.setAttribute('contenteditable', 'true');
      node.focus();
      setDirty();
      return;
    }

    if (action === 'add-divider') {
      const node = document.createElement('hr');
      if (selected) insertAfter(selected, node);
      else document.querySelector('main')?.appendChild(node);
      selectElement(node);
      setDirty();
    }
  });
  document.addEventListener('mouseover', event => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('[data-cc-editor-ui]')) return;
    if (hover && hover !== selected) hover.removeAttribute('data-cc-hover');
    hover = target;
    if (hover !== selected) hover.setAttribute('data-cc-hover', '');
  }, true);

  document.addEventListener('mouseout', event => {
    const target = event.target;
    if (target instanceof Element && target !== selected) {
      target.removeAttribute('data-cc-hover');
    }
  }, true);

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('[data-cc-editor-ui]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectElement(target);
  }, true);

  document.addEventListener('dblclick', event => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('[data-cc-editor-ui]')) return;
    const selector = 'p,h1,h2,h3,h4,h5,h6,span,a,strong,em,small,figcaption,dt,dd,li';
    const textTarget = target.matches(selector) ? target : target.closest(selector);
    if (!textTarget) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectElement(textTarget);
    textTarget.setAttribute('contenteditable', 'true');
    textTarget.setAttribute('spellcheck', 'true');
    textTarget.focus();
    setDirty();
  }, true);

  document.addEventListener('input', event => {
    if (event.target instanceof Element && event.target.hasAttribute('contenteditable')) {
      setDirty();
    }
  }, true);

  document.addEventListener('dragstart', event => {
    const target = event.target;
    if (selected && target === selected) {
      dragged = selected;
      event.dataTransfer.effectAllowed = 'move';
    }
  }, true);

  document.addEventListener('dragover', event => {
    if (!dragged) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('[data-cc-editor-ui]')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, true);
  document.addEventListener('drop', event => {
    if (!dragged) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('[data-cc-editor-ui]')) return;
    event.preventDefault();
    if (target !== dragged && !dragged.contains(target) && target.parentNode) {
      target.parentNode.insertBefore(dragged, target);
      selectElement(dragged);
      setDirty();
    }
    dragged = null;
  }, true);

  document.addEventListener('dragend', () => {
    dragged = null;
  }, true);

  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
    if (event.key === 'Escape') {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.hasAttribute('contenteditable')) {
        active.removeAttribute('contenteditable');
        active.blur();
      }
    }
  });
})();
