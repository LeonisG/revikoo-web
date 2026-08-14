/* =====================================================================
   VELVET ROSE — comportamiento
   JavaScript vanilla, sin dependencias.
   Principio: la web funciona sin JS. Esto solo añade movimiento.
   ===================================================================== */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Apertura ──────────────────────────────────────────────────────
     La animación es 100% CSS (si el JS falla, termina igual y nunca
     bloquea la página). Aquí solo se marca como vista y se limpia. */
  const intro = $("[data-intro]");
  if (intro) {
    if (document.documentElement.classList.contains("vr-armed")) {
      try { sessionStorage.setItem("vr:intro", "1"); } catch (e) {}
      window.setTimeout(() => {
        intro.remove();
        document.documentElement.classList.remove("vr-armed");
      }, 2000);
    } else {
      intro.remove();
    }
  }

  /* ── Hero: entrada ─────────────────────────────────────────────── */
  const hero = $(".vr-hero");
  if (hero) {
    const delay = document.documentElement.classList.contains("vr-armed") ? 900 : 80;
    window.setTimeout(() => hero.classList.add("is-in"), delay);
  }

  /* ── Navegación: superficie al hacer scroll ────────────────────── */
  const nav = $("[data-nav]");
  if (nav) {
    let ticking = false;
    const update = () => {
      nav.classList.toggle("is-stuck", window.scrollY > 40);
      ticking = false;
    };
    update();
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
  }

  /* ── Menú fullscreen ───────────────────────────────────────────── */
  const menu = $("[data-menu]");
  const openBtn = $("[data-menu-open]");
  const closeBtn = $("[data-menu-close]");

  if (menu && openBtn) {
    let lastFocus = null;

    const openMenu = () => {
      lastFocus = document.activeElement;
      menu.hidden = false;
      // Fuerza reflow para que la transición de clip-path arranque
      void menu.offsetWidth;
      menu.classList.add("is-open");
      openBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
      const first = menu.querySelector("a, button");
      if (first) first.focus();
    };

    const closeMenu = ({ refocus = true } = {}) => {
      menu.classList.remove("is-open");
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      const done = () => { menu.hidden = true; };
      if (reduced.matches) done();
      else window.setTimeout(done, 700);
      if (refocus && lastFocus) lastFocus.focus();
    };

    openBtn.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", () => closeMenu());

    // Cualquier enlace cierra el menú antes de saltar a la sección
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) closeMenu({ refocus: false });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) closeMenu();
    });

    // El menú es solo para viewports estrechos
    const wide = window.matchMedia("(min-width: 861px)");
    wide.addEventListener("change", (e) => {
      if (e.matches && !menu.hidden) closeMenu({ refocus: false });
    });
  }

  /* ── Revelado al entrar en pantalla ────────────────────────────────
     Una sola regla repetida: subir + aparecer. Se observa una vez. */
  const revealTargets = $$("[data-reveal]");

  if (revealTargets.length) {
    if (reduced.matches || !("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        });
        // Umbral bajo: algunos bloques son más altos que el viewport
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

      revealTargets.forEach((el) => io.observe(el));

      /* Red de seguridad: el contenido nunca depende de la animación.
         Si se entra a mitad de página (un ancla, un recargar con scroll
         restaurado) o el observador no llega a disparar, todo lo que ya
         está a la vista se muestra igualmente. */
      const revealVisible = () => {
        revealTargets.forEach((el) => {
          if (el.classList.contains("is-in")) return;
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
        });
      };
      window.addEventListener("load", revealVisible, { once: true });
      window.addEventListener("pageshow", revealVisible, { once: true });
    }
  }

  /* ── Salas: tabs accesibles con teclado ────────────────────────── */
  const tablist = $("[data-tabs]");
  if (tablist) {
    const tabs = $$('[role="tab"]', tablist);

    const select = (tab, focus = true) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(tab);
        let next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next);
      });
    });
  }

  /* ── Año en curso ──────────────────────────────────────────────── */
  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ══════════════════════════════════════════════════════════════════
     Movimiento continuo: un único bucle rAF para todo lo que sigue
     al cursor o al scroll. Nada de listeners pesados por elemento.
     ══════════════════════════════════════════════════════════════════ */
  if (!reduced.matches) {
    const rose = $("[data-rose]");
    const glow = $("[data-glow]");
    const peek = $("[data-agenda-peek]");
    const peekImg = peek ? peek.querySelector("img") : null;
    const parallaxEls = $$("[data-parallax]");
    const canHover = finePointer.matches;

    // Objetivo (target) y valor suavizado (current) de cada magnitud
    const p = { tx: 0, ty: 0, cx: 0, cy: 0 };   // puntero normalizado -1..1
    const g = { tx: 0, ty: 0, cx: 0, cy: 0 };   // halo, en px
    const k = { tx: 0, ty: 0, cx: 0, cy: 0 };   // preview de agenda, en px
    let scrollY = window.scrollY;
    let running = false;

    if (canHover) {
      window.addEventListener("pointermove", (e) => {
        p.tx = (e.clientX / window.innerWidth) * 2 - 1;
        p.ty = (e.clientY / window.innerHeight) * 2 - 1;
        g.tx = e.clientX; g.ty = e.clientY;
        k.tx = e.clientX; k.ty = e.clientY;
        if (glow && !glow.classList.contains("is-on")) glow.classList.add("is-on");
        start();
      }, { passive: true });
    }

    window.addEventListener("scroll", () => {
      scrollY = window.scrollY;
      start();
    }, { passive: true });

    function frame() {
      // Suavizado: el movimiento debe sentirse pesado, no nervioso
      p.cx = lerp(p.cx, p.tx, 0.045);
      p.cy = lerp(p.cy, p.ty, 0.045);
      g.cx = lerp(g.cx, g.tx, 0.12);
      g.cy = lerp(g.cy, g.ty, 0.12);
      k.cx = lerp(k.cx, k.tx, 0.14);
      k.cy = lerp(k.cy, k.ty, 0.14);

      if (rose) {
        rose.style.setProperty("--rx", (p.cx * 26).toFixed(2));
        rose.style.setProperty("--ry", (p.cy * 20).toFixed(2));
        rose.style.setProperty("--rs", (scrollY * 0.03).toFixed(2));
      }
      if (glow) {
        glow.style.transform = `translate3d(${g.cx.toFixed(1)}px, ${g.cy.toFixed(1)}px, 0)`;
      }
      if (peek) {
        peek.style.transform =
          `translate3d(${k.cx.toFixed(1)}px, ${k.cy.toFixed(1)}px, 0) ` +
          (peek.classList.contains("is-on") ? "scale(1)" : "scale(.9)") + " rotate(-4deg)";
      }
      for (const el of parallaxEls) {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2 - window.innerHeight / 2;
        const amt = Number(el.dataset.parallax) || 0.05;
        el.style.transform = `translate3d(0, ${(-mid * amt).toFixed(1)}px, 0)`;
      }

      // Se detiene cuando ya no queda movimiento pendiente
      const idle =
        Math.abs(p.cx - p.tx) < 0.001 && Math.abs(p.cy - p.ty) < 0.001 &&
        Math.abs(g.cx - g.tx) < 0.1 && Math.abs(k.cx - k.tx) < 0.1;

      if (idle && !parallaxEls.length) { running = false; return; }
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      window.requestAnimationFrame(frame);
    }

    // Preview de la agenda: solo con puntero fino
    if (peek && peekImg && canHover) {
      $$("[data-poster]").forEach((row) => {
        row.addEventListener("pointerenter", () => {
          const src = row.getAttribute("data-poster");
          if (src && peekImg.getAttribute("src") !== src) peekImg.setAttribute("src", src);
          peek.classList.add("is-on");
          start();
        });
        row.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
      });
    }

    start();
  }
})();
