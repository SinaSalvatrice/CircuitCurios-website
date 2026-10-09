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
