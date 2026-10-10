(() => {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 18);
  };

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  if (toggle && nav) {
    const closeNav = () => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
      document.body.classList.remove('nav-open');
    };

    toggle.addEventListener('click', () => {
      const opening = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(opening));
      nav.classList.toggle('open', opening);
      document.body.classList.toggle('nav-open', opening);
    });

    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeNav();
    });
  }

  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });

  const privacyPolicyHref = 'circuitcurios-privacy-policy.html';
  document.querySelectorAll('footer').forEach(footer => {
    if (footer.querySelector(`a[href="${privacyPolicyHref}"]`)) return;

    const privacyLink = document.createElement('a');
    privacyLink.href = privacyPolicyHref;
    privacyLink.textContent = 'Privacy Policy';

    const footerNav = footer.querySelector('nav');
    if (footerNav) {
      footerNav.appendChild(privacyLink);
      return;
    }

    const existingLinks = footer.querySelectorAll('a');
    const lastLink = existingLinks[existingLinks.length - 1];
    const linkContainer = lastLink?.parentElement;
    if (!linkContainer) return;

    linkContainer.appendChild(document.createTextNode(' · '));
    linkContainer.appendChild(privacyLink);
  });

  // The Template Maker exports the visible navigation as plain text.
  // Rebuild it as real links without changing the visual layout.
  const templateNav = document.querySelector('#home-nav-links');
  if (templateNav) {
    const links = [
      ['#surfaces-bg', 'OBERFLÄCHEN'],
      ['prozess.html', 'PROZESS'],
      ['formen.html', 'FORMEN'],
      ['ueber.html', 'ÜBER MICH'],
      ['shop.html', 'SHOP']
    ];

    templateNav.replaceChildren(...links.map(([href, label]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      return link;
    }));
  }

  // Repair stale local anchors from the Template Maker export.
  const heroSurfaces = document.querySelector('#hero-btn-surfaces');
  const heroProcess = document.querySelector('#hero-btn-process');
  if (heroSurfaces) heroSurfaces.href = '#surfaces-bg';
  if (heroProcess) heroProcess.href = '#process-bg';

  // The visible Template Maker footer was also exported as plain text.
  // Put the legal pages where visitors can actually reach them.
  const templateFooterLinks = document.querySelector('#footer-links');
  if (templateFooterLinks) {
    const links = [
      ['impressum.html', 'IMPRESSUM'],
      ['datenschutz.html', 'DATENSCHUTZ'],
      [privacyPolicyHref, 'PRIVACY POLICY']
    ];

    templateFooterLinks.replaceChildren(...links.map(([href, label]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      return link;
    }));
  }

  // Make the visible surface tiles genuinely interactive. The export currently
  // contains no href/action metadata for them, so show an accessible preview.
  const templateTextureCards = [
    document.querySelector('#template-7'),
    ...Array.from(document.querySelectorAll('.cc-tm-texture-card'))
  ].filter(Boolean);

  if (templateTextureCards.length) {
    const preview = document.createElement('dialog');
    preview.className = 'cc-texture-preview';
    preview.innerHTML = `
      <button type="button" class="cc-texture-preview-close" aria-label="Vorschau schließen">×</button>
      <div class="cc-texture-preview-media"><img alt=""></div>
      <div class="cc-texture-preview-copy">
        <p class="cc-texture-preview-meta"></p>
        <h2 class="cc-texture-preview-title"></h2>
        <p>Teil des CircuitCurios Oberflächenarchivs.</p>
        <div class="cc-texture-preview-links">
          <a href="formen.html">FORMEN ANSEHEN →</a>
          <a href="shop.html">SHOP →</a>
        </div>
      </div>`;
    document.body.appendChild(preview);

    const previewImage = preview.querySelector('img');
    const previewMedia = preview.querySelector('.cc-texture-preview-media');
    const previewTitle = preview.querySelector('.cc-texture-preview-title');
    const previewMeta = preview.querySelector('.cc-texture-preview-meta');
    const previewClose = preview.querySelector('.cc-texture-preview-close');
    let previewOpener = null;

    const surfaceNumberFor = card => {
      const match = card.id.match(/surface-(\d+)-card/);
      if (match) return Number(match[1]);
      if (card.id === 'template-7') return 1;
      return null;
    };

    const openTemplateTexture = card => {
      const number = surfaceNumberFor(card);
      const title = number
        ? document.querySelector(`#surface-${number}-title`)?.textContent?.trim()
        : '';
      const meta = number
        ? document.querySelector(`#surface-${number}-sub`)?.textContent?.trim()
        : '';
      const image = card.querySelector('img');

      previewOpener = card;
      previewTitle.textContent = title || 'OBERFLÄCHE';
      previewMeta.textContent = meta || 'OBERFLÄCHENARCHIV';

      if (image?.src) {
        previewImage.src = image.currentSrc || image.src;
        previewImage.alt = title || image.alt || 'Oberfläche';
        previewMedia.hidden = false;
      } else {
        previewImage.removeAttribute('src');
        previewImage.alt = '';
        previewMedia.hidden = true;
      }

      preview.showModal();
      previewClose.focus();
    };

    templateTextureCards.forEach(card => {
      card.classList.add('cc-is-clickable');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.addEventListener('click', () => openTemplateTexture(card));
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openTemplateTexture(card);
      });
    });

    previewClose.addEventListener('click', () => preview.close());
    preview.addEventListener('click', event => {
      if (event.target === preview) preview.close();
    });
    preview.addEventListener('close', () => {
      previewOpener?.focus({ preventScroll: true });
      previewOpener = null;
    });
  }

  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      reveals.forEach(el => el.classList.add('visible'));
    } else {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
      reveals.forEach(el => observer.observe(el));
    }
  }

  const editorMode =
    window.CC_EDITOR_MODE === true ||
    new URLSearchParams(location.search).has('cceditor');

  const dialog = document.querySelector('[data-texture-dialog]');
  const cards = document.querySelectorAll('[data-texture-card]');

  if (!editorMode && dialog && cards.length) {
    const image = dialog.querySelector('[data-texture-dialog-image]');
    const title = dialog.querySelector('[data-texture-dialog-title]');
    const material = dialog.querySelector('[data-texture-dialog-material]');
    const description = dialog.querySelector('[data-texture-dialog-description]');
    const closeButton = dialog.querySelector('[data-texture-dialog-close]');
    const fields = ['group', 'family', 'pattern', 'principle'];
    let opener = null;

    const readDataset = (card, field) => {
      const key = 'texture' + field[0].toUpperCase() + field.slice(1);
      return (card.dataset[key] || '').trim();
    };

    const openCard = card => {
      opener = card;
      const cardImage = card.querySelector('img');
      const cardTitle = card.querySelector('figcaption strong');

      if (image && cardImage) {
        image.src = cardImage.currentSrc || cardImage.src;
        image.alt = cardImage.alt || '';
      }
      if (title) title.textContent = cardTitle?.textContent?.trim() || 'Oberfläche';
      if (material) material.textContent = 'Handbearbeitetes Aluminium';

      fields.forEach(field => {
        const value = readDataset(card, field);
        const row = dialog.querySelector('[data-texture-row="' + field + '"]');
        const target = dialog.querySelector('[data-texture-dialog-' + field + ']');
        if (target) target.textContent = value;
        if (row) row.hidden = !value;
      });

      if (description) description.textContent = (card.dataset.textureDescription || '').trim();

      dialog.showModal();
      closeButton?.focus();
    };

    const closeDialog = () => {
      if (dialog.open) dialog.close();
    };

    cards.forEach(card => {
      card.addEventListener('click', () => openCard(card));
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openCard(card);
      });
    });

    closeButton?.addEventListener('click', closeDialog);

    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });

    dialog.addEventListener('close', () => {
      opener?.focus({ preventScroll: true });
      opener = null;
    });
  }
})();
