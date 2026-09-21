(function () {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateHeader() {
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  function closeMenu(returnFocus) {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menú');
    nav.classList.remove('is-open');
    header?.classList.remove('menu-visible');
    root.classList.remove('menu-open');
    if (returnFocus) menuToggle.focus();
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  menuToggle?.addEventListener('click', () => {
    const isOpening = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(isOpening));
    menuToggle.setAttribute('aria-label', isOpening ? 'Cerrar menú' : 'Abrir menú');
    nav?.classList.toggle('is-open', isOpening);
    header?.classList.toggle('menu-visible', isOpening);
    root.classList.toggle('menu-open', isOpening);
  });

  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) closeMenu(true);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu(false);
  });

  const revealItems = document.querySelectorAll('.reveal');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries.find((entry) => entry.isIntersecting);
      if (!current) return;

      navLinks.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${current.target.id}`;
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
}());
