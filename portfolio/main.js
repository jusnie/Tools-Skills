/* ============================================================
   Jusnie — portfolio scripts
   1. mobile menu   2. current section in the nav   3. copy email
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- 1. mobile menu ---------------- */

  const menuToggle = document.querySelector('.nav__toggle');
  const menu = document.getElementById('nav-menu');

  if (menuToggle && menu) {
    const setOpen = (open) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    };

    menuToggle.addEventListener('click', () => setOpen(menu.hidden));

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        menuToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 880 && !menu.hidden) setOpen(false);
    });
  }

  /* ---------------- 2. current section in the nav ---------------- */

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

  /* ---------------- 3. copy email ---------------- */

  const copyButton = document.querySelector('[data-copy]');

  if (copyButton && navigator.clipboard) {
    const original = copyButton.textContent;

    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        copyButton.textContent = 'Copied';
        window.setTimeout(() => {
          copyButton.textContent = original;
        }, 1600);
      } catch {
        window.location.href = `mailto:${copyButton.dataset.copy}`;
      }
    });
  }
})();
