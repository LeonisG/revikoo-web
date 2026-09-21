(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setHeaderState() {
    header?.classList.toggle('is-scrolled', window.scrollY > 18);
  }

  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  function closeMenu(returnFocus) {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
    nav.classList.remove('is-open');
    root.classList.remove('menu-open');
    if (returnFocus) menuToggle.focus();
  }

  menuToggle?.addEventListener('click', () => {
    const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? 'Cerrar menú' : 'Abrir menú');
    nav?.classList.toggle('is-open', opening);
    root.classList.toggle('menu-open', opening);
  });

  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) closeMenu(true);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) closeMenu(false);
  });

  const observedItems = document.querySelectorAll('.reveal, .draw-on-view');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    observedItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

    observedItems.forEach((item) => observer.observe(item));
  }

  const pageSections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute('href') === '#' + visible.target.id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, 0.2, 0.5] });

    pageSections.forEach((section) => sectionObserver.observe(section));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  if (!reduceMotion.matches) {
    const hero = document.querySelector('.hero');
    const scribble = document.querySelector('.hero__scribble');

    hero?.addEventListener('pointermove', (event) => {
      if (!scribble || window.innerWidth < 900) return;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
      scribble.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    });

    hero?.addEventListener('pointerleave', () => {
      if (scribble) scribble.style.transform = '';
    });
  }
}());
