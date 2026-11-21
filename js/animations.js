/* ==========================================================================
   JECILLÉ — ambient motion
   Loader hand-off, reveal-on-scroll, gold dust, hero parallax, progress.
   ========================================================================== */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const compact = window.matchMedia("(max-width: 760px)");

  /* ------------------------------------------------------------------ */
  /*  Reveal on scroll                                                   */
  /* ------------------------------------------------------------------ */
  function initReveals() {
    const items = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!items.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.08 }
    );

    function revealInView() {
      const viewport = window.innerHeight;
      items.forEach((el) => {
        if (el.classList.contains("is-revealed")) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < viewport - 40 && rect.bottom > 0) {
          el.classList.add("is-revealed");
          observer.unobserve(el);
        }
      });
    }

    void document.body.offsetHeight;
    revealInView();
    items.forEach((el) => {
      if (!el.classList.contains("is-revealed")) observer.observe(el);
    });

    window.addEventListener("load", revealInView);
    window.addEventListener("pageshow", revealInView);

    /* If the observer never reports anything, never leave copy invisible. */
    window.setTimeout(() => {
      if (items.some((el) => el.classList.contains("is-revealed"))) return;
      items.forEach((el) => el.classList.add("is-revealed"));
    }, 3000);
  }

  /* ------------------------------------------------------------------ */
  /*  Hero gold dust                                                     */
  /* ------------------------------------------------------------------ */
  function initParticles() {
    const canvas = document.getElementById("particles");
    if (!canvas || reduceMotion.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hero = canvas.closest(".hero") || canvas.parentElement;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let motes = [];
    let frame = 0;
    let running = false;
    let inView = true;

    const sprite = document.createElement("canvas");
    const spriteSize = 64;
    sprite.width = spriteSize;
    sprite.height = spriteSize;
    const sctx = sprite.getContext("2d");
    const glow = sctx.createRadialGradient(
      spriteSize / 2,
      spriteSize / 2,
      0,
      spriteSize / 2,
      spriteSize / 2,
      spriteSize / 2
    );
    glow.addColorStop(0, "rgba(255, 236, 200, 0.95)");
    glow.addColorStop(0.28, "rgba(226, 190, 130, 0.55)");
    glow.addColorStop(1, "rgba(197, 161, 108, 0)");
    sctx.fillStyle = glow;
    sctx.fillRect(0, 0, spriteSize, spriteSize);

    function makeMote() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2.4 + Math.random() * 10,
        speed: 0.12 + Math.random() * 0.34,
        drift: (Math.random() - 0.5) * 0.2,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.4 + Math.random() * 0.6,
        alpha: 0.22 + Math.random() * 0.5,
      };
    }

    function resize() {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.round(Math.min(54, Math.max(18, width / 34)));
      if (motes.length > target) motes.length = target;
      while (motes.length < target) motes.push(makeMote());
      motes.forEach((m) => {
        if (m.x > width) m.x = Math.random() * width;
        if (m.y > height) m.y = Math.random() * height;
      });
    }

    function draw(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < motes.length; i += 1) {
        const m = motes[i];
        m.y -= m.speed;
        m.x += m.drift + Math.sin(time * 0.00016 + m.phase) * 0.12;

        if (m.y < -m.size * 2) {
          m.y = height + m.size * 2;
          m.x = Math.random() * width;
        }
        if (m.x < -m.size * 2) m.x = width + m.size;
        if (m.x > width + m.size * 2) m.x = -m.size;

        const twinkle = 0.62 + Math.sin(time * 0.0012 + m.phase) * 0.38;
        ctx.globalAlpha = Math.max(0, m.alpha * twinkle * m.twinkle);
        ctx.drawImage(
          sprite,
          m.x - m.size / 2,
          m.y - m.size / 2,
          m.size,
          m.size
        );
      }
      ctx.globalAlpha = 1;
      frame = window.requestAnimationFrame(draw);
    }

    function start() {
      if (running || !inView || document.hidden) return;
      running = true;
      frame = window.requestAnimationFrame(draw);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(frame);
    }

    resize();
    start();

    window.addEventListener(
      "resize",
      () => {
        resize();
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          inView = entries[0].isIntersecting;
          if (inView) start();
          else stop();
        },
        { threshold: 0 }
      );
      observer.observe(hero);
    }

    reduceMotion.addEventListener("change", (event) => {
      if (event.matches) stop();
      else start();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Hero parallax, scroll progress, back to top                         */
  /* ------------------------------------------------------------------ */
  function initScrollEffects() {
    const progress = document.querySelector("#scroll-progress span");
    const heroMedia = document.querySelector(".hero__media");
    const backTop = document.getElementById("back-top");

    let ticking = false;
    let lastY = -1;

    function paint() {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      if (y === lastY) return;
      lastY = y;

      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (progress) {
        const pct = max > 0 ? Math.min(100, Math.max(0, (y / max) * 100)) : 0;
        progress.style.width = pct.toFixed(2) + "%";
      }

      if (
        heroMedia &&
        !reduceMotion.matches &&
        !compact.matches &&
        finePointer.matches &&
        y < window.innerHeight * 1.15
      ) {
        heroMedia.style.transform =
          "translate3d(0," + (y * 0.12).toFixed(2) + "px,0) scale(1.04)";
      } else if (heroMedia) {
        heroMedia.style.transform = "";
      }
    }

    function requestPaint() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(paint);
    }

    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint, { passive: true });
    paint();

    if (backTop) {
      backTop.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: reduceMotion.matches ? "auto" : "smooth",
        });
      });
    }

    reduceMotion.addEventListener("change", () => {
      lastY = -1;
      requestPaint();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    initReveals();
    initScrollEffects();
    initParticles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
