(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const progress = document.querySelector("[data-progress]");
  const heroPhone = document.querySelector("[data-hero-phone]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const closeMenu = (returnFocus = false) => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    nav.classList.remove("is-open");
    header?.classList.remove("menu-visible");
    document.body.classList.remove("menu-open");
    if (returnFocus) menuToggle.focus();
  };

  menuToggle?.addEventListener("click", () => {
    const opening = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(opening));
    menuToggle.setAttribute("aria-label", opening ? "Cerrar menú" : "Abrir menú");
    nav?.classList.toggle("is-open", opening);
    header?.classList.toggle("menu-visible", opening);
    document.body.classList.toggle("menu-open", opening);
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) closeMenu(true);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu();
  });

  let frameRequested = false;

  const updateScrollEffects = () => {
    const y = window.scrollY;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    header?.classList.toggle("is-scrolled", y > 12);
    if (progress) progress.style.transform = `scaleX(${Math.min(y / maxScroll, 1)})`;

    if (heroPhone && !reduceMotion.matches && y < window.innerHeight * 1.2) {
      const ratio = Math.min(y / window.innerHeight, 1);
      heroPhone.style.setProperty("--phone-y", `${ratio * 32}px`);
      heroPhone.style.setProperty("--phone-r", `${-2 + ratio * 1.2}deg`);
      heroPhone.style.setProperty("--phone-s", `${1 + ratio * 0.035}`);
    }
    frameRequested = false;
  };

  window.addEventListener("scroll", () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(updateScrollEffects);
  }, { passive: true });
  updateScrollEffects();

  const revealItems = document.querySelectorAll(".reveal");

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const howSteps = [...document.querySelectorAll("[data-step]")];
  const flowScreens = [...document.querySelectorAll("[data-screen]")];

  const activateStep = (index) => {
    howSteps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      step.classList.toggle("is-active", active);
      step.querySelector("button")?.setAttribute("aria-pressed", String(active));
    });

    flowScreens.forEach((screen, screenIndex) => {
      const active = screenIndex === index;
      screen.classList.toggle("is-active", active);
      screen.setAttribute("aria-hidden", String(!active));
    });
  };

  howSteps.forEach((step, index) => {
    step.querySelector("button")?.addEventListener("click", () => activateStep(index));
  });

  if ("IntersectionObserver" in window && howSteps.length) {
    const stepObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activateStep(howSteps.indexOf(visible.target));
    }, { rootMargin: "-22% 0px -42% 0px", threshold: [0.15, 0.45, 0.7] });

    howSteps.forEach((step) => stepObserver.observe(step));
  }

  const creditDemo = document.querySelector("[data-credit-demo]");
  const creditCount = document.querySelector("[data-credit-count]");
  let creditAnimated = false;

  const animateCredits = () => {
    if (!creditCount || creditAnimated) return;
    creditAnimated = true;

    if (reduceMotion.matches) {
      creditCount.textContent = "52";
      return;
    }

    const values = [60, 59, 58, 57, 56, 55, 54, 53, 52];
    values.forEach((value, index) => {
      window.setTimeout(() => {
        creditCount.textContent = String(value);
      }, 900 + index * 110);
    });
  };

  if (creditDemo && "IntersectionObserver" in window) {
    const creditObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      animateCredits();
      observer.disconnect();
    }, { threshold: 0.55 });
    creditObserver.observe(creditDemo);
  } else {
    animateCredits();
  }

  const navLinks = [...document.querySelectorAll('.main-nav a[href^="#"]')]
    .filter((link) => !link.classList.contains("nav-cta"));
  const trackedSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && trackedSections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries.find((entry) => entry.isIntersecting);
      if (!current) return;
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${current.target.id}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-25% 0px -65% 0px" });

    trackedSections.forEach((section) => sectionObserver.observe(section));
  }
})();
