/* ============================================================
   Jusnie — portfolio scripts
   1. mobile menu   2. current section in the nav   3. copy email
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- 0. loading screen: one rep per 10% of the load ---------------- */

  const lift = document.getElementById('lift');

  if (lift) {
    const frame = document.getElementById('lift-frame');
    const pct = document.getElementById('lift-pct');
    const bar = document.getElementById('lift-bar');
    const repEl = document.getElementById('lift-rep');

    // the four bench frames, warm in the cache before the first paint matters
    const sheets = [1, 2, 3, 4].map((n) => {
      const img = new Image();
      img.src = `assets/svg/sprite-bench-${n}.svg`;
      return img;
    });

    let seen = false;
    try {
      seen = sessionStorage.getItem('lift-seen') === '1';
    } catch {
      seen = false;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (seen || reduce) {
      lift.remove();
      document.body.classList.remove('is-lifting');
    } else {
      // what actually has to arrive before the page is usable
      const jobs = [
        ...sheets.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) resolve();
              else {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
              }
            })
        ),
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
        new Promise((resolve) => {
          if (document.readyState === 'complete') resolve();
          else window.addEventListener('load', resolve, { once: true });
        }),
      ];

      let done = 0;
      for (const job of jobs) job.then(() => { done += 1; });

      const MIN = 1900;           // long enough to read as a lift, short enough not to annoy
      const start = performance.now();
      let shown = -1;
      let finished = false;

      const draw = (p) => {
        const pc = Math.round(p * 100);
        if (pc !== shown) {
          pct.textContent = String(pc);
          bar.style.width = `${pc}%`;
          shown = pc;
        }
        const phase = (p * 5) % 1;                        // one rep = 20% of the bar
        const index = Math.min(4, Math.max(1, Math.floor(phase * 4) + 1));
        if (frame.dataset.frame !== String(index)) {
          frame.dataset.frame = String(index);
          frame.src = sheets[index - 1].src;
        }
        const rep = Math.min(5, Math.floor(p * 5) + 1);
        if (repEl.textContent !== String(rep)) repEl.textContent = String(rep);
      };

      const finish = () => {
        if (finished) return;
        finished = true;
        draw(1);
        pct.textContent = '100';
        bar.style.width = '100%';
        frame.dataset.frame = '4';                        // hold the lockout before the fade
        frame.src = sheets[3].src;
        repEl.textContent = '5';
        lift.classList.add('lift--done');
        try {
          sessionStorage.setItem('lift-seen', '1');
        } catch {
          /* private mode, no matter */
        }
        window.setTimeout(() => {
          lift.remove();
          document.body.classList.remove('is-lifting');
        }, 300);
      };

      // smoothstep, so the bar eases in and out instead of climbing linearly
      const ease = (t) => t * t * (3 - 2 * t);

      const tick = () => {
        const elapsed = performance.now() - start;
        const real = done / jobs.length;                    // 0..1, from the actual assets
        // the bar rises on a smooth MIN-second ramp, but can never pass 92% while
        // anything is still in flight — slow assets show up as a stalled bar
        const ramp = ease(Math.min(1, elapsed / MIN));
        const p = Math.min(ramp, real >= 1 ? 1 : 0.92);

        draw(p);

        if (p >= 1) finish();
        else requestAnimationFrame(tick);
      };

      draw(0);
      requestAnimationFrame(tick);
      window.setTimeout(finish, 8000);        // never trap the page behind the lift
    }
  }


  /* ---------------- 1. mobile menu ---------------- */

  const menuToggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('nav-menu');

  if (menuToggle && menu) {
    const focusable = () => [...menu.querySelectorAll('a[href], button:not([disabled])')];

    const setOpen = (open) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      if (open) {
        const [first] = focusable();
        if (first) first.focus();
      }
    };

    menuToggle.addEventListener('click', () => setOpen(menu.hidden));

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (menu.hidden) return;

      if (event.key === 'Escape') {
        setOpen(false);
        menuToggle.focus();
        return;
      }

      // keep Tab inside the open menu instead of wandering into the page behind it
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    // a tap anywhere else puts the page back
    document.addEventListener('pointerdown', (event) => {
      if (menu.hidden) return;
      if (menu.contains(event.target) || menuToggle.contains(event.target)) return;
      setOpen(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 880 && !menu.hidden) setOpen(false);
    });
  }

  /* ---------------- 2. how far down the page you are ---------------- */

  const progress = document.getElementById('nav-progress');

  if (progress) {
    let queued = false;

    const paint = () => {
      queued = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.width = `${(ratio * 100).toFixed(2)}%`;
    };

    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    };

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    paint();
  }

  /* ---------------- 3. current section in the nav ---------------- */

  const sectionLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];

  if (sectionLinks.length && 'IntersectionObserver' in window) {
    const mark = (id) => {
      sectionLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !entry.target || !entry.target.id) continue;
          mark(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );

    for (const link of sectionLinks) {
      const section = document.querySelector(link.getAttribute('href'));
      if (section) spy.observe(section);
    }
  }

  /* ---------------- 4. copy email ---------------- */

  const copyButton = document.querySelector('[data-copy]');

  const copyStatus = document.getElementById('copy-status');

  if (copyButton && navigator.clipboard) {
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        copyButton.classList.add('is-done');
        if (copyStatus) copyStatus.textContent = `${copyButton.dataset.copy} copied to the clipboard`;
        window.setTimeout(() => {
          copyButton.classList.remove('is-done');
          if (copyStatus) copyStatus.textContent = '';
        }, 2400);
      } catch {
        if (copyStatus) copyStatus.textContent = 'Copying was blocked. Use the address above.';
      }
    });
  }
})();
