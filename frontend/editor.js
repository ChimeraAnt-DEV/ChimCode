/* ============================================================
   ChimCode editor.
   A code area with line numbers, live syntax analysis via the
   server engine, a hovering bot bubble over the first mistake,
   and transparent "ghost" text showing what to type next.
   ============================================================ */
(function () {
  const LINE_HEIGHT = 23.1; // matches .code-area line-height (13.5px * 1.7)
  const PAD_TOP = 14;

  class CodeEditor {
    constructor(container, opts) {
      this.opts = opts || {};
      this.language = this.opts.language || "python";
      this.container = container;
      this.issues = [];
      this.ghost = null;
      this.bot = null;
      this.build();
      if (this.opts.starter) this.setValue(this.opts.starter);
    }

    build() {
      this.container.innerHTML = "";
      const wrap = el("div", "editor-wrap");
      const head = el("div", "editor-head");
      const dots = el("div", "dots");
      dots.innerHTML = "<i></i><i></i><i></i>";
      const fname = el("div", "file-name");
      fname.textContent = this.opts.fileName || ("main." + extFor(this.language));
      head.appendChild(dots);
      head.appendChild(fname);
      wrap.appendChild(head);

      const body = el("div", "editor-body");
      this.nums = el("div", "line-nums");
      this.nums.textContent = "1";
      body.appendChild(this.nums);

      const areaWrap = el("div", "code-area-wrap");
      this.area = document.createElement("textarea");
      this.area.className = "code-area";
      this.area.spellcheck = false;
      this.area.setAttribute("aria-label", "Code editor");
      this.area.addEventListener("input", () => this.onInput());
      this.area.addEventListener("scroll", () => this.reposition());
      this.area.addEventListener("keydown", (e) => this.onKey(e));
      areaWrap.appendChild(this.area);

      // overlays
      this.markerLayer = el("div", "marker-layer");
      this.markerLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;";
      areaWrap.appendChild(this.markerLayer);

      this.ghostEl = el("div", "code-ghost hidden");
      areaWrap.appendChild(this.ghostEl);

      this.botEl = el("div", "bot-overlay hidden");
      this.botEl.innerHTML = '<div class="bubble"></div><div class="tail"></div>';
      areaWrap.appendChild(this.botEl);

      body.appendChild(areaWrap);
      wrap.appendChild(body);
      this.container.appendChild(wrap);

      this.hintBar = el("div", "ghost-hint-bar hidden");
      this.container.appendChild(this.hintBar);

      this.onInput();
    }

    onKey(e) {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.area.selectionStart;
        const end = this.area.selectionEnd;
        const v = this.area.value;
        this.area.value = v.slice(0, start) + "    " + v.slice(end);
        this.area.selectionStart = this.area.selectionEnd = start + 4;
        this.onInput();
      }
      if (e.key === "Enter") {
        const v = this.area.value;
        const start = this.area.selectionStart;
        const lineStart = v.lastIndexOf("\n", start - 1) + 1;
        const line = v.slice(lineStart, start);
        const indent = (line.match(/^\s*/) || [""])[0];
        const extra = /[:{(]\s*$/.test(line.trim()) ? "    " : "";
        if (indent || extra) {
          e.preventDefault();
          this.area.value = v.slice(0, start) + "\n" + indent + extra + v.slice(this.area.selectionEnd);
          this.area.selectionStart = this.area.selectionEnd = start + 1 + indent.length + extra.length;
          this.onInput();
        }
      }
    }

    getValue() { return this.area.value; }

    setValue(v) {
      this.area.value = v || "";
      this.onInput();
    }

    onInput() {
      this.updateLineNumbers();
      if (this.opts.onChange) this.opts.onChange(this.getValue());
    }

    updateLineNumbers() {
      const lines = this.getValue().split("\n").length;
      let out = "";
      for (let i = 1; i <= lines; i++) out += i + "\n";
      this.nums.textContent = out;
      this.nums.style.height = Math.max(this.area.scrollHeight, 260) + "px";
    }

    setIssues(issues) {
      this.issues = issues || [];
      this.renderMarkers();
    }

    renderMarkers() {
      this.markerLayer.innerHTML = "";
      const errs = this.issues.filter((i) => i.severity === "error");
      for (const issue of errs) {
        const line = issue.line || 1;
        const top = PAD_TOP + (line - 1) * LINE_HEIGHT - this.area.scrollTop;
        const marker = el("div", "error-marker");
        marker.style.top = top + LINE_HEIGHT - 3 + "px";
        this.markerLayer.appendChild(marker);
      }
      this.showBotOverlay();
    }

    showBotOverlay() {
      const errs = this.issues.filter((i) => i.severity === "error");
      if (!errs.length) { this.botEl.classList.add("hidden"); return; }
      const issue = errs[0];
      const line = issue.line || 1;
      const top = PAD_TOP + (line - 1) * LINE_HEIGHT - this.area.scrollTop;
      const bubble = this.botEl.querySelector(".bubble");
      bubble.innerHTML =
        escapeHtml(issue.message) +
        (issue.expected ? '<span class="expected">→ ' + escapeHtml(issue.expected) + "</span>" : "");
      this.botEl.style.left = "50%";
      this.botEl.style.top = Math.max(top - 6, 4) + "px";
      this.botEl.classList.remove("hidden");
      if (this.opts.onMistake) this.opts.onMistake(issue);
    }

    // Transparent text that shows what to type next.
    showGhost(ghost) {
      this.ghost = ghost;
      if (!ghost || !ghost.text) {
        this.ghostEl.classList.add("hidden");
        this.hintBar.classList.add("hidden");
        return;
      }
      const lines = this.getValue().split("\n");
      const lastLine = lines.length;
      const lastText = lines[lastLine - 1] || "";
      const top = PAD_TOP + (lastLine - 1) * LINE_HEIGHT - this.area.scrollTop;
      const left = 14 + measure(lastText);
      this.ghostEl.textContent = ghost.text;
      this.ghostEl.style.top = top + "px";
      this.ghostEl.style.left = left + "px";
      this.ghostEl.classList.remove("hidden");

      this.hintBar.innerHTML =
        '<span>💡 ' + escapeHtml(ghost.message) + "</span>" +
        '<span class="ghost-snippet">' + escapeHtml(ghost.text) + "</span>";
      this.hintBar.classList.remove("hidden");
    }

    clearGhost() { this.showGhost(null); }

    reposition() {
      this.renderMarkers();
      if (this.ghost) this.showGhost(this.ghost);
    }

    focus() { this.area.focus(); }
  }

  function extFor(lang) {
    return {
      python: "py", cpp: "cpp", javascript: "js", typescript: "ts",
      java: "java", csharp: "cs", go: "go", rust: "rs",
      sql: "sql", bash: "sh", htmlcss: "html",
    }[lang] || "txt";
  }

  const measureCanvas = document.createElement("canvas").getContext("2d");
  function measure(text) {
    measureCanvas.font = "13.5px 'JetBrains Mono', monospace";
    return measureCanvas.measureText(text).width;
  }

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.CodeEditor = CodeEditor;
  window.escapeHtml = escapeHtml;
})();
