/* ============================================================
   Mochi — the ChimCode robot tutor.
   A 2D canvas robot with a head, torso, robotic arms and legs.
   States: idle, talking, happy, thinking, sad. Supports a
   browser speech-synthesis "bot voice".
   ============================================================ */
(function () {
  const PALETTES = {
    idle:     { shell: "#8b7bff", shellDark: "#5b45d6", glow: "#22d3ee", eye: "#22d3ee", accent: "#7c5cff" },
    talking:  { shell: "#9a8bff", shellDark: "#6a54e0", glow: "#5eead4", eye: "#a7f3d0", accent: "#22d3ee" },
    happy:    { shell: "#ffd166", shellDark: "#e0a92e", glow: "#fbbf24", eye: "#fff7d6", accent: "#fbbf24" },
    thinking: { shell: "#7cc4ff", shellDark: "#4a90d9", glow: "#a78bfa", eye: "#c4b5fd", accent: "#8b5cf6" },
    sad:      { shell: "#fb7185", shellDark: "#c74a5e", glow: "#fda4af", eye: "#ffe4e6", accent: "#fb7185" },
  };

  class Mochi {
    constructor(container, size) {
      this.container = container;
      this.size = size || 150;
      this.canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      this.w = this.size;
      this.h = this.size * 1.25;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.canvas.style.width = this.w + "px";
      this.canvas.style.height = this.h + "px";
      this.ctx = this.canvas.getContext("2d");
      this.ctx.scale(dpr, dpr);
      container.innerHTML = "";
      const glow = document.createElement("div");
      glow.className = "bot-glow";
      container.appendChild(glow);
      container.appendChild(this.canvas);

      this.state = "idle";
      this.t = 0;
      this.mouthOpen = 0;
      this.blink = 0;
      this.nextBlink = 60 + Math.random() * 120;
      this.raf = null;
      this.running = false;
      this.visible = true;
      this.loop = this.loop.bind(this);
      // Only animate while the canvas is actually on screen. Several Mochi
      // instances used to each run a 60fps loop forever, which caused lag.
      if (typeof IntersectionObserver !== "undefined") {
        this.observer = new IntersectionObserver((entries) => {
          this.visible = entries.some((e) => e.isIntersecting);
          this.start();
          this.stop();
          if (this.visible) this.start();
        }, { rootMargin: "60px" });
        this.observer.observe(container);
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.stop(); else if (this.visible) this.start();
      });
      this.start();
    }

    start() {
      if (this.running || !this.visible || (typeof document !== "undefined" && document.hidden)) return;
      this.running = true;
      this.raf = requestAnimationFrame(this.loop);
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    setState(state) {
      if (PALETTES[state]) this.state = state;
    }

    talk(ms) {
      this.setState("talking");
      this.talkUntil = performance.now() + (ms || 1800);
    }

    loop() {
      if (!this.running) return;
      this.t += 1;
      if (this.talkUntil && performance.now() > this.talkUntil) {
        this.talkUntil = null;
        this.setState("idle");
      }
      this.draw();
      this.raf = requestAnimationFrame(this.loop);
    }

    destroy() {
      this.stop();
      if (this.observer) this.observer.disconnect();
    }

    draw() {
      const ctx = this.ctx;
      const w = this.w, h = this.h;
      ctx.clearRect(0, 0, w, h);
      const p = PALETTES[this.state];
      const s = w / 150; // scale factor

      // floating bob
      const bob = Math.sin(this.t * 0.045) * 3 * s;
      const tilt = Math.sin(this.t * 0.03) * 0.03;

      // blink logic
      this.nextBlink -= 1;
      if (this.nextBlink <= 0) { this.blink = 8; this.nextBlink = 90 + Math.random() * 140; }
      if (this.blink > 0) this.blink -= 1;
      const eyeOpen = this.blink > 0 ? 0.12 : 1;

      // mouth while talking
      if (this.state === "talking") {
        this.mouthOpen = (Math.sin(this.t * 0.5) + 1) / 2;
      } else {
        this.mouthOpen *= 0.85;
      }

      ctx.save();
      ctx.translate(w / 2, h * 0.52 + bob);
      ctx.rotate(tilt);
      ctx.scale(s, s);

      // ---- legs (robotic pistons)
      this.leg(ctx, -14, 62, 1, p);
      this.leg(ctx, 14, 62, -1, p);

      // ---- arms (segmented robot arms)
      this.arm(ctx, -34, -4, -1, p);
      this.arm(ctx, 34, -4, 1, p);

      // ---- torso
      this.roundRect(ctx, -30, -6, 60, 68, 16);
      const bodyGrad = ctx.createLinearGradient(-30, -6, 30, 62);
      bodyGrad.addColorStop(0, p.shell);
      bodyGrad.addColorStop(1, p.shellDark);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // chest core
      ctx.beginPath();
      ctx.arc(0, 20, 11, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fill();
      ctx.beginPath();
      const pulse = 6 + Math.sin(this.t * 0.09) * 1.6;
      ctx.arc(0, 20, pulse, 0, Math.PI * 2);
      ctx.fillStyle = p.glow;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      // chest vents
      ctx.fillStyle = "rgba(0,0,0,.28)";
      for (let i = 0; i < 3; i++) this.roundRect(ctx, -16 + i * 11, 40, 7, 12, 2), ctx.fill();

      // ---- head
      ctx.save();
      ctx.translate(0, -34);
      // antenna
      ctx.strokeStyle = p.shellDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(0, -42);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -46, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.glow;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;

      // head shell
      this.roundRect(ctx, -34, -30, 68, 54, 18);
      const headGrad = ctx.createLinearGradient(0, -30, 0, 24);
      headGrad.addColorStop(0, p.shell);
      headGrad.addColorStop(1, p.shellDark);
      ctx.fillStyle = headGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // visor
      this.roundRect(ctx, -26, -18, 52, 30, 12);
      ctx.fillStyle = "#0a0a18";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // eyes
      const eyeY = -3;
      const eyeSpacing = 13;
      this.eye(ctx, -eyeSpacing, eyeY, eyeOpen, p);
      this.eye(ctx, eyeSpacing, eyeY, eyeOpen, p);

      // expression extras
      if (this.state === "happy") {
        ctx.fillStyle = p.eye;
        ctx.beginPath(); ctx.arc(-eyeSpacing, eyeY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeSpacing, eyeY, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (this.state === "sad") {
        ctx.strokeStyle = p.eye; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-eyeSpacing - 5, eyeY - 7); ctx.lineTo(-eyeSpacing + 5, eyeY - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(eyeSpacing + 5, eyeY - 7); ctx.lineTo(eyeSpacing - 5, eyeY - 4); ctx.stroke();
      }

      // mouth (small speaker grille / talking)
      const mh = 3 + this.mouthOpen * 7;
      this.roundRect(ctx, -11, 6, 22, mh, 4);
      ctx.fillStyle = p.eye;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      // ear bolts
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath(); ctx.arc(-34, -6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(34, -6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // ---- thought bubble for thinking
      if (this.state === "thinking") {
        ctx.fillStyle = "rgba(167,139,250,.9)";
        ctx.beginPath(); ctx.arc(38, -66, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(46, -78, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(58, -94, 10, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }

    eye(ctx, x, y, open, p) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 7 * open, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.eye;
      ctx.shadowColor = p.eye;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      // pupil tracking a slow sweep
      if (open > 0.5) {
        const px = x + Math.sin(this.t * 0.02) * 1.6;
        ctx.beginPath();
        ctx.arc(px, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#0a0a18";
        ctx.fill();
      }
      ctx.restore();
    }

    arm(ctx, x, y, dir, p) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(dir * (0.18 + Math.sin(this.t * 0.04) * 0.12));
      // upper arm
      this.roundRect(ctx, -6, 0, 12, 30, 6);
      ctx.fillStyle = p.shellDark; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1.5; ctx.stroke();
      // elbow joint
      ctx.beginPath(); ctx.arc(0, 32, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.glow; ctx.fill();
      // forearm
      ctx.save();
      ctx.translate(0, 32);
      ctx.rotate(dir * (-0.35 + Math.sin(this.t * 0.05) * 0.14));
      this.roundRect(ctx, -5, 0, 10, 26, 5);
      ctx.fillStyle = p.shell; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.stroke();
      // claw
      ctx.beginPath(); ctx.arc(0, 28, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.glow; ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    leg(ctx, x, y, dir, p) {
      ctx.save();
      ctx.translate(x, y);
      // thigh
      this.roundRect(ctx, -7, 0, 14, 26, 6);
      ctx.fillStyle = p.shellDark; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1.5; ctx.stroke();
      // knee
      ctx.beginPath(); ctx.arc(0, 27, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.glow; ctx.fill();
      // shin
      this.roundRect(ctx, -6, 27, 12, 24, 5);
      ctx.fillStyle = p.shell; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.stroke();
      // foot
      this.roundRect(ctx, -9, 49, 20, 9, 4);
      ctx.fillStyle = p.shellDark; ctx.fill();
      ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  // ------------------------------------------------------------ voice
  const voice = {
    enabled: true,
    speak(text, opts) {
      if (!this.enabled || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        u.pitch = 1.35;
        u.volume = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const pick = voices.find((v) => /google uk english male|daniel|alex|robot/i.test(v.name)) ||
          voices.find((v) => v.lang && v.lang.startsWith("en"));
        if (pick) u.voice = pick;
        window.speechSynthesis.speak(u);
        if (opts && opts.onEnd) u.onend = opts.onEnd;
      } catch (e) { /* voice is best-effort */ }
    },
    stop() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); },
  };

  if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = () => {};

  window.Mochi = Mochi;
  window.mochiVoice = voice;
})();
