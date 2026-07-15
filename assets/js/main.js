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

  /* ---------------------------------------------------------
     Carrusel de productos
     Progressive enhancement: sin JS los tres paneles se apilan
     y son accesibles. Con JS la pista pasa a una fila y un único
     estado (activeIndex) mueve la pista con translate3d y
     sincroniza indicador, puntos y foco. Navegación circular con
     flechas, puntos, teclado y gesto táctil. Sin autoplay.
     --------------------------------------------------------- */

  const carousel = document.querySelector("[data-carousel]");

  if (carousel) {
    const viewport = carousel.querySelector("[data-carousel-viewport]");
    const track = carousel.querySelector("[data-carousel-track]");
    const panels = Array.from(carousel.querySelectorAll("[data-slide]"));
    const controls = carousel.querySelector("[data-carousel-controls]");
    const prevBtn = carousel.querySelector("[data-carousel-prev]");
    const nextBtn = carousel.querySelector("[data-carousel-next]");
    const current = carousel.querySelector("[data-carousel-current]");
    const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));

    if (viewport && track && panels.length) {
      const total = panels.length;
      let activeIndex = 0;

      const prefersReducedMotion = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const supportsInert = "inert" in HTMLElement.prototype;

      // Solo con JS: pista en fila y controles visibles.
      carousel.classList.add("is-enhanced");
      if (controls) controls.hidden = false;

      const pad = (n) => String(n + 1).padStart(2, "0");

      // El panel activo es el único interactivo/anunciado.
      const syncActivePanel = () => {
        panels.forEach((panel, i) => {
          const inactive = i !== activeIndex;
          panel.setAttribute("aria-hidden", inactive ? "true" : "false");
          if (supportsInert) {
            panel.inert = inactive;
          } else {
            panel
              .querySelectorAll("a, button")
              .forEach((el) => {
                el.tabIndex = inactive ? -1 : 0;
              });
          }
        });
      };

      // Coloca la pista. En modo instantáneo (inicial, arrastre en
      // curso, reducción de movimiento) se desactiva la transición y
      // se reactiva tras forzar un reflow síncrono — sin depender de
      // requestAnimationFrame.
      const applyPosition = (animate) => {
        const instant = !animate || prefersReducedMotion();
        track.style.transition = instant ? "none" : "";
        track.style.transform = `translate3d(${-activeIndex * 100}%, 0, 0)`;
        if (instant) {
          void track.offsetWidth;
          track.style.transition = "";
        }
      };

      const render = ({ animate = true } = {}) => {
        applyPosition(animate);
        if (current) current.textContent = pad(activeIndex);
        dots.forEach((dot, i) =>
          dot.setAttribute("aria-current", i === activeIndex ? "true" : "false")
        );
        syncActivePanel();
      };

      const goToSlide = (target, options) => {
        activeIndex = ((target % total) + total) % total; // circular
        render(options);
      };

      // Posición inicial sin animación.
      render({ animate: false });

      if (prevBtn)
        prevBtn.addEventListener("click", () => goToSlide(activeIndex - 1));
      if (nextBtn)
        nextBtn.addEventListener("click", () => goToSlide(activeIndex + 1));

      dots.forEach((dot) => {
        dot.addEventListener("click", () =>
          goToSlide(Number(dot.getAttribute("data-carousel-dot")))
        );
      });

      carousel.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goToSlide(activeIndex - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goToSlide(activeIndex + 1);
        }
      });

      /* Gesto táctil / puntero: se sigue el dedo en horizontal; el
         desplazamiento vertical se cede a la página (touch-action:
         pan-y en CSS + abandono si el gesto es vertical). */
      let startX = 0;
      let startY = 0;
      let width = 0;
      let dragging = false;
      let moved = false;

      const onPointerDown = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        width = viewport.clientWidth || 1;
        track.style.transition = "none";
      };

      const onPointerMove = (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!moved && Math.abs(dy) > Math.abs(dx)) {
          // Intención vertical: soltar y dejar que la página haga scroll.
          dragging = false;
          track.style.transition = "";
          render({ animate: false });
          return;
        }
        if (Math.abs(dx) > 6) moved = true;
        const offset = -activeIndex * 100 + (dx / width) * 100;
        track.style.transform = `translate3d(${offset}%, 0, 0)`;
      };

      const onPointerUp = (event) => {
        if (!dragging) return;
        dragging = false;
        track.style.transition = "";
        const dx = event.clientX - startX;
        const threshold = width * 0.2;
        if (dx <= -threshold) goToSlide(activeIndex + 1);
        else if (dx >= threshold) goToSlide(activeIndex - 1);
        else render({ animate: true });
      };

      viewport.addEventListener("pointerdown", onPointerDown);
      viewport.addEventListener("pointermove", onPointerMove);
      viewport.addEventListener("pointerup", onPointerUp);
      viewport.addEventListener("pointercancel", onPointerUp);
      // Evita que un arrastre dispare el enlace del panel al soltar.
      viewport.addEventListener(
        "click",
        (event) => {
          if (moved) event.preventDefault();
        },
        true
      );
    }
  }
})();
