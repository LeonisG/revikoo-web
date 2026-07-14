(() => {
  "use strict";

  /* ---------------------------------------------------------
     Navbar: gana superficie sólida al hacer scroll
     --------------------------------------------------------- */

  const navbar = document.querySelector("[data-navbar]");

  if (navbar) {
    const SCROLL_THRESHOLD = 8;
    let ticking = false;

    const updateNavbarState = () => {
      navbar.classList.toggle("navbar--scrolled", window.scrollY > SCROLL_THRESHOLD);
      ticking = false;
    };

    updateNavbarState();

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(updateNavbarState);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------
     Menú móvil
     --------------------------------------------------------- */

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  if (menuToggle && mobileMenu) {
    const desktopQuery = window.matchMedia("(min-width: 900px)");

    const closeMenu = ({ refocus = false } = {}) => {
      mobileMenu.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
      document.body.classList.remove("no-scroll");
      if (refocus) menuToggle.focus();
    };

    const openMenu = () => {
      mobileMenu.hidden = false;
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Cerrar menú");
      document.body.classList.add("no-scroll");
      const firstLink = mobileMenu.querySelector("a");
      if (firstLink) firstLink.focus();
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      isOpen ? closeMenu() : openMenu();
    });

    mobileMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !mobileMenu.hidden) {
        closeMenu({ refocus: true });
      }
    });

    desktopQuery.addEventListener("change", (event) => {
      if (event.matches && !mobileMenu.hidden) {
        closeMenu();
      }
    });
  }

  /* ---------------------------------------------------------
     Sistema de aparición durante el scroll
     --------------------------------------------------------- */

  const revealTargets = document.querySelectorAll(".reveal");

  if (revealTargets.length) {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.2,
          rootMargin: "0px 0px -10% 0px",
        }
      );

      revealTargets.forEach((el) => observer.observe(el));
    }
  }

  /* ---------------------------------------------------------
     Acordeón de preguntas frecuentes
     --------------------------------------------------------- */

  document.querySelectorAll(".faq-item__trigger").forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!panel) return;

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isOpen));
      panel.hidden = isOpen;
    });
  });

  /* ---------------------------------------------------------
     "El gesto": el móvil se aproxima y la línea se dibuja
     una única vez al entrar en el viewport.
     --------------------------------------------------------- */

  const gestureDemo = document.querySelector("[data-gesture]");

  if (gestureDemo) {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      gestureDemo.classList.add("is-visible");
    } else {
      const gestureObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );

      gestureObserver.observe(gestureDemo);
    }
  }
})();
