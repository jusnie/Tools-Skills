/* ============================================================
   Jusnie — portfolio scripts
   1. mobile menu   2. copy email   3. Paddle, the cabinet game
   ============================================================ */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

  /* ---------------- 2. copy email ---------------- */

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

  /* ---------------- 3. Paddle ---------------- */

  const canvas = document.getElementById('game');

  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const W = canvas.width;
  const H = canvas.height;

  const C = {
    screen: '#f7f2e7',
    dot: '#e5dac5',
    ink: '#16181f',
    ink2: '#31353f',
    cream: '#fbf8f0',
    ember: '#c2532a',
    rows: ['#c2532a', '#d9a227', '#4c7d5a', '#616a77'],
    rowTop: ['#d9713f', '#e7bd55', '#6e9a62', '#8b95a1'],
  };

  const PADDLE = { w: 26, h: 5, y: H - 12, speed: 150 };
  const BALL = 3;
  const BRICK = { cols: 8, rows: 4, w: 20, h: 7, gapX: 2, gapY: 3, top: 16 };
  BRICK.left = Math.round((W - (BRICK.cols * BRICK.w + (BRICK.cols - 1) * BRICK.gapX)) / 2);

  const overlay = document.querySelector('[data-overlay]');
  const overlayKicker = overlay?.querySelector('.overlay__kicker');
  const overlayTitle = overlay?.querySelector('.overlay__title');
  const playButton = document.querySelector('[data-play]');
  const pauseButton = document.querySelector('[data-pause]');
  const scoreEl = document.querySelector('[data-score]');
  const livesEl = document.querySelector('[data-lives]');
  const statusEl = document.querySelector('[data-status]');
  const cabinet = document.getElementById('cabinet');
  const heroStart = document.querySelector('[data-start]');

  const state = {
    phase: 'idle',
    paddleX: (W - PADDLE.w) / 2,
    pointerTarget: null,
    left: false,
    right: false,
    ball: { x: W / 2, y: PADDLE.y - BALL, dx: 0, dy: 0, speed: 82 },
    bricks: [],
    particles: [],
    score: 0,
    best: 0,
    lives: 3,
    wave: 1,
    shake: 0,
    last: 0,
    inView: true,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const rnd = (min, max) => min + Math.random() * (max - min);

  function announce(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function paintHud() {
    if (scoreEl) scoreEl.textContent = String(state.score).padStart(4, '0');
    if (livesEl) livesEl.textContent = String(state.lives);
  }

  function buildBricks() {
    const bricks = [];
    for (let row = 0; row < BRICK.rows; row += 1) {
      for (let col = 0; col < BRICK.cols; col += 1) {
        bricks.push({
          x: BRICK.left + col * (BRICK.w + BRICK.gapX),
          y: BRICK.top + row * (BRICK.h + BRICK.gapY),
          row,
          alive: true,
        });
      }
    }
    state.bricks = bricks;
  }

  function restBall() {
    const ball = state.ball;
    ball.dx = 0;
    ball.dy = 0;
    ball.speed = Math.min(82 + (state.wave - 1) * 9, 132);
    ball.x = Math.round(state.paddleX + PADDLE.w / 2 - BALL / 2);
    ball.y = PADDLE.y - BALL;
  }

  function showOverlay(kicker, title, action) {
    if (!overlay) return;
    if (overlayKicker) overlayKicker.textContent = kicker;
    if (overlayTitle) overlayTitle.textContent = title;
    if (playButton) playButton.textContent = action;
    overlay.hidden = false;
  }

  function hideOverlay() {
    if (overlay) overlay.hidden = true;
    if (pauseButton) pauseButton.hidden = false;
  }

  function setPhase(phase) {
    state.phase = phase;
    if (pauseButton) {
      pauseButton.hidden = phase === 'idle' || phase === 'over';
      pauseButton.textContent = phase === 'paused' ? 'Resume' : 'Pause';
    }
    draw();
  }

  function start() {
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.paddleX = (W - PADDLE.w) / 2;
    state.particles = [];
    state.shake = 0;
    buildBricks();
    restBall();
    paintHud();
    hideOverlay();
    setPhase('serve');
    announce('Playing. Three lives. Arrow keys move the paddle, space serves.');
    if (canvas && canvas.focus) canvas.focus({ preventScroll: true });
  }

  function serve() {
    if (state.phase !== 'serve') return;
    const ball = state.ball;
    const angle = rnd(-0.55, 0.55);
    ball.dx = Math.sin(angle) * ball.speed;
    ball.dy = -Math.cos(angle) * ball.speed;
    setPhase('play');
    state.last = 0;
    requestAnimationFrame(loop);
  }

  function pause() {
    if (state.phase !== 'play') return;
    setPhase('paused');
    announce('Paused.');
  }

  function resume() {
    if (state.phase !== 'paused') return;
    setPhase('play');
    state.last = 0;
    announce('Playing.');
    requestAnimationFrame(loop);
  }

  function loseLife() {
    state.lives -= 1;
    state.shake = reduceMotion.matches ? 0 : 2;
    paintHud();
    if (state.lives <= 0) {
      state.best = Math.max(state.best, state.score);
      setPhase('over');
      showOverlay(`Score ${String(state.score).padStart(4, '0')} · best ${String(state.best).padStart(4, '0')}`, 'Game over', 'Play again');
      announce(`Game over. Score ${state.score}. Press play again to restart.`);
      return;
    }
    restBall();
    setPhase('serve');
    announce(`Life lost. ${state.lives} left. Space to serve.`);
  }

  function clearWave() {
    state.wave += 1;
    state.score += 50;
    buildBricks();
    restBall();
    paintHud();
    setPhase('serve');
    announce(`Wave cleared. Wave ${state.wave}. Space to serve.`);
  }

  function burst(x, y, colour) {
    if (reduceMotion.matches) return;
    for (let i = 0; i < 5; i += 1) {
      state.particles.push({
        x,
        y,
        dx: rnd(-28, 28),
        dy: rnd(-30, -6),
        life: 0,
        ttl: rnd(0.22, 0.42),
        colour,
      });
    }
  }

  function hitBrick(index) {
    const brick = state.bricks[index];
    brick.alive = false;
    state.score += 10;
    state.ball.speed = Math.min(state.ball.speed * 1.015 + 0.4, 190);
    paintHud();
    burst(brick.x + BRICK.w / 2, brick.y + BRICK.h / 2, C.rows[brick.row]);
  }

  function step(dt) {
    const ball = state.ball;

    if (state.left) state.paddleX -= PADDLE.speed * dt;
    if (state.right) state.paddleX += PADDLE.speed * dt;
    if (state.pointerTarget !== null) {
      state.paddleX += (state.pointerTarget - state.paddleX) * Math.min(1, dt * 18);
    }
    state.paddleX = clamp(Math.round(state.paddleX), 0, W - PADDLE.w);

    if (state.phase === 'serve') {
      ball.x = Math.round(state.paddleX + PADDLE.w / 2 - BALL / 2);
      ball.y = PADDLE.y - BALL;
    }

    if (state.phase !== 'play') return;

    const distance = Math.hypot(ball.dx, ball.dy) * dt;
    const steps = Math.max(1, Math.ceil(distance / 2));

    for (let s = 0; s < steps; s += 1) {
      const beforeX = ball.x;

      ball.x += (ball.dx * dt) / steps;
      ball.y += (ball.dy * dt) / steps;

      if (ball.x < 0) {
        ball.x = 0;
        ball.dx = Math.abs(ball.dx);
      } else if (ball.x + BALL > W) {
        ball.x = W - BALL;
        ball.dx = -Math.abs(ball.dx);
      }

      if (ball.y < 0) {
        ball.y = 0;
        ball.dy = Math.abs(ball.dy);
      }

      // paddle
      if (
        ball.dy > 0 &&
        ball.y + BALL >= PADDLE.y &&
        ball.y < PADDLE.y + PADDLE.h &&
        ball.x + BALL >= state.paddleX &&
        ball.x <= state.paddleX + PADDLE.w
      ) {
        ball.y = PADDLE.y - BALL;
        const offset = (ball.x + BALL / 2 - (state.paddleX + PADDLE.w / 2)) / (PADDLE.w / 2);
        const angle = clamp(offset, -1, 1) * 1.02;
        ball.dx = Math.sin(angle) * ball.speed;
        ball.dy = -Math.cos(angle) * ball.speed;
      }

      // bricks
      for (let i = 0; i < state.bricks.length; i += 1) {
        const brick = state.bricks[i];
        if (!brick.alive) continue;
        if (
          ball.x + BALL > brick.x &&
          ball.x < brick.x + BRICK.w &&
          ball.y + BALL > brick.y &&
          ball.y < brick.y + BRICK.h
        ) {
          const cameFromSide = beforeX + BALL <= brick.x || beforeX >= brick.x + BRICK.w;
          if (cameFromSide) ball.dx = -ball.dx;
          else ball.dy = -ball.dy;
          hitBrick(i);
          break;
        }
      }

      if (ball.y > H) {
        loseLife();
        return;
      }

    }

    if (state.bricks.every((brick) => !brick.alive)) clearWave();
  }

  function draw() {
    ctx.save();

    if (state.shake > 0) {
      ctx.translate(Math.round(rnd(-1, 1)), Math.round(rnd(-1, 1)));
    }

    ctx.fillStyle = C.screen;
    ctx.fillRect(-4, -4, W + 8, H + 8);

    // dotted playfield
    ctx.fillStyle = C.dot;
    for (let y = 8; y < H - 20; y += 8) {
      for (let x = 8; x < W - 8; x += 8) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // bricks
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = C.rows[brick.row];
      ctx.fillRect(brick.x, brick.y, BRICK.w, BRICK.h);
      ctx.fillStyle = C.rowTop[brick.row];
      ctx.fillRect(brick.x, brick.y, BRICK.w, 1);
    }

    // particles
    for (const p of state.particles) {
      ctx.fillStyle = p.colour;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }

    // paddle
    ctx.fillStyle = C.ink;
    ctx.fillRect(state.paddleX, PADDLE.y, PADDLE.w, PADDLE.h);
    ctx.fillStyle = C.cream;
    ctx.fillRect(state.paddleX + 1, PADDLE.y, PADDLE.w - 2, 1);

    // ball
    ctx.fillStyle = C.ink;
    ctx.fillRect(Math.round(state.ball.x), Math.round(state.ball.y), BALL, BALL);

    if (state.phase === 'over') {
      ctx.fillStyle = 'rgba(247, 242, 231, 0.72)';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function loop(time) {
    if (state.phase !== 'play') return;

    if (!state.last) state.last = time;
    const dt = Math.min((time - state.last) / 1000, 0.05);
    state.last = time;

    if (state.particles.length) {
      for (const p of state.particles) {
        p.life += dt;
        p.dy += 120 * dt;
        p.x += p.dx * dt;
        p.y += p.dy * dt;
      }
      state.particles = state.particles.filter((p) => p.life < p.ttl);
    }

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 12);

    step(dt);
    draw();

    if (state.phase === 'play') requestAnimationFrame(loop);
  }

  /* ---- input ---- */

  const keys = new Set(['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D', ' ', 'Space', 'p', 'P']);

  document.addEventListener('keydown', (event) => {
    if (!state.inView) return;
    if (state.phase === 'idle' || state.phase === 'over') return;
    if (!keys.has(event.key)) return;

    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      state.left = true;
      state.pointerTarget = null;
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      state.right = true;
      state.pointerTarget = null;
      event.preventDefault();
    } else if (event.key === ' ' || event.key === 'Space') {
      if (state.phase === 'serve') serve();
      event.preventDefault();
    } else if (event.key === 'p' || event.key === 'P') {
      if (state.phase === 'play') pause();
      else if (state.phase === 'paused') resume();
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') state.left = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') state.right = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    if (state.phase === 'idle' || state.phase === 'over') return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    state.pointerTarget = clamp(Math.round(x - PADDLE.w / 2), 0, W - PADDLE.w);
    state.paddleX = state.pointerTarget;
    if (state.phase === 'serve') {
      state.ball.x = Math.round(state.paddleX + PADDLE.w / 2 - BALL / 2);
    }
    draw();
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (state.phase === 'serve') {
      serve();
    } else if (state.phase === 'play') {
      const rect = canvas.getBoundingClientRect();
      state.pointerTarget = clamp(
        Math.round(((event.clientX - rect.left) / rect.width) * W - PADDLE.w / 2),
        0,
        W - PADDLE.w
      );
    }
  });

  canvas.addEventListener('pointerleave', () => {
    state.pointerTarget = null;
  });

  playButton?.addEventListener('click', start);

  heroStart?.addEventListener('click', () => {
    cabinet?.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    start();
  });

  pauseButton?.addEventListener('click', () => {
    if (state.phase === 'play') pause();
    else resume();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'play') pause();
  });

  if ('IntersectionObserver' in window && cabinet) {
    new IntersectionObserver(
      (entries) => {
        state.inView = entries[0].isIntersecting;
        if (!state.inView && state.phase === 'play') pause();
      },
      { threshold: 0.35 }
    ).observe(cabinet);
  }

  /* ---- boot ---- */

  buildBricks();
  restBall();
  paintHud();
  draw();
})();
