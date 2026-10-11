/* ============================================================
   Watch Mochi teach.

   A small animated scene: Mochi walks across the room to a floating
   question screen, raises a holographic keyboard, and types the code
   out line by line while the explanation appears in plain English.
   ============================================================ */
(function () {
  const W = 640, H = 300;

  class Coach {
    constructor(canvas, onLine) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.onLine = onLine || (() => {});
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.t = 0;
      this.x = 70;            // walking position
      this.targetX = 300;
      this.phase = "walk";
      this.lineIndex = -1;
      this.tick = 0;
      this.running = true;
      this.frame = this.frame.bind(this);
      this.raf = requestAnimationFrame(this.frame);
    }

    setLines(lines) { this.lines = lines; }
    stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); }

    frame() {
      if (!this.running) return;
      this.t += 1;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);

      // room
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b0b1a"); g.addColorStop(1, "#141433");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(124,92,255,.18)"; ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,255,255,.04)";
      ctx.fillRect(0, H - 46, W, 46);

      // question screen on the wall
      const qx = 400, qy = 70, qw = 200, qh = 120;
      ctx.save();
      ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 22;
      ctx.fillStyle = "rgba(10,12,26,.95)";
      roundRect(ctx, qx, qy, qw, qh, 12); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(34,211,238,.6)"; ctx.lineWidth = 2;
      roundRect(ctx, qx, qy, qw, qh, 12); ctx.stroke();
      ctx.fillStyle = "#9aa0c3"; ctx.font = "11px monospace";
      ctx.fillText("TASK", qx + 14, qy + 22);
      const first = (this.lines && this.lines[0] && this.lines[0].code) || "print(...)";
      ctx.fillStyle = "#dbe2ff"; ctx.font = "12px monospace";
      ctx.fillText(first.slice(0, 26), qx + 14, qy + 44);
      if (this.lines && this.lines[0]) {
        const note = this.lines[0].note || "";
        ctx.fillStyle = "#7ee2b8"; ctx.font = "10px monospace";
        wrap(ctx, note, qx + 14, qy + 66, qw - 28, 13, 4);
      }

      // movement
      const speed = 1.6;
      if (this.phase === "walk") {
        this.x += speed;
        if (this.x >= this.targetX) { this.x = this.targetX; this.phase = "type"; }
      }

      // holographic keyboard
      if (this.phase === "type" || this.phase === "done") {
        const kx = this.x + 40, ky = H - 96;
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = "rgba(34,211,238,.55)";
        ctx.fillStyle = "rgba(34,211,238,.07)";
        ctx.lineWidth = 1;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 9; c++) {
            const keyX = kx + c * 20, keyY = ky + r * 16;
            const lit = (this.tick % 5 === ((r + c) % 5)) && this.tick % 14 < 6;
            ctx.globalAlpha = lit ? 0.95 : 0.45;
            roundRect(ctx, keyX, keyY, 16, 12, 3); ctx.fill(); ctx.stroke();
          }
        }
        ctx.restore();
        // typing beam from Mochi's hands to the keyboard
        ctx.strokeStyle = "rgba(138,244,255,.5)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.x + 10, H - 92); ctx.lineTo(kx + 80, ky - 4); ctx.stroke();
      }

      this.drawMochi(ctx, this.x, H - 46, 0.62, this.phase);

      // progress through the lines while typing
      if (this.phase === "type") {
        this.tick += 1;
        const per = 55;
        const idx = Math.floor(this.tick / per);
        if (idx !== this.lineIndex) {
          this.lineIndex = idx;
          if (this.lines && idx < this.lines.length) this.onLine(this.lines[idx], idx);
          if (this.lines && idx >= this.lines.length) this.phase = "done";
        }
      }
      this.raf = requestAnimationFrame(this.frame);
    }

    drawMochi(ctx, x, y, s, phase) {
      const bob = Math.sin(this.t * 0.08) * 2;
      const leg = phase === "walk" ? Math.sin(this.t * 0.25) * 0.4 : 0;
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.scale(s, s);
      // legs
      [-12, 12].forEach((lx, i) => {
        ctx.save(); ctx.translate(lx, -20); ctx.rotate(leg * (i ? 1 : -1));
        ctx.fillStyle = "#5b45d6"; roundRect(ctx, -5, 0, 10, 18, 4); ctx.fill();
        ctx.fillStyle = "#8b7bff"; roundRect(ctx, -4, 18, 8, 16, 3); ctx.fill();
        ctx.restore();
      });
      // torso
      ctx.fillStyle = "#8b7bff"; roundRect(ctx, -20, -62, 40, 44, 10); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -40, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      // arms
      [-24, 24].forEach((ax, i) => {
        ctx.save(); ctx.translate(ax, -58);
        ctx.rotate((i ? 1 : -1) * (phase === "type" ? 0.7 + Math.sin(this.t * 0.4) * 0.2 : 0.2));
        ctx.fillStyle = "#5b45d6"; roundRect(ctx, -4, 0, 8, 16, 3); ctx.fill();
        ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(0, 18, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      // head
      ctx.fillStyle = "#9a8bff"; roundRect(ctx, -22, -92, 44, 34, 12); ctx.fill();
      ctx.fillStyle = "#0a0a18"; roundRect(ctx, -17, -84, 34, 20, 8); ctx.fill();
      ctx.fillStyle = "#22d3ee"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10;
      [-8, 8].forEach((ex) => { roundRect(ctx, ex - 4, -79, 8, 10, 4); ctx.fill(); });
      ctx.shadowBlur = 0;
      ctx.restore();
    }
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
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const words = String(text).split(" ");
    let line = "", n = 0;
    words.forEach((w) => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        if (n < maxLines) ctx.fillText(line, x, y + n * lh);
        line = w; n += 1;
      } else line = test;
    });
    if (n < maxLines) ctx.fillText(line, x, y + n * lh);
  }

  window.ChimCoach = { Coach };
})();
