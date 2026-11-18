/* CircuitCurios – gemeinsame Welt-Navigation (Schmuck / Uhren)
 * Die Template-Maker-Leinwand bleibt unangetastet. Keine versteckten Doppel-Seiten.
 */
(() => {
  'use strict';
  const init = () => {
    // In der Editor-Vorschau keine Bedienelemente in die exportierte Leinwand mischen.
    if (window.CC_EDITOR_MODE === true || new URLSearchParams(location.search).has('cceditor')) return;
    const clocks = document.documentElement.dataset.ccWorld === 'uhren' ||
      /(?:^|\/)uhren(?:\/|$)/i.test(location.pathname);
    const prefix = clocks ? '../' : '';
    const pages = [
      { label: 'Start', href: './index.html', id: 'index.html' },
      { label: 'Wanduhren', href: './wanduhren.html', id: 'wanduhren.html' },
      { label: 'Entstehung', href: './entstehung.html', id: 'entstehung.html' }
    ];

    if (clocks) {
      const nav = document.querySelector('.cc-clock-header .navigation');
      if (nav) {
        const current = location.pathname.split('/').pop() || 'index.html';
        nav.replaceChildren(...pages.map(page => {
          const a = document.createElement('a');
          a.href = page.href;
          a.textContent = page.label;
          if (current === page.id) a.setAttribute('aria-current', 'page');
          return a;
        }));
        nav.addEventListener('click', event => {
          if (!event.target.closest('a')) return;
          const toggle = document.querySelector('.cc-clock-header [data-menu-toggle]');
          toggle?.setAttribute('aria-expanded', 'false');
          nav.classList.remove('open');
          document.body.classList.remove('menu-open');
        });
      }
      const brand = document.querySelector('.cc-clock-header .brand');
      if (brand) {
        brand.href = './index.html';
        brand.setAttribute('aria-label', 'CircuitCurios Uhren – zur Startseite');
      }
    }

    const switcher = document.createElement('nav');
    switcher.className = 'cc-world-switch';
    switcher.setAttribute('aria-label', 'Bereich wählen');
    [
      { label: 'Schmuck', href: prefix + 'index.html', active: !clocks },
      { label: 'Uhren', href: prefix + 'uhren/index.html', active: clocks }
    ].forEach(page => {
      const a = document.createElement('a');
      a.href = clocks && page.label === 'Uhren' ? './index.html' : page.href;
      a.textContent = page.label;
      if (page.active) {
        a.className = 'is-active';
        a.setAttribute('aria-current', 'page');
      }
      switcher.appendChild(a);
    });
    const clockHeader = clocks && document.querySelector('.cc-clock-header .header-inner');
    (clockHeader || document.body).appendChild(switcher);

    // Nur Uhren-Vorlagen haben hier einen Platzhalter. Auf den bestehenden
    // Schmuck-Exportseiten bleibt der vorhandene Footer unverändert.
    document.querySelectorAll('[data-cc-shared-footer]').forEach(slot => {
      const footer = document.createElement('footer');
      footer.className = 'cc-shared-footer';
      const inner = document.createElement('div');
      inner.className = 'cc-shared-footer-inner';
      const identity = document.createElement('span');
      identity.textContent = 'CIRCUIT CURIOS · © ' + new Date().getFullYear();
      const links = document.createElement('nav');
      links.setAttribute('aria-label', 'Rechtliches');
      [
        { label: 'Impressum', href: prefix + 'impressum.html' },
        { label: 'Datenschutz', href: prefix + 'policy.html' }
      ].forEach(item => {
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        links.appendChild(a);
      });
      inner.append(identity, links);
      footer.append(inner);
      slot.replaceWith(footer);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
