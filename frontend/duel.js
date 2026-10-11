/* ============================================================
   The Super Day duel.

   A detailed, hand-animated anime-style fight between the upgraded
   "Super Mochi" and the old Mochi, drawn entirely on canvas: sword
   clashes, missile barrages, a beam struggle, speed lines, impact
   flashes and a finisher. It runs for a few seconds and then resolves.
   ============================================================ */
(function () {
  const FRAME_MS = 1000 / 60;

  // Timeline. Each entry is either a slash, a missile or a beam, so the fight
  // reads as a real back-and-forth rather than a single loop.
  const SCRIPT = [
    { t: 0.0, kind: "intro" },
    { t: 0.7, kind: "dash", who: "super" },
    { t: 1.4, kind: "clash" },
    { t: 2.3, kind: "slash", who: "old" },
    { t: 3.0, kind: "slash", who: "super" },
    { t: 3.7, kind: "missiles" },
    { t: 4.9, kind: "clash" },
    { t: 5.7, kind: "beam" },
    { t: 8.2, kind: "finisher" },
    { t: 9.6, kind: "victory" },
  ];
  const DURATION = 10.6;

  function drawRobot(ctx, x, y, s, opts) {
    opts = opts || {};
    const body = opts.body || "#8b7bff";
    const dark = opts.dark || "#5b45d6";
    const glow = opts.glow || "#22d3ee";
    const tilt = opts.tilt || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(s, s);

    // legs
    [-14, 14].forEach((lx) => {
      ctx.fillStyle = dark;
      roundRect(ctx, lx - 7, 62, 14, 26, 6); ctx.fill();
      ctx.fillStyle = glow;
      circle(ctx, lx, 89, 6); ctx.fill();
      ctx.fillStyle = body;
      roundRect(ctx, lx - 6, 89, 12, 24, 5); ctx.fill();
      ctx.fillStyle = dark;
      roundRect(ctx, lx - 9, 111, 20, 9, 4); ctx.fill();
    });

    // torso
    const g = ctx.createLinearGradient(0, -6, 0, 62);
    g.addColorStop(0, body); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    roundRect(ctx, -30, -6, 60, 68, 16); ctx.fill();
    // core
    circle(ctx, 0, 20, 12); ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fill();
    circle(ctx, 0, 20, 7); ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;

    // arms (with blade if held)
    [-34, 34].forEach((ax, i) => {
      const dir = i === 0 ? -1 : 1;
      ctx.save();
      ctx.translate(ax, -4);
      ctx.rotate(dir * (0.3 + (opts.armSwing || 0)));
      ctx.fillStyle = dark;
      roundRect(ctx, -6, 0, 12, 30, 6); ctx.fill();
      circle(ctx, 0, 32, 6); ctx.fillStyle = glow; ctx.fill();
      ctx.fillStyle = body;
      roundRect(ctx, -5, 32, 10, 26, 5); ctx.fill();
      circle(ctx, 0, 60, 5); ctx.fillStyle = glow; ctx.fill();
      if (opts.blade && i === 1) {
        ctx.strokeStyle = "#e8ecff"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.shadowColor = "#8af4ff"; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(70, 20); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    });

    // head
    ctx.save();
    ctx.translate(0, -34);
    ctx.strokeStyle = dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -44); ctx.stroke();
    circle(ctx, 0, -48, 5); ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
    const hg = ctx.createLinearGradient(0, -30, 0, 24);
    hg.addColorStop(0, body); hg.addColorStop(1, dark);
    ctx.fillStyle = hg;
    roundRect(ctx, -34, -30, 68, 54, 18); ctx.fill();
    ctx.fillStyle = "#0a0a18";
    roundRect(ctx, -26, -18, 52, 30, 12); ctx.fill();
    ctx.fillStyle = glow;
    ctx.shadowColor = glow; ctx.shadowBlur = 12;
    [-13, 13].forEach((ex) => { roundRect(ctx, ex - 6, -8, 12, 16, 6); ctx.fill(); });
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.restore();
  }

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  class Duel {
    constructor(onDone) {
      this.onDone = onDone || (() => {});
      this.el = document.createElement("div");
      this.el.className = "duel";
      this.canvas = document.createElement("canvas");
      this.veil = document.createElement("div");
      this.veil.className = "duel-veil";
      this.flash = document.createElement("div");
      this.flash.className = "duel-flash";
      this.banner = document.createElement("div");
      this.banner.className = "duel-banner";
      this.banner.textContent = "SUPER DAY";
      const hud = document.createElement("div");
      hud.className = "duel-hud";
      hud.innerHTML =
        '<div class="duel-title">SUPER DAY</div>' +
        '<div class="duel-sub">Super Mochi defeats the old Mochi. Hard mode unlocked.</div>';
      this.skip = document.createElement("button");
      this.skip.className = "btn btn-ghost duel-skip";
      this.skip.textContent = "Skip";
      this.skip.addEventListener("click", () => this.finish());
      hud.appendChild(this.skip);
      this.el.append(this.canvas, this.veil, this.flash, this.banner, hud);
      document.body.appendChild(this.el);
      this.ctx = this.canvas.getContext("2d");
      this.t = 0;
      this.flags = {};
      this.shake = 0;
      this.resize();
      this._onResize = () => this.resize();
      window.addEventListener("resize", this._onResize);
      this.raf = requestAnimationFrame(() => this.frame());
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.dpr = dpr;
    }

    boom() {
      this.shake = 1;
      this.flash.classList.remove("on");
      void this.flash.offsetWidth;
      this.flash.classList.add("on");
    }

    frame() {
      this.t += FRAME_MS / 1000;
      const t = this.t;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      const cx = this.w / 2, cy = this.h * 0.56;
      const scale = Math.min(this.w, this.h) / 620;

      // fire scripted beats
      SCRIPT.forEach((beat) => {
        const key = beat.t;
        if (!this.flags[key] && t >= beat.t) {
          this.flags[key] = true;
          this.play(beat, cx, cy);
        }
      });

      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - 0.08);
        const m = this.shake * 10;
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
      }

      // speed lines
      const intensity = this.lineIntensity || 0;
      if (intensity > 0.01) {
        ctx.strokeStyle = "rgba(255,255,255,.10)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * Math.PI * 2 + t;
          const r1 = 160 * scale, r2 = r1 + 260 * intensity * scale;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
          ctx.stroke();
        }
      }

      const lunge = this.lunge || 0;
      drawRobot(ctx, cx - 130 * scale + lunge * scale, cy, scale * 1.05,
        { body: "#8b7bff", dark: "#5b45d6", glow: "#22d3ee", blade: true, tilt: -0.05 + this.swing * 0.3, armSwing: -this.swing * 0.5, name: "super" });
      drawRobot(ctx, cx + 130 * scale - lunge * scale, cy, scale * 1.05,
        { body: "#7a6a9e", dark: "#4a3f66", glow: "#c084fc", blade: true, tilt: 0.05 - this.swing * 0.3, armSwing: this.swing * 0.5, name: "old" });

      // projectile layer
      (this.projectiles || []).forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.type === "missile") {
          ctx.rotate(p.angle);
          ctx.fillStyle = "#fbbf24";
          ctx.shadowColor = "#f97316"; ctx.shadowBlur = 16;
          roundRect(ctx, -14, -4, 28, 8, 4); ctx.fill();
          ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(24, 0); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.restore();
        if (p.trail) {
          ctx.strokeStyle = p.type === "beam" ? "rgba(250,204,21,.7)" : "rgba(249,115,22,.5)";
          ctx.lineWidth = p.type === "beam" ? 18 : 6;
          ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); ctx.stroke();
        }
      });

      // clash sparks
      if (this.sparks) {
        this.sparks.forEach((s) => {
          ctx.fillStyle = "rgba(255,240,180," + s.life.toFixed(2) + ")";
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
      }

      this.update(dt());
      if (t >= DURATION) { this.finish(); return; }
      this.raf = requestAnimationFrame(() => this.frame());
    }

    play(beat, cx, cy) {
      if (beat.kind === "dash") { this.timeout(() => { this.lunge = 40; this.lineIntensity = 1; }, 0); }
      if (beat.kind === "clash") { this.swing = 1; this.boom(); this.sparkBurst(cx, cy - 30); this.lineIntensity = 1; }
      if (beat.kind === "slash") { this.swing = 1; this.boom(); this.sparkBurst(cx + (beat.who === "super" ? -40 : 40), cy - 20); }
      if (beat.kind === "missiles") {
        for (let i = 0; i < 7; i++) {
          this.timeout(() => this.spawnMissile(cx), i * 110);
        }
      }
      if (beat.kind === "beam") {
        this.beam = { t: 0 };
        this.lineIntensity = 1;
        this.timeout(() => this.boom(), 380);
      }
      if (beat.kind === "finisher") { this.finisher = 1; this.boom(); this.sparkBurst(cx, cy, 60); }
      if (beat.kind === "victory") { this.victory = 1; this.lineIntensity = 0; }
    }

    spawnMissile(cx) {
      this.projectiles = this.projectiles || [];
      this.projectiles.push({
        type: "missile", x: cx + 150, y: 60 + Math.random() * 140,
        vx: -7 - Math.random() * 3, vy: 1.6, angle: Math.PI + 0.2, trail: true,
      });
      this.boom();
    }

    sparkBurst(x, y, n) {
      this.sparks = this.sparks || [];
      const count = n || 22;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 6;
        this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1 + Math.random() * 3, life: 1 });
      }
    }

    update() {
      this.lunge = (this.lunge || 0) * 0.9;
      this.swing = (this.swing || 0) * 0.85;
      this.lineIntensity = (this.lineIntensity || 0) * 0.94;
      if (this.beam) {
        this.beam.t += 0.016;
        if (this.beam.t > 1.6) this.beam = null;
      }
      (this.projectiles || []).forEach((p) => { p.x += p.vx; p.y += p.vy; p.angle = Math.atan2(p.vy, p.vx); });
      this.projectiles = (this.projectiles || []).filter((p) => p.x > -80);
      (this.sparks || []).forEach((s) => { s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life -= 0.03; });
      this.sparks = (this.sparks || []).filter((s) => s.life > 0);
    }

    timeout(fn, ms) { setTimeout(() => { if (this.alive !== false) fn(); }, ms); }

    finish() {
      if (this.alive === false) return;
      this.alive = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener("resize", this._onResize);
      this.el.style.transition = "opacity .5s ease";
      this.el.style.opacity = "0";
      setTimeout(() => { this.el.remove(); this.onDone(); }, 520);
    }
  }

  let last = performance.now();
  function dt() { const now = performance.now(); const d = (now - last) / 1000; last = now; return d; }

  window.ChimDuel = {
    play(onDone) { return new Duel(onDone); },
  };
})();
