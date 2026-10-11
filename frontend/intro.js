/* ============================================================
   ChimCode intro loader.
   A short cinematic boot sequence: a particle field, a rotating
   reactor core and a progress bar. It also reports whether the
   user already has a session, so the app can skip the login
   screen entirely and go straight to Learn.
   ============================================================ */
(function () {
  const INTRO_MIN_MS = 1500;

  class Particles {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.resize();
      this.parts = [];
      this.running = true;
    }
    resize() {
      const w = (this.w = window.innerWidth);
      const h = (this.h = window.innerHeight);
      this.canvas.width = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    seed() {
      const n = Math.min(90, Math.round((this.w * this.h) / 22000));
      this.parts = [];
      for (let i = 0; i < n; i++) {
        this.parts.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: 0.8 + Math.random() * 1.8,
          a: 0.25 + Math.random() * 0.5,
        });
      }
    }
    frame() {
      if (!this.running) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      const cx = this.w / 2, cy = this.h / 2;
      // Connect nearby particles to the core for a network feel.
      for (const p of this.parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = this.w; if (p.x > this.w) p.x = 0;
        if (p.y < 0) p.y = this.h; if (p.y > this.h) p.y = 0;
        const d = Math.hypot(p.x - cx, p.y - cy);
        const pull = Math.max(0, 1 - d / 420);
        ctx.strokeStyle = "rgba(124,92,255," + (pull * 0.22).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = "rgba(34,211,238," + p.a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(() => this.frame());
    }
    start() { this.seed(); this.frame(); }
    stop() { this.running = false; }
  }

  const Intro = {
    el: null,
    particles: null,
    t0: 0,
    lines: [
      "Booting tutor engine…",
      "Waking Mochi…",
      "Loading 707 achievements…",
      "Priming the code editor…",
      "Almost ready…",
    ],
    async run(opts) {
      opts = opts || {};
      this.el = document.getElementById("intro");
      if (!this.el) return;
      this.t0 = performance.now();
      const canvas = document.getElementById("intro-canvas");
      const bar = document.getElementById("intro-bar-fill");
      const status = document.getElementById("intro-status");
      if (canvas) { this.particles = new Particles(canvas); this.particles.start(); }

      let pct = 0;
      let line = 0;
      const timer = setInterval(() => {
        // Ease toward 90% while the real work happens, then finish.
        pct = Math.min(90, pct + Math.random() * 16 + 4);
        if (bar) bar.style.width = pct + "%";
        if (status && Math.random() > 0.55) {
          line = Math.min(this.lines.length - 1, line + 1);
          status.textContent = this.lines[line];
        }
      }, 260);

      try { await opts.work(); } catch (e) { /* intro must never block the app */ }

      clearInterval(timer);
      if (bar) bar.style.width = "100%";
      await this.wait(Math.max(0, INTRO_MIN_MS - (performance.now() - this.t0)));
      if (opts.destination) opts.destination();
      await this.wait(180);
      this.hide();
    },
    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
    hide() {
      if (!this.el) return;
      this.el.classList.add("leaving");
      setTimeout(() => {
        if (this.particles) this.particles.stop();
        this.el.classList.add("hidden");
      }, 650);
    },
  };

  window.ChimIntro = Intro;
})();
