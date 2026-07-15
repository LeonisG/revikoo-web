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
     Navegación: marca la sección visible en desktop y móvil
     --------------------------------------------------------- */

  const sectionNavLinks = Array.from(
    document.querySelectorAll(
      '.navbar__links a[href^="#"], .mobile-menu__links a[href^="#"]'
    )
  );

  if (sectionNavLinks.length) {
    const sectionIds = [...new Set(
      sectionNavLinks
        .map((link) => link.getAttribute("href"))
        .filter((href) => href && href.length > 1)
        .map((href) => href.slice(1))
    )];

    const trackedSections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section) => section && !section.hidden);

    const setActiveSection = (id) => {
      sectionNavLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    sectionNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const href = link.getAttribute("href");
        if (href && href.startsWith("#")) setActiveSection(href.slice(1));
      });
    });

    if (trackedSections.length && "IntersectionObserver" in window) {
      const navObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          if (visible[0]) setActiveSection(visible[0].target.id);
        },
        {
          threshold: [0.08, 0.25, 0.5],
          rootMargin: "-24% 0px -58% 0px",
        }
      );

      trackedSections.forEach((section) => navObserver.observe(section));
    }
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
     Demo de “Cómo funciona”
     Se reproduce una sola vez al entrar en pantalla. El botón
     permite reiniciarla y los tres pasos se sincronizan con la
     secuencia visual. No depende de un vídeo externo.
     --------------------------------------------------------- */

  const reviewDemo = document.querySelector("[data-review-demo]");

  if (reviewDemo) {
    const replayButton = reviewDemo.querySelector("[data-demo-replay]");
    const stateLabel = reviewDemo.querySelector("[data-demo-state]");
    const demoSteps = Array.from(document.querySelectorAll("[data-demo-step]"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stepLabels = [
      "01 · Acerca el móvil",
      "02 · Abre el acceso",
      "03 · Comparte su experiencia",
    ];
    const timers = [];
    let hasPlayed = false;

    const clearDemoTimers = () => {
      while (timers.length) window.clearTimeout(timers.pop());
    };

    const setActiveStep = (index) => {
      demoSteps.forEach((step, stepIndex) => {
        step.classList.toggle("is-active", stepIndex === index);
      });
      if (stateLabel) stateLabel.textContent = stepLabels[index];
    };

    const showReducedMotionState = () => {
      clearDemoTimers();
      reviewDemo.classList.remove("is-playing");
      setActiveStep(2);
    };

    const playDemo = () => {
      if (reducedMotion.matches) {
        showReducedMotionState();
        return;
      }

      clearDemoTimers();
      reviewDemo.classList.remove("is-playing");
      void reviewDemo.offsetWidth;
      setActiveStep(0);
      reviewDemo.classList.add("is-playing");

      timers.push(window.setTimeout(() => setActiveStep(1), 2500));
      timers.push(window.setTimeout(() => setActiveStep(2), 4550));
    };

    replayButton?.addEventListener("click", playDemo);

    reducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) showReducedMotionState();
      else playDemo();
    });

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      reducedMotion.matches ? showReducedMotionState() : playDemo();
      hasPlayed = true;
    } else {
      const demoObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasPlayed) {
              hasPlayed = true;
              playDemo();
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.35 }
      );

      demoObserver.observe(reviewDemo);
    }
  }

  /* ---------------------------------------------------------
     Carrusel de productos
     Swiper gestiona loop, teclado, gesto y paginación cuando está
     disponible. Si el CDN falla, el mismo componente funciona con
     un fallback vanilla, de modo que los controles nunca quedan
     inactivos en localhost o en GitHub Pages.
     --------------------------------------------------------- */

  const carousel = document.querySelector("[data-carousel]");

  if (carousel) {
    const swiperElement = carousel.querySelector("[data-carousel-swiper]");
    const prevButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    const pagination = carousel.querySelector("[data-carousel-pagination]");
    const current = carousel.querySelector("[data-carousel-current]");
    const totalElement = carousel.querySelector("[data-carousel-total]");
    const status = carousel.querySelector("[data-carousel-status]");
    const sourceSlides = Array.from(carousel.querySelectorAll(".swiper-slide"));
    const productNames = sourceSlides.map(
      (slide, index) => slide.dataset.productName || `Producto ${index + 1}`
    );
    const total = sourceSlides.length;
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const normalize = (index) => ((index % total) + total) % total;
    const pad = (index) => String(index + 1).padStart(2, "0");

    if (totalElement) totalElement.textContent = String(total).padStart(2, "0");

    const updateTextState = (index) => {
      const activeIndex = normalize(index);
      if (current) current.textContent = pad(activeIndex);
      if (status) {
        status.textContent = `Producto ${activeIndex + 1} de ${total}: ${productNames[activeIndex]}`;
      }

      carousel.querySelectorAll(".swiper-pagination-bullet").forEach((bullet, bulletIndex) => {
        const isActive = bulletIndex === activeIndex;
        bullet.setAttribute("aria-current", isActive ? "true" : "false");
        bullet.setAttribute("aria-label", `Mostrar ${productNames[bulletIndex]}`);
      });
    };

    const setSlideInteractivity = (slides, activeIndex) => {
      slides.forEach((slide) => {
        const dataIndex = Number(slide.getAttribute("data-swiper-slide-index"));
        const originalIndex = Number.isNaN(dataIndex)
          ? sourceSlides.indexOf(slide)
          : dataIndex;
        const isActive = originalIndex === activeIndex && slide.classList.contains("swiper-slide-active");

        slide.setAttribute("aria-hidden", isActive ? "false" : "true");
        slide.querySelectorAll("a, button").forEach((element) => {
          element.tabIndex = isActive ? 0 : -1;
        });
      });
    };

    const initializeSwiper = () => {
      if (!swiperElement || typeof window.Swiper !== "function") return false;

      try {
        const swiper = new window.Swiper(swiperElement, {
          slidesPerView: 1,
          spaceBetween: 0,
          loop: true,
          speed: reducedMotionQuery.matches ? 0 : 480,
          grabCursor: true,
          watchOverflow: true,
          keyboard: {
            enabled: true,
            onlyInViewport: true,
            pageUpDown: false,
          },
          navigation: {
            prevEl: prevButton,
            nextEl: nextButton,
          },
          pagination: {
            el: pagination,
            clickable: true,
            renderBullet(index, className) {
              return `<button type="button" class="${className}" aria-label="Mostrar ${productNames[index]}"></button>`;
            },
          },
          a11y: {
            enabled: true,
            prevSlideMessage: "Mostrar modelo anterior",
            nextSlideMessage: "Mostrar modelo siguiente",
            paginationBulletMessage: "Mostrar producto {{index}}",
          },
          on: {
            init(instance) {
              updateTextState(instance.realIndex);
              setSlideInteractivity(Array.from(instance.slides), instance.realIndex);
            },
            realIndexChange(instance) {
              updateTextState(instance.realIndex);
              setSlideInteractivity(Array.from(instance.slides), instance.realIndex);
            },
          },
        });

        reducedMotionQuery.addEventListener?.("change", (event) => {
          swiper.params.speed = event.matches ? 0 : 480;
        });

        return true;
      } catch (error) {
        console.warn("Swiper no pudo inicializarse; se activa el fallback vanilla.", error);
        return false;
      }
    };

    const initializeFallback = () => {
      if (!swiperElement || !total || !pagination) return;

      carousel.classList.add("carousel--fallback");
      const wrapper = swiperElement.querySelector(".swiper-wrapper");
      if (!wrapper) return;

      let activeIndex = 0;
      let pointerStartX = null;
      let pointerStartY = null;

      pagination.innerHTML = productNames
        .map(
          (name, index) =>
            `<button type="button" class="swiper-pagination-bullet" data-fallback-index="${index}" aria-label="Mostrar ${name}"></button>`
        )
        .join("");

      const bullets = Array.from(pagination.querySelectorAll("[data-fallback-index]"));

      const render = ({ animate = true } = {}) => {
        wrapper.style.transitionDuration = !animate || reducedMotionQuery.matches ? "0ms" : "480ms";
        wrapper.style.transform = `translate3d(${-activeIndex * 100}%, 0, 0)`;

        sourceSlides.forEach((slide, index) => {
          const isActive = index === activeIndex;
          slide.classList.toggle("swiper-slide-active", isActive);
          slide.setAttribute("aria-hidden", isActive ? "false" : "true");
          slide.querySelectorAll("a, button").forEach((element) => {
            element.tabIndex = isActive ? 0 : -1;
          });
        });

        bullets.forEach((bullet, index) => {
          const isActive = index === activeIndex;
          bullet.classList.toggle("swiper-pagination-bullet-active", isActive);
          bullet.setAttribute("aria-current", isActive ? "true" : "false");
        });

        updateTextState(activeIndex);
      };

      const goTo = (index) => {
        activeIndex = normalize(index);
        render();
      };

      prevButton?.addEventListener("click", () => goTo(activeIndex - 1));
      nextButton?.addEventListener("click", () => goTo(activeIndex + 1));
      bullets.forEach((bullet) => {
        bullet.addEventListener("click", () => goTo(Number(bullet.dataset.fallbackIndex)));
      });

      swiperElement.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(activeIndex - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goTo(activeIndex + 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          goTo(0);
        } else if (event.key === "End") {
          event.preventDefault();
          goTo(total - 1);
        }
      });

      swiperElement.addEventListener("pointerdown", (event) => {
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      });

      swiperElement.addEventListener("pointerup", (event) => {
        if (pointerStartX === null || pointerStartY === null) return;
        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        pointerStartX = null;
        pointerStartY = null;

        if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY)) {
          goTo(activeIndex + (deltaX < 0 ? 1 : -1));
        }
      });

      render({ animate: false });
    };

    if (!initializeSwiper()) initializeFallback();
  }

})();
