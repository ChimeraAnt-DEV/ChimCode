/* ============================================================
   ChimCode single-page application.
   ============================================================ */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const ic = (name, size) => window.icon(name, size);

  // Fill any element marked data-icon with its vector icon.
  function hydrateIcons(root) {
    $$("[data-icon]", root || document).forEach((el) => {
      if (el.dataset.iconDone) return;
      const size = el.dataset.size ? Number(el.dataset.size) : undefined;
      el.innerHTML = ic(el.dataset.icon, size);
      el.dataset.iconDone = "1";
    });
  }

  const state = {
    token: localStorage.getItem("chimcode_token") || "",
    me: null,
    catalogue: null,
    route: "learn",
    langId: null,
    lesson: null,
    editor: null,
    bot: null,
    dockBot: null,
    currentAchCategory: "all",
    onboarding: { index: 0, answers: {} },
    lastCode: "",
  };

  // ---------------------------------------------------------------- API
  // ChimAPI picks a backend: fully local (no server needed) or an optional
  // remote server. Same signature either way.
  async function api(path, opts) {
    opts = opts || {};
    return window.ChimAPI.call(path, opts.method || "GET", opts.body);
  }

  // ---------------------------------------------------------------- toasts
  function toast(iconName, title, sub, kind) {
    const wrap = $("#toasts");
    const t = document.createElement("div");
    t.className = "toast " + (kind || "");
    t.innerHTML =
      '<div class="t-icon">' + (window.ChimIcons.has(iconName) ? ic(iconName, 22) : "") + "</div><div><strong>" +
      escapeHtml(title) + "</strong>" + (sub ? "<span>" + escapeHtml(sub) + "</span>" : "") + "</div>";
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 400); }, 4200);
  }

  function celebrate(achievements) {
    (achievements || []).forEach((a, i) => {
      setTimeout(() => toast(a.icon, "Achievement unlocked!", a.name, "ach"), i * 650);
    });
    if (achievements && achievements.length) state.bot && state.bot.setState("happy");
  }

  // ---------------------------------------------------------------- HUD
  function refreshHud() {
    if (!state.me) return;
    $("#hud-books").textContent = state.me.books != null ? state.me.books : 0;
    $("#hud-xp").textContent = formatNum(state.me.xp);
    $("#hud-streak").textContent = state.me.streak || 0;
    $("#hud-avatar").innerHTML = avatarGlyph(state.me.pfp);
    const active = state.me.superActive;
    $("#super-badge").classList.toggle("hidden", !active);
    applyTheme(state.me.equipped && state.me.equipped.theme);
  }

  function avatarGlyph(id) {
    const map = {
      "chim-01": "robot", "ava-astro": "rocket", "ava-neon": "gem", "ava-flame": "flame",
      "ava-void": "globe", "ava-dragon": "sparkle", "ava-crown": "crown", "ava-prism": "palette",
    };
    return ic(map[id] || "robot", 26);
  }

  function applyTheme(themeId) {
    const theme = (themeId || "theme-midnight").replace("theme-", "");
    if (theme === "midnight") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }

  // ---------------------------------------------------------------- bot dock
  function initBotDock() {
    state.dockBot = new Mochi($("#bot-stage-dock"), 96);
    $("#bot-toggle").addEventListener("click", () => {
      const panel = $("#bot-panel");
      panel.classList.toggle("hidden");
      if (!panel.classList.contains("hidden")) {
        state.dockBot.setState("happy");
        if (!state.dockBotGreeted) {
          state.dockBotGreeted = true;
          botSay("Hi, I'm Mochi. Ask me anything, or open a lesson and I'll hover over your mistakes.");
        }
      }
    });
    $("#bot-speak-toggle").addEventListener("click", (e) => {
      mochiVoice.enabled = !mochiVoice.enabled;
      e.target.innerHTML = ic(mochiVoice.enabled ? "eye" : "x", 18);
      if (!mochiVoice.enabled) mochiVoice.stop();
    });
    $("#bot-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = $("#bot-input");
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      addMsg("me", q);
      state.dockBot.setState("thinking");
      if (!state.lesson) {
        botSay("Open a lesson first and I'll give you exact, line-by-line help on your code.");
        return;
      }
      try {
        const reply = await api("/bot/help", { method: "POST", body: { lesson_id: state.lesson.id, code: state.lastCode, question: q } });
        botSay(reply.spoken, reply);
        celebrate(reply.newAchievements);
      } catch (err) {
        botSay("I could not reach my brain just then. Try again in a moment.");
      }
    });
  }

  function addMsg(who, text, reply) {
    const box = $("#bot-messages");
    const m = document.createElement("div");
    m.className = "msg " + who;
    let html = escapeHtml(text);
    if (reply && reply.steps && reply.steps.length) {
      html += '<ul class="msg-steps">' + reply.steps.map((s) => "<li>" + escapeHtml(s.detail) + "</li>").join("") + "</ul>";
    }
    m.innerHTML = html;
    box.appendChild(m);
    box.scrollTop = box.scrollHeight;
  }

  function botSay(text, reply) {
    addMsg("bot", text, reply);
    state.dockBot.setState("talking");
    state.dockBot.talk(1400 + text.length * 42);
    mochiVoice.speak(text);
    if (state.bot) { state.bot.setState("talking"); state.bot.talk(1400 + text.length * 42); }
  }

  // ---------------------------------------------------------------- routing
  function go(route, param) {
    state.route = route;
    if (route === "learn") state.langId = param || null;
    if (route === "profile" && param) state.viewUser = param;
    else if (route !== "profile") state.viewUser = null;
    $$(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.route === route));
    $("#topnav").classList.remove("open");
    render();
  }

  function render() {
    const view = $("#view");
    view.innerHTML = '<div class="spinner"></div>';
    // Never leave the spinner up if a view throws or hangs.
    const guard = setTimeout(() => {
      if (view.querySelector(".spinner")) {
        view.innerHTML = '<div class="empty"><span class="e-icon" data-icon="timer" data-size="46"></span>Still loading… check your connection and try again.</div>';
      }
    }, 8000);
    const routes = {
      learn: renderLearn,
      community: renderCommunity,
      achievements: renderAchievements,
      shop: renderShop,
      profile: renderProfile,
    };
    Promise.resolve((routes[state.route] || renderLearn)(view))
      .then(() => hydrateIcons(view))
      .catch((err) => {
        view.innerHTML = '<div class="empty"><span class="e-icon" data-icon="alert" data-size="46"></span>Something went wrong: ' + escapeHtml(err.message) + "</div>";
        hydrateIcons(view);
      })
      .finally(() => clearTimeout(guard));
  }

  // ================================================================ LEARN
  async function renderLearn(view) {
    if (state.langId) return renderLanguage(view, state.langId);
    if (!state.catalogue) state.catalogue = await api("/catalogue");
    const cats = state.catalogue;
    const progress = await api("/progress");
    const byLang = {};
    progress.progress.forEach((p) => { byLang[p.language] = byLang[p.language] || { done: 0, total: 0 }; if (p.status !== "in_progress") byLang[p.language].done++; });
    const onboarding = await api("/onboarding");

    view.innerHTML = "";
    const head = el("div", "section-head");
    head.innerHTML =
      '<div><p class="eyebrow">Your curriculum</p><h2>Pick a language. Go all the way to the deep end.</h2>' +
      "<p>Every track runs from your first line of code to real bots, servers and systems.</p></div>";
    const superBtn = el("button", "btn btn-gold");
    superBtn.innerHTML = ic("star",16) + (state.me.superActive ? "Super Day running" : "Activate Super Day (250 Books)");
    superBtn.addEventListener("click", activateSuperDay);
    head.appendChild(superBtn);
    view.appendChild(head);

    if (onboarding && onboarding.completed && onboarding.goal) {
      const rec = el("div", "card glass");
      rec.style.marginBottom = "22px";
      rec.innerHTML = '<span class="chip chip-ic">' + ic("target",14) + 'Your goal</span> <b>' + escapeHtml(onboarding.goal) + "</b> · " +
        '<span class="chip chip-ic">' + ic("timer",14) + escapeHtml(onboarding.hours) + "</span>";
      view.appendChild(rec);
    }

    const grid = el("div", "grid grid-3");
    cats.languages.forEach((lang) => {
      const card = el("div", "card card-lang clickable");
      const prog = byLang[lang.id] || { done: 0, total: lang.lessonCount };
      const pct = lang.lessonCount ? Math.round((prog.done / lang.lessonCount) * 100) : 0;
      card.style.setProperty("--lang", lang.color);
      card.innerHTML =
        '<div class="lang-icon">' + ic(lang.icon, 32) + "</div>" +
        "<h3>" + escapeHtml(lang.name) + "</h3>" +
        '<div class="tagline">' + escapeHtml(lang.tagline) + "</div>" +
        '<div class="progress-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">' +
        "<span>" + prog.done + "/" + lang.lessonCount + " lessons</span><span>" + pct + "%</span></div>";
      card.addEventListener("click", () => go("learn", lang.id));
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }

  async function renderLanguage(view, langId) {
    const lang = await api("/languages/" + langId);
    const progress = await api("/progress");
    const done = {};
    progress.progress.forEach((p) => { done[p.lesson_id] = p.status; });

    view.innerHTML = "";
    const back = el("button", "btn btn-ghost btn-sm");
    back.textContent = "← All languages";
    back.addEventListener("click", () => go("learn"));
    view.appendChild(back);

    const head = el("div", "section-head");
    head.style.marginTop = "16px";
    head.innerHTML = "<div><p class='eyebrow'>" + ic(lang.icon, 15) + " " + escapeHtml(lang.name) + "</p><h2>" + escapeHtml(lang.tagline) + "</h2><p>" + escapeHtml(lang.blurb) + "</p></div>";
    view.appendChild(head);

    const list = el("div", "grid");
    list.style.gap = "12px";
    state.lessonList = lang.lessons;
    lang.lessons.forEach((lesson, i) => {
      const isDone = done[lesson.id] === "completed" || done[lesson.id] === "challenged";
      const row = el("div", "lesson-row" + (isDone ? " done" : ""));
      row.innerHTML =
        '<div class="lr-index">' + (isDone ? ic("check", 16) : i + 1) + "</div>" +
        '<div class="lr-body"><div class="lr-title">' + escapeHtml(lesson.title) + "</div>" +
        '<div class="lr-concept">' + escapeHtml(lesson.concept) + "</div></div>" +
        '<span class="chip level-' + lesson.level + '">' + lesson.level + "</span>" +
        '<div class="lr-min">' + lesson.minutes + " min</div>";
      const actions = el("div", "lr-row-actions");
      if (isDone) {
        const circle = el("span", "check-circle");
        circle.innerHTML = ic("check", 18);
        circle.title = "Completed";
        actions.appendChild(circle);
        const redo = el("button", "btn btn-sm btn-ghost btn-redo");
        redo.innerHTML = ic("redo", 14) + "Redo";
        redo.title = "Practice again — no extra rewards";
        redo.addEventListener("click", (e) => { e.stopPropagation(); openLesson(lesson.id, true); });
        actions.appendChild(redo);
      }
      actions.addEventListener("click", (e) => e.stopPropagation());
      row.appendChild(actions);
      row.addEventListener("click", () => openLesson(lesson.id));
      list.appendChild(row);
    });
    view.appendChild(list);
  }

  async function openLesson(lessonId) {
    const lesson = await api("/lessons/" + lessonId);
    state.lesson = lesson;
    const view = $("#view");
    view.innerHTML = "";

    const back = el("button", "btn btn-ghost btn-sm");
    back.textContent = "← Back";
    back.addEventListener("click", () => go("learn", lesson.language));
    view.appendChild(back);

    const layout = el("div", "lesson-layout");
    layout.style.marginTop = "16px";

    // -------- left: theory
    const left = el("div", "lesson-panel glass");
    left.innerHTML =
      "<p class='eyebrow'>" + escapeHtml(lesson.concept) + "</p>" +
      "<h2>" + escapeHtml(lesson.title) + "</h2>" +
      '<span class="chip level-' + lesson.level + '">' + lesson.level + "</span> " +
      '<span class="chip chip-ic">' + ic("timer",14) + lesson.minutes + " min</span>";

    const theory = el("div");
    lesson.theory.forEach((t, i) => {
      const step = el("div", "theory-step");
      step.innerHTML = '<div class="ts-num">' + (i + 1) + "</div><div>" + escapeHtml(t) + "</div>";
      theory.appendChild(step);
    });
    left.appendChild(theory);

    const example = el("div", "example-box");
    example.innerHTML = "<pre>" + escapeHtml(lesson.example) + "</pre>";
    left.appendChild(example);

    const task = el("div", "task-box");
    task.innerHTML = "<strong>Your task</strong><p>" + escapeHtml(lesson.task) + "</p>";
    left.appendChild(task);

    // quiz
    if (lesson.quiz) {
      const quizBox = el("div", "card");
      quizBox.style.marginTop = "18px";
      quizBox.innerHTML = "<b>Quick check</b><p>" + escapeHtml(lesson.quiz.question) + "</p>";
      const opts = el("div", "quiz-options");
      lesson.quiz.options.forEach((opt, idx) => {
        const b = el("button", "quiz-opt");
        b.textContent = opt;
        b.addEventListener("click", async () => {
          try {
            const r = await api("/quiz", { method: "POST", body: { lesson_id: lesson.id, option: idx } });
            $$(".quiz-opt", opts).forEach((x) => (x.disabled = true));
            b.classList.add(r.correct ? "correct" : "wrong");
            if (!r.correct) $$(".quiz-opt", opts)[r.answer].classList.add("correct");
            toast(r.correct ? "check" : "x", r.correct ? "Correct!" : "Not quite", r.explanation, r.correct ? "good" : "bad");
            celebrate(r.newAchievements);
            state.me = await api("/me"); refreshHud();
          } catch (e) { toast("alert", "Quiz error", e.message, "bad"); }
        });
        opts.appendChild(b);
      });
      quizBox.appendChild(opts);
      left.appendChild(quizBox);
    }
    layout.appendChild(left);

    // -------- right: editor
    const right = el("div", "lesson-panel glass");
    const editorHost = el("div");
    right.appendChild(editorHost);

    const actions = el("div");
    actions.style.cssText = "display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;";
    const runBtn = el("button", "btn btn-primary"); runBtn.textContent = "Run & check";
    const helpBtn = el("button", "btn"); helpBtn.innerHTML = ic("robot",16) + "Ask Mochi";
    const hintBtn = el("button", "btn btn-ghost"); hintBtn.innerHTML = ic("bulb",16) + "Hint";
    const watchBtn = el("button", "btn btn-ghost"); watchBtn.innerHTML = ic("eye",16) + "Watch Mochi";
    actions.append(runBtn, helpBtn, hintBtn, watchBtn);
    right.appendChild(actions);

    const results = el("div"); results.style.marginTop = "16px";
    right.appendChild(results);

    if (lesson.challenge) {
      const ch = el("div", "card");
      ch.style.marginTop = "18px";
      ch.innerHTML = "<b class=\"h-with-ic\">" + ic("puzzle",16) + "Challenge</b><p>" + escapeHtml(lesson.challenge) + "</p>";
      const chBtn = el("button", "btn btn-gold btn-sm");
      chBtn.innerHTML = ic("puzzle", 15) + "Attempt challenge";
      chBtn.addEventListener("click", () => openChallengeModal(lesson, results));
      ch.appendChild(chBtn);
      right.appendChild(ch);
    }

    if (lesson.superDay && lesson.superPlan) {
      const sd = el("div", "card");
      sd.style.cssText = "margin-top:18px;border-color:rgba(251,191,36,.5)";
      sd.innerHTML = "<b class=\"h-with-ic\">" + ic("star",16) + "Super Day mode active</b><p>" + escapeHtml(lesson.superPlan.spoken) + "</p>";
      const sdBtn = el("button", "btn btn-gold btn-sm"); sdBtn.textContent = "Open Super Day menu";
      sdBtn.addEventListener("click", () => openSuperMenu(lesson));
      sd.appendChild(sdBtn);
      right.appendChild(sd);
    }

    layout.appendChild(right);
    view.appendChild(layout);

    // editor instance
    state.editor = new CodeEditor(editorHost, {
      language: lesson.language,
      starter: lesson.starter,
      fileName: fileNameFor(lesson),
      onChange: (v) => { state.lastCode = v; liveAnalyze(v); },
      onMistake: (issue) => {
        state.bot && state.bot.setState("sad");
        state.bot && state.bot.talk(1600);
        // Mochi speaks up on its own the first time it sees a given mistake,
        // so the learner is not left staring at a silent red line.
        const key = issue.code + ":" + issue.line;
        state.seenMistakes = state.seenMistakes || {};
        if (!state.seenMistakes[key]) {
          state.seenMistakes[key] = true;
          const say = issue.expected
            ? issue.message + " You should " + issue.expected + "."
            : issue.message;
          botSay(say);
        }
      },
    });
    state.lastCode = state.editor.getValue();
    $("#bot-dock").classList.remove("hidden");

    runBtn.addEventListener("click", () => submitLesson(lesson, results));
    helpBtn.addEventListener("click", async () => {
      try {
        const reply = await api("/bot/help", { method: "POST", body: { lesson_id: lesson.id, code: state.editor.getValue() } });
        showBotReply(reply, results);
      } catch (e) { toast("alert", "Mochi is busy", e.message, "bad"); }
    });
    hintBtn.addEventListener("click", () => {
      const hints = lesson.hints || [];
      const h = hints[Math.min(state.hintCount || 0, hints.length - 1)] || "Re-read the theory steps above.";
      state.hintCount = (state.hintCount || 0) + 1;
      toast("bulb", "Hint " + state.hintCount, h);
      state.bot && state.bot.setState("thinking");
    });
    watchBtn.addEventListener("click", async () => {
      const wt = await api("/bot/walkthrough/" + lesson.id);
      openWalkthrough(lesson, wt);
    });
    liveAnalyze(state.lastCode);
    state.editor.focus();
  }

  function fileNameFor(lesson) {
    const ext = { python: "py", cpp: "cpp", javascript: "js", typescript: "ts", java: "java", csharp: "cs", go: "go", rust: "rs", sql: "sql", bash: "sh", htmlcss: "html" }[lesson.language] || "txt";
    return lesson.id.replace(/-/g, "_") + "." + ext;
  }

  let analyzeTimer = null;
  function liveAnalyze(code) {
    if (!state.lesson) return;
    clearTimeout(analyzeTimer);
    analyzeTimer = setTimeout(async () => {
      try {
        const r = await api("/analyze", { method: "POST", body: { lesson_id: state.lesson.id, code } });
        state.editor.setIssues(r.issues);
        state.editor.showGhost(r.ghost);
      } catch (e) { /* ignore live errors */ }
    }, 320);
  }

  async function submitLesson(lesson, results) {
    const code = state.editor.getValue();
    try {
      const r = await api("/submit", { method: "POST", body: { lesson_id: lesson.id, code, hints_used: state.hintCount || 0 } });
      state.editor.setIssues(r.issues);
      state.editor.showGhost(r.passed ? null : r.ghost);
      renderResults(results, r);
      state.bot.setState(r.passed ? "happy" : "sad");
      state.bot.talk(1800);
      celebrate(r.rewards.newAchievements);
      state.me = await api("/me");
      refreshHud();
      if (r.passed) {
        mochiVoice.speak("That is correct. Nicely done.");
        showCompletion(lesson, r, false);
      } else {
        toast("puzzle", "Keep going", "Mochi marked what to fix.", "bad");
      }
    } catch (e) { toast("alert", "Could not check", e.message, "bad"); }
  }

  // Animated check + reward payout, then an option to continue or review.
  function showCompletion(lesson, r, isChallenge) {
    const rewards = r.rewards || {};
    const overlay = el("div", "done-overlay");
    const card = el("div", "done-card glass");
    const first = !rewards.repeated;

    const title = isChallenge ? "Challenge beaten" : "Lesson complete";
    card.innerHTML =
      '<div class="check-burst">' +
      '<svg viewBox="0 0 120 120"><circle class="disc" cx="60" cy="60" r="46"/>' +
      '<circle class="ring" cx="60" cy="60" r="52"/>' +
      '<path class="tick" d="M38 62 L54 78 L84 46"/></svg>' +
      "</div>" +
      "<h2 style='margin:0'>" + title + "</h2>" +
      "<p>" + escapeHtml(lesson.title) + "</p>";

    if (first && (rewards.books || rewards.xp)) {
      const row = el("div", "reward-row");
      if (rewards.books) {
        const b = el("div", "reward-chip books");
        b.innerHTML = ic("book", 20) + "+" + rewards.books;
        row.appendChild(b);
      }
      if (rewards.xp) {
        const x = el("div", "reward-chip xp delay-1");
        x.innerHTML = ic("bolt", 20) + "+" + rewards.xp;
        row.appendChild(x);
      }
      card.appendChild(row);
      // Floating coin flourish.
      for (let i = 0; i < 6; i++) {
        const f = el("span", "float-book");
        f.innerHTML = ic("book", 20);
        f.style.left = 30 + Math.random() * 60 + "%";
        f.style.top = "52%";
        f.style.animationDelay = (0.2 + i * 0.12) + "s";
        card.appendChild(f);
      }
    } else {
      const note = el("p", "reward-note");
      note.textContent = rewards.repeated
        ? "Practice run — rewards are only given the first time."
        : "Nicely done.";
      card.appendChild(note);
    }

    if (r.rewards && r.rewards.newAchievements && r.rewards.newAchievements.length) {
      const ach = el("p", "reward-note");
      ach.textContent = "+" + r.rewards.newAchievements.length + " achievement" +
        (r.rewards.newAchievements.length > 1 ? "s" : "") + " unlocked";
      card.appendChild(ach);
    }

    const actions = el("div", "done-actions");
    const next = nextLessonAfter(lesson.id);
    if (next) {
      const nb = el("button", "btn btn-primary");
      nb.innerHTML = ic("play", 15) + "Continue to next lesson";
      nb.addEventListener("click", () => { closeModal(); openLesson(next.id); });
      actions.appendChild(nb);
    }
    const again = el("button", "btn btn-ghost");
    again.innerHTML = ic("redo", 15) + "Practice again";
    again.addEventListener("click", () => { closeModal(); openLesson(lesson.id, true); });
    actions.appendChild(again);
    const review = el("button", "btn btn-ghost");
    review.textContent = "Stay here";
    review.addEventListener("click", closeModal);
    actions.appendChild(review);

    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    mochiVoice.speak(first ? "Correct. Here are your rewards." : "Nice practice run.");
  }

  function nextLessonAfter(lessonId) {
    const all = state.lessonList || [];
    const idx = all.findIndex((l) => l.id === lessonId);
    if (idx >= 0 && idx + 1 < all.length) return all[idx + 1];
    return null;
  }

  // A proper editor inside a modal, replacing the old native prompt().
  function openChallengeModal(lesson, results) {
    const backdrop = el("div", "modal-backdrop challenge-modal");
    const box = el("div", "modal glass");
    const head = el("div", "modal-head");
    head.innerHTML = "<h3 style='margin:0'>Challenge</h3>";
    const close = el("button", "icon-btn");
    close.innerHTML = ic("x", 16);
    close.addEventListener("click", () => backdrop.remove());
    head.appendChild(close);
    box.appendChild(head);
    box.appendChild(pEl(lesson.challenge));

    const host = el("div");
    box.appendChild(host);
    const editor = new CodeEditor(host, {
      language: lesson.language,
      starter: lesson.challengeStarter || "",
      fileName: "challenge_" + fileNameFor(lesson),
    });

    const out = el("div");
    out.style.marginTop = "14px";
    box.appendChild(out);
    const actions = el("div");
    actions.style.cssText = "display:flex;gap:10px;margin-top:14px;flex-wrap:wrap";
    const run = el("button", "btn btn-gold");
    run.innerHTML = ic("puzzle", 15) + "Submit challenge";
    run.addEventListener("click", () => submitChallenge(lesson.id, editor.getValue(), out, backdrop));
    actions.appendChild(run);
    box.appendChild(actions);

    backdrop.appendChild(box);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    editor.focus();
  }

  async function submitChallenge(lessonId, code, results, backdrop) {
    try {
      const r = await api("/challenge", { method: "POST", body: { lesson_id: lessonId, code } });
      renderResults(results, r, true);
      celebrate(r.rewards.newAchievements);
      state.me = await api("/me");
      refreshHud();
      if (r.rewards && r.rewards.needsChange) {
        toast("alert", "Change the code first", "Write your own solution — not the starter or the example.", "bad");
      } else if (r.passed) {
        if (backdrop) backdrop.remove();
        const lesson = state.lesson;
        showCompletion(lesson, r, true);
      } else {
        toast("puzzle", "Not yet", "Mochi marked what to fix.", "bad");
      }
    } catch (e) { toast("alert", "Challenge error", e.message, "bad"); }
  }

  function renderResults(container, r, isChallenge) {
    container.innerHTML = "";
    const ring = el("div", "score-ring");
    const color = r.score >= 80 ? "var(--good)" : r.score >= 50 ? "var(--gold)" : "var(--bad)";
    ring.style.background = "conic-gradient(" + color + " " + r.score * 3.6 + "deg, rgba(255,255,255,.1) 0)";
    ring.innerHTML = "<span>" + r.score + "%</span>";
    const wrap = el("div");
    wrap.style.cssText = "display:flex;gap:18px;align-items:center;flex-wrap:wrap";
    wrap.appendChild(ring);
    const summary = el("div");
    summary.innerHTML = "<b>" + (r.passed ? "All requirements met" : "Not quite yet") + "</b><p>" +
      (r.issues && r.issues.length ? r.issues.length + " thing(s) to fix." : "No syntax issues found.") + "</p>";
    wrap.appendChild(summary);
    container.appendChild(wrap);

    const list = el("ul", "check-list");
    r.checks.forEach((c) => {
      const li = el("li", c.ok ? "ok" : "bad");
      li.innerHTML = '<span class="c-ico">' + ic(c.ok ? "check" : "x", 15) + "</span><span>" + escapeHtml(c.message) + "</span>";
      list.appendChild(li);
    });
    container.appendChild(list);

    if (r.issues && r.issues.length) {
      const issues = el("div", "card");
      issues.style.marginTop = "12px";
      issues.innerHTML = "<b class=\"h-with-ic\">" + ic("robot",16) + "Mochi spotted</b>";
      r.issues.slice(0, 6).forEach((i) => {
        const row = el("div");
        row.style.cssText = "margin-top:8px;font-size:13.5px";
        row.innerHTML = "<b>Line " + i.line + ":</b> " + escapeHtml(i.message) +
          (i.expected ? " <code>" + escapeHtml(i.expected) + "</code>" : "");
        issues.appendChild(row);
      });
      container.appendChild(issues);
    }
  }

  function showBotReply(reply, container) {
    const box = el("div", "card");
    box.style.cssText = "margin-top:16px;border-color:rgba(124,92,255,.5)";
    let html = "<b class=\"h-with-ic\">" + ic("robot",16) + "Mochi says</b><p>" + escapeHtml(reply.spoken) + "</p>";
    if (reply.steps && reply.steps.length) {
      html += "<ul style='padding-left:18px;color:var(--muted);font-size:13.5px'>" +
        reply.steps.map((s) => "<li>" + escapeHtml(s.detail) + "</li>").join("") + "</ul>";
    }
    box.innerHTML = html;
    container.appendChild(box);
    botSay(reply.spoken, reply);
    celebrate(reply.newAchievements);
    state.editor.setIssues(reply.issues || []);
    if (reply.ghost) state.editor.showGhost(reply.ghost);
  }

  // ================================================================ SUPER DAY
  async function activateSuperDay() {
    try {
      const r = await api("/superday/buy", { method: "POST" });
      celebrate(r.newAchievements);
      state.me = await api("/me");
      refreshHud();
      // Play the anime-style duel, then reveal the menu when the fight is over.
      window.ChimDuel.play(() => {
        toast("star", "Super Day activated!", "For the next 24 hours Mochi explains hard stuff endlessly.", "good");
        if (state.lesson) openLesson(state.lesson.id);
      });
    } catch (e) { toast("alert", "Cannot activate", e.message, "bad"); }
  }

  function openSuperMenu(lesson) {
    const plan = lesson.superPlan;
    modal("Super Day — " + lesson.title, (body) => {
      body.appendChild(pEl(plan.spoken));
      const menu = el("div", "super-menu");
      plan.variations.forEach((v) => {
        const card = el("div", "variation");
        card.innerHTML = "<b>" + escapeHtml(v.name) + "</b><span>" + escapeHtml(v.prompt) + "</span>";
        card.addEventListener("click", () => {
          state.editor.setValue(v.starter || lesson.starter);
          toast("puzzle", "New variation", v.prompt);
          closeModal();
        });
        menu.appendChild(card);
      });
      body.appendChild(menu);
      const watch = el("button", "btn btn-gold btn-block");
      watch.style.marginTop = "16px";
      watch.innerHTML = ic("play",16) + "Watch Mochi build it and explain";
      watch.addEventListener("click", () => openWalkthrough(lesson, plan.walkthrough));
      body.appendChild(watch);
    });
  }

  // Watch Mochi: an animated scene where Mochi walks to the task, raises a
  // holographic keyboard and types the code while explaining it in English.
  function openWalkthrough(lesson, wt) {
    modal("Watch Mochi build it", (body) => {
      const stage = el("div", "coach-stage");
      const canvas = document.createElement("canvas");
      stage.appendChild(canvas);
      body.appendChild(stage);

      const spoken = el("p", "coach-said");
      spoken.textContent = wt.spoken || "Watch closely — I will type it and explain every line.";
      body.appendChild(spoken);

      const caption = el("div", "coach-caption");
      body.appendChild(caption);

      const codeBox = el("div", "coach-code");
      body.appendChild(codeBox);

      const controls = el("div", "done-actions");
      const replay = el("button", "btn btn-ghost");
      replay.innerHTML = ic("redo", 15) + "Replay";
      const got = el("button", "btn btn-primary");
      got.innerHTML = ic("check", 15) + "Got it";
      got.addEventListener("click", closeModal);
      controls.append(replay, got);
      body.appendChild(controls);

      let coach = null;
      const narration = wt.narration || [];
      const start = () => {
        if (coach) coach.stop();
        caption.innerHTML = "";
        codeBox.innerHTML = "";
        coach = new window.ChimCoach.Coach(canvas, (n, i) => {
          caption.innerHTML = "<b>Line " + n.line + "</b> " + escapeHtml(n.note);
          const lineEl = el("code");
          lineEl.textContent = n.code || " ";
          lineEl.style.animationDelay = "0s";
          codeBox.appendChild(lineEl);
          mochiVoice.speak(n.note);
        });
        coach.setLines(narration);
      };
      replay.addEventListener("click", start);
      start();
      const cleanup = () => { if (coach) coach.stop(); };
      // Stop the animation when the modal closes.
      const backdrop = body.closest(".modal-backdrop");
      if (backdrop) backdrop.addEventListener("click", cleanup);
      got.addEventListener("click", cleanup);
    });
    state.dockBot.setState("talking");
  }

  // ================================================================ COMMUNITY
  async function renderCommunity(view) {
    const [users, feed, board] = await Promise.all([api("/users"), api("/feed"), api("/leaderboard")]);
    view.innerHTML = "";
    const head = el("div", "section-head");
    head.innerHTML = "<div><p class='eyebrow'>Community</p><h2>See who is coding right now</h2><p>Profiles, achievements, online status and progress.</p></div>";
    view.appendChild(head);

    // Be honest about where the people come from.
    const note = el("div", "notice");
    if (window.ChimAPI.mode === "server") {
      note.innerHTML = ic("globe", 16) + " Connected to a shared server — these are real coders you can follow.";
    } else {
      note.innerHTML = ic("alert", 16) +
        " You are offline, so these are sample coders shown as a demo of the community. " +
        "Run the included server (see the README) to compete with real people across devices.";
    }
    view.appendChild(note);

    const cols = el("div");
    cols.style.cssText = "display:grid;grid-template-columns:1.4fr 1fr;gap:22px;align-items:start";

    const left = el("div", "grid grid-2");
    users.users.forEach((u) => {
      const card = el("div", "card clickable user-card");
      card.innerHTML =
        '<div class="uc-avatar" style="background:' + itemGradient(u.pfp) + '">' + avatarGlyph(u.pfp) +
        '<span class="status-dot ' + (u.online ? "online" : "offline") + '"></span></div>' +
        '<div class="uc-body"><div class="uc-name">' + escapeHtml(u.username) +
        (u.isFollowing ? ' <span class="chip">following</span>' : "") + "</div>" +
        '<div class="uc-sub stats-inline">' + ic("bolt",13) + " " + formatNum(u.xp) + ic("trophy",13) + " " + u.achievements + ic("flame",13) + " " + u.streak + "</div></div>";
      card.addEventListener("click", () => go("profile", u.username));
      left.appendChild(card);
    });
    if (!users.users.length) {
      left.innerHTML = '<div class="empty"><span class="e-icon" data-icon="users" data-size="46"></span>No other public profiles yet. Invite a friend!</div>';
    }

    const right = el("div");
    const boardCard = el("div", "card");
    boardCard.innerHTML = "<b class=\"h-with-ic\">" + ic("trophy",16) + "Leaderboard</b>";
    board.leaders.forEach((l) => {
      const row = el("div");
      row.style.cssText = "display:flex;gap:10px;align-items:center;margin-top:10px;font-size:14px";
      row.innerHTML = '<b style="width:24px">#' + l.rank + "</b><span>" + avatarGlyph(l.pfp) + "</span><span style='flex:1'>" +
        escapeHtml(l.username) + "</span><span style='color:var(--accent-2)'>" + formatNum(l.xp) + " XP</span>";
      boardCard.appendChild(row);
    });
    right.appendChild(boardCard);

    const feedCard = el("div", "card");
    feedCard.style.marginTop = "18px";
    feedCard.innerHTML = "<b class=\"h-with-ic\">" + ic("bolt",16) + "Live activity</b>";
    feed.feed.slice(0, 12).forEach((f) => {
      const row = el("div", "feed-item");
      row.innerHTML = "<span>" + avatarGlyph(f.pfp) + "</span><span><b>" + escapeHtml(f.username) + "</b> " +
        escapeHtml(f.detail) + '</span><span class="f-time">' + timeAgo(f.created_at) + "</span>";
      feedCard.appendChild(row);
    });
    if (!feed.feed.length) feedCard.innerHTML += "<p>No activity yet.</p>";
    right.appendChild(feedCard);

    cols.append(left, right);
    view.appendChild(cols);
  }

  // ================================================================ ACHIEVEMENTS
  async function renderAchievements(view) {
    const data = await api("/achievements");
    view.innerHTML = "";
    const head = el("div", "section-head");
    head.innerHTML = "<div><p class='eyebrow'>Trophy case</p><h2>" + data.earned + " of " + data.total + " achievements</h2><p>Every lesson, challenge and language has its own trophies.</p></div>";
    view.appendChild(head);

    const summary = el("div", "ach-summary");
    const bar = el("div", "progress-bar");
    bar.style.cssText = "flex:1;min-width:220px";
    bar.innerHTML = '<i style="width:' + Math.round((data.earned / data.total) * 100) + '%"></i>';
    summary.appendChild(bar);
    view.appendChild(summary);

    const toolbar = el("div", "ach-toolbar");
    const all = el("button", "ach-cat active"); all.textContent = "All (" + data.total + ")";
    all.addEventListener("click", () => { state.currentAchCategory = "all"; renderAchievements(view); });
    toolbar.appendChild(all);
    data.categories.filter((c) => c.count).forEach((c) => {
      const b = el("button", "ach-cat");
      b.innerHTML = ic(c.icon, 14) + " " + escapeHtml(c.name) + " (" + c.count + ")";
      if (state.currentAchCategory === c.id) b.classList.add("active");
      b.addEventListener("click", () => { state.currentAchCategory = c.id; renderAchievements(view); });
      toolbar.appendChild(b);
    });
    view.appendChild(toolbar);

    const list = data.achievements.filter((a) => state.currentAchCategory === "all" || a.category === state.currentAchCategory);
    const grid = el("div", "grid grid-4");
    list.forEach((a) => {
      const card = el("div", "ach-card " + (a.earned ? "earned" : "locked"));
      card.innerHTML =
        '<span class="a-icon">' + ic(a.earned ? a.icon : "lock", 30) + "</span>" +
        '<div class="a-name">' + escapeHtml(a.name) + "</div>" +
        '<div class="a-desc">' + escapeHtml(a.description) + "</div>" +
        '<div class="rarity-' + a.rarity + '" style="font-size:11px;margin-top:6px;text-transform:uppercase;letter-spacing:.08em">' + a.rarity + "</div>";
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }

  // ================================================================ SHOP
  async function renderShop(view) {
    const data = await api("/shop");
    view.innerHTML = "";
    const head = el("div", "section-head");
    head.innerHTML = "<div><p class='eyebrow'>Books shop</p><h2>Customise your profile</h2><p>Spend Books on avatars, effects, overlays and themes — or save up for a Super Day.</p></div>";
    const wallet = el("div", "pill pill-books");
    wallet.innerHTML = ic("book",15) + "<b>" + data.books + " Books</b>";
    head.appendChild(wallet);
    view.appendChild(head);

    const superCard = el("div", "card");
    superCard.style.cssText = "margin-bottom:22px;border-color:rgba(251,191,36,.5);background:linear-gradient(120deg,rgba(251,191,36,.12),rgba(124,92,255,.08))";
    superCard.innerHTML = "<b class=\"h-with-ic\">" + ic("star",16) + "Super Day</b><p>One day where Mochi only teaches the hard stuff and explains it as many times as you need. It never does the work for you — it shows you a similar problem, then narrates a full walkthrough while you type it yourself.</p>";
    const buySuper = el("button", "btn btn-gold");
    buySuper.textContent = state.me.superActive ? "Active now" : "Activate — " + data.superDayCost + " Books";
    buySuper.disabled = state.me.superActive;
    buySuper.addEventListener("click", activateSuperDay);
    superCard.appendChild(buySuper);
    view.appendChild(superCard);

    Object.keys(data.grouped).forEach((slot) => {
      const section = el("div");
      section.style.marginBottom = "30px";
      const h = el("h3");
      h.textContent = data.slots[slot];
      section.appendChild(h);
      const grid = el("div", "grid grid-4");
      data.grouped[slot].forEach((item) => {
        const card = el("div", "card shop-item");
        const preview = el("div", "si-preview");
        preview.innerHTML = ic(item.icon, 40);
        if (item.css && /gradient|#/.test(item.css) && !["sparkle", "matrix", "aurora", "galaxy", "lightning", "grid", "scanline", "holo", "circuit", "midnight", "cyber", "emerald", "crimson", "royal", "none"].includes(item.css)) {
          preview.style.background = item.css;
        }
        card.appendChild(preview);
        card.innerHTML += "<b>" + escapeHtml(item.name) + "</b><p style='font-size:12.5px'>" + escapeHtml(item.description) + "</p>" +
          '<div class="si-price">' + (item.price === 0 ? "Free" : item.price + " Books") + "</div>";
        if (item.owned) card.innerHTML += '<span class="badge-owned ' + (item.equipped ? "badge-equipped" : "") + '">' + (item.equipped ? "In use" : "Owned") + "</span>";
        const actions = el("div", "si-actions");
        if (!item.owned) {
          const buy = el("button", "btn btn-sm btn-primary");
          buy.innerHTML = ic("cart", 14) + "Buy";
          buy.addEventListener("click", () => buyItem(item.id, view));
          actions.appendChild(buy);
        } else if (!item.equipped) {
          const eq = el("button", "btn btn-sm btn-primary");
          eq.innerHTML = ic("check", 14) + "Use";
          eq.addEventListener("click", () => equipItem(item.id, view));
          actions.appendChild(eq);
        } else {
          const un = el("button", "btn btn-sm btn-ghost");
          un.innerHTML = ic("x", 14) + "Remove";
          un.addEventListener("click", () => unequipItem(item.slot, view));
          actions.appendChild(un);
        }
        card.appendChild(actions);
        grid.appendChild(card);
      });
      section.appendChild(grid);
      view.appendChild(section);
    });
  }

  async function buyItem(id, view) {
    try {
      const r = await api("/shop/buy/" + id, { method: "POST" });
      toast("cart", "Purchased!", "Equip it from your profile or here.", "good");
      celebrate(r.newAchievements);
      state.me = await api("/me"); refreshHud();
      renderShop(view);
    } catch (e) { toast("alert", "Purchase failed", e.message, "bad"); }
  }
  async function equipItem(id, view) {
    try { await api("/shop/equip/" + id, { method: "POST" }); state.me = await api("/me"); refreshHud(); renderShop(view); }
    catch (e) { toast("alert", "Cannot equip", e.message, "bad"); }
  }
  async function unequipItem(slot, view) {
    try { await api("/shop/unequip/" + slot, { method: "POST" }); state.me = await api("/me"); refreshHud(); renderShop(view); }
    catch (e) { toast("alert", "Cannot unequip", e.message, "bad"); }
  }

  // ================================================================ PROFILE
  async function renderProfile(view) {
    const username = state.viewUser || state.me.username;
    const isSelf = !state.viewUser || state.viewUser === state.me.username;
    let profile;
    try { profile = await api("/users/" + encodeURIComponent(username)); }
    catch (e) {
      view.innerHTML = '<div class="empty"><span class="e-icon" data-icon="lock" data-size="46"></span>' + escapeHtml(e.message) + "</div>";
      return;
    }
    view.innerHTML = "";

    const hero = el("div", "profile-hero glass");
    const banner = el("div", "profile-banner");
    if (profile.equipped.banner && profile.equipped.banner !== "ban-none") {
      banner.style.background = bannerGradient(profile.equipped.banner);
    }
    const fx = el("div", "fx-layer");
    if (profile.equipped.effect && profile.equipped.effect !== "fx-none") fx.classList.add("fx-" + effectClass(profile.equipped.effect));
    const ov = el("div", "ov-layer");
    if (profile.equipped.overlay && profile.equipped.overlay !== "ov-none") ov.classList.add("ov-" + effectClass(profile.equipped.overlay));
    hero.append(banner, fx, ov);

    const main = el("div", "profile-main");
    const av = el("div", "profile-avatar");
    av.style.background = itemGradient(profile.pfp);
    av.innerHTML = avatarGlyph(profile.pfp) + '<span class="status-dot ' + (profile.online ? "online" : "offline") + '"></span>';
    if (profile.equipped.frame && profile.equipped.frame !== "frame-none") av.style.boxShadow = frameShadow(profile.equipped.frame);
    main.appendChild(av);

    const meta = el("div", "profile-meta");
    meta.innerHTML = "<h2>" + escapeHtml(profile.username) + "</h2><p>" +
      (profile.bio ? escapeHtml(profile.bio) : "No bio yet.") + "</p>";
    const statRow = el("div", "stat-row");
    [
      ["bolt", formatNum(profile.xp), "XP"],
      ["trophy", profile.achievements, "Achievements"],
      ["flame", profile.streak, "Streak"],
      ["users", profile.followers, "Followers"],
    ].forEach(([i, v, l]) => {
      const s = el("div", "stat");
      s.innerHTML = "<b>" + ic(i, 15) + " " + v + "</b><span>" + l + "</span>";
      statRow.appendChild(s);
    });
    meta.appendChild(statRow);
    main.appendChild(meta);

    const actions = el("div", "profile-actions");
    if (isSelf) {
      const edit = el("button", "btn"); edit.innerHTML = ic("user",16) + "Edit profile";
      edit.addEventListener("click", () => openEditProfile(profile, view));
      const shop = el("button", "btn btn-ghost"); shop.innerHTML = ic("bag",16) + "Shop";
      shop.addEventListener("click", () => go("shop"));
      actions.append(edit, shop);
    } else {
      const follow = el("button", "btn " + (profile.isFollowing ? "btn-ghost" : "btn-primary"));
      follow.textContent = profile.isFollowing ? "Following" : "Follow";
      follow.addEventListener("click", async () => {
        await api("/follow/" + profile.username, { method: "POST" });
        renderProfile(view);
      });
      const friend = el("button", "btn " + (profile.isFriend ? "btn-ghost" : ""));
      friend.textContent = profile.isFriend ? "Friends" : "Add friend";
      friend.addEventListener("click", async () => {
        await api("/friends/" + profile.username, { method: "POST" });
        toast("handshake", "Updated", "Friend list changed.");
        renderProfile(view);
      });
      actions.append(follow, friend);
    }
    main.appendChild(actions);
    hero.appendChild(main);
    view.appendChild(hero);

    const earned = el("div");
    earned.style.marginTop = "24px";
    earned.innerHTML = "<h3>Recent achievements</h3>";
    const grid = el("div", "grid grid-4");
    (profile.achievementList || []).slice(0, 12).forEach((a) => {
      const card = el("div", "ach-card earned");
      card.innerHTML = '<span class="a-icon">' + ic(a.icon, 30) + '</span><div class="a-name">' + escapeHtml(a.name) + '</div><div class="a-desc">' + escapeHtml(a.description) + "</div>";
      grid.appendChild(card);
    });
    if (!(profile.achievementList || []).length) grid.innerHTML = '<div class="empty"><span class="e-icon" data-icon="trophy" data-size="46"></span>No achievements yet.</div>';
    earned.appendChild(grid);
    view.appendChild(earned);
  }

  // A proper customisation studio: profile details plus every cosmetic the
  // player owns, grouped by slot, with instant equip.
  function openEditProfile(profile, view) {
    modal("Customise profile", (body) => {
      const tabs = el("div", "seg");
      const details = el("div");
      const closet = el("div");
      const detailBtn = el("button", "seg-btn active"); detailBtn.textContent = "Profile";
      const closetBtn = el("button", "seg-btn"); closetBtn.textContent = "Cosmetics";
      tabs.append(detailBtn, closetBtn);
      body.append(tabs, details, closet);

      // ---- details tab
      const form = el("div");
      form.style.display = "grid";
      form.style.gap = "14px";
      const avatars = (window.CHIMDATA.storeSlots ? [] : []);
      form.innerHTML =
        "<label>Username<input id='pf-username' maxlength='20' value='" + escapeHtml(profile.username) + "' /></label>" +
        "<label>Bio<textarea id='pf-bio' rows='3' maxlength='280' placeholder='Tell other coders what you build…'>" + escapeHtml(profile.bio) + "</textarea></label>" +
        "<label>Accent colour<input id='pf-color' type='color' value='" + escapeHtml(profile.pfpColor || "#7c5cff") + "' /></label>" +
        "<label class='pf-check'><input id='pf-public' type='checkbox' " + (profile.public ? "checked" : "") + " /> Public profile — let others see my progress</label>";
      details.appendChild(form);

      const avatarWrap = el("div");
      avatarWrap.innerHTML = "<p class='pf-label'>Avatar</p>";
      const avRow = el("div", "pf-avatars");
      const AVATARS = ["chim-01", "ava-astro", "ava-neon", "ava-flame", "ava-void", "ava-dragon", "ava-crown", "ava-prism"];
      let chosen = profile.pfp;
      AVATARS.forEach((id) => {
        const b = el("button", "pf-avatar" + (id === chosen ? " active" : ""));
        b.innerHTML = avatarGlyph(id);
        b.style.background = itemGradient(id);
        b.title = id;
        b.addEventListener("click", () => {
          chosen = id;
          Array.from(avRow.children).forEach((c) => c.classList.toggle("active", c === b));
          save({ pfp: chosen, pfp_color: $("#pf-color").value });
        });
        avRow.appendChild(b);
      });
      avatarWrap.appendChild(avRow);
      details.appendChild(avatarWrap);

      const save = el("button", "btn btn-primary btn-block");
      save.style.marginTop = "18px";
      save.textContent = "Save profile";
      save.addEventListener("click", async () => {
        await saveProfile({
          bio: $("#pf-bio").value,
          pfp: chosen,
          pfp_color: $("#pf-color").value,
          is_public: $("#pf-public").checked,
        });
        const newName = $("#pf-username").value.trim();
        if (newName && newName !== profile.username) {
          try {
            const r = await api("/username", { method: "POST", body: { username: newName } });
            if (r.token) { state.token = r.token; localStorage.setItem("chimcode_token", r.token); }
          } catch (e) { toast("alert", "Username taken", e.message, "bad"); }
        }
        state.me = await api("/me");
        refreshHud();
        toast("check", "Profile saved", "", "good");
        renderProfile(view);
      });
      details.appendChild(save);

      async function saveProfile(patch) {
        try {
          await api("/profile", { method: "POST", body: patch });
          state.me = await api("/me");
          refreshHud();
          renderProfile(view);
        } catch (e) { toast("alert", "Could not save", e.message, "bad"); }
      }

      // ---- cosmetics tab (equip owned items)
      const closetBody = el("div");
      closet.appendChild(closetBody);
      let closetBuilt = false;
      closetBtn.addEventListener("click", async () => {
        detailBtn.classList.remove("active"); closetBtn.classList.add("active");
        details.classList.add("hidden"); closet.classList.remove("hidden");
        if (closetBuilt) return;
        closetBuilt = true;
        closetBody.innerHTML = '<div class="spinner"></div>';
        try {
          const shop = await api("/shop");
          closetBody.innerHTML = "";
          closetBody.appendChild(el("p", "pf-label")).textContent = "";
          Object.keys(shop.grouped).forEach((slot) => {
            const owned = shop.grouped[slot].filter((i) => i.owned);
            if (!owned.length) return;
            const h = el("p", "pf-label");
            h.textContent = shop.slots[slot];
            closetBody.appendChild(h);
            const row = el("div", "pf-grid");
            owned.forEach((item) => {
              const b = el("button", "pf-item" + (item.equipped ? " active" : ""));
              b.innerHTML = ic(item.icon, 26) + "<span>" + escapeHtml(item.name) + "</span>";
              b.addEventListener("click", async () => {
                try {
                  await api("/shop/equip/" + item.id, { method: "POST" });
                  state.me = await api("/me");
                  refreshHud();
                  toast("check", "Equipped", item.name, "good");
                  renderProfile(view);
                  Array.from(row.children).forEach((c) => c.classList.toggle("active", c === b));
                } catch (e) { toast("alert", "Could not equip", e.message, "bad"); }
              });
              row.appendChild(b);
            });
            closetBody.appendChild(row);
          });
        } catch (e) {
          closetBody.innerHTML = "<p>Could not load your cosmetics.</p>";
        }
      });
    });
  }

  // ================================================================ helpers
  function modal(title, build) {
    const backdrop = el("div", "modal-backdrop");
    const box = el("div", "modal glass");
    const head = el("div", "modal-head");
    head.innerHTML = "<h3 style='margin:0'>" + escapeHtml(title) + "</h3>";
    const close = el("button", "icon-btn"); close.innerHTML = ic("x",16);
    close.addEventListener("click", closeModal);
    head.appendChild(close);
    box.appendChild(head);
    build(box);
    backdrop.appendChild(box);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);
  }
  function closeModal() {
    $$(".modal-backdrop").forEach((m) => m.remove());
    $$(".done-overlay").forEach((m) => m.remove());
  }

  function pEl(text) { const p = el("p"); p.textContent = text; return p; }
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function formatNum(n) { n = n || 0; return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : String(n); }
  function timeAgo(ts) {
    const s = Math.max(1, Math.floor(Date.now() / 1000 - ts));
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function itemGradient(id) {
    const map = {
      "chim-01": "linear-gradient(135deg,#7c5cff,#22d3ee)", "ava-astro": "linear-gradient(135deg,#0ea5e9,#312e81)",
      "ava-neon": "linear-gradient(135deg,#f472b6,#22d3ee)", "ava-flame": "linear-gradient(135deg,#f97316,#b91c1c)",
      "ava-void": "linear-gradient(135deg,#111827,#6d28d9)", "ava-dragon": "linear-gradient(135deg,#16a34a,#065f46)",
      "ava-crown": "linear-gradient(135deg,#fbbf24,#b45309)", "ava-prism": "linear-gradient(135deg,#f43f5e,#8b5cf6,#22d3ee)",
    };
    return map[id] || "linear-gradient(135deg,#7c5cff,#22d3ee)";
  }
  function bannerGradient(id) {
    const map = {
      "ban-city": "linear-gradient(90deg,#1e1b4b,#7c3aed,#22d3ee)", "ban-peaks": "linear-gradient(90deg,#0f766e,#0ea5e9,#1e3a8a)",
      "ban-sunset": "linear-gradient(90deg,#f97316,#f43f5e,#7c3aed)", "ban-matrix": "linear-gradient(90deg,#052e16,#16a34a,#052e16)",
      "ban-royal": "linear-gradient(90deg,#b45309,#fbbf24,#b45309)",
    };
    return map[id] || "linear-gradient(120deg,var(--accent),var(--accent-2))";
  }
  function effectClass(id) {
    return { "fx-sparkle": "sparkle", "fx-matrix": "matrix", "fx-aurora": "aurora", "fx-galaxy": "galaxy", "fx-lightning": "lightning",
      "ov-grid": "grid", "ov-scanline": "scanline", "ov-holo": "holo", "ov-circuit": "circuit" }[id] || "";
  }
  function frameShadow(id) {
    return { "frame-gold": "0 0 0 3px #fbbf24, 0 0 18px rgba(251,191,36,.7)",
      "frame-neon": "0 0 0 3px #22d3ee, 0 0 22px rgba(34,211,238,.8)",
      "frame-royal": "0 0 0 3px #a855f7, 0 0 26px rgba(168,85,247,.85)" }[id] || "none";
  }

  // ================================================================ onboarding
  const ONBOARD_STEPS = [
    { key: "goal", q: "What do you want to build?", helper: "Mochi tailors lessons and projects around this.", options: [
      { v: "Bots & automation", i: "robot", d: "Discord bots, scrapers, scripts" },
      { v: "Websites & apps", i: "globe", d: "Front ends and full-stack apps" },
      { v: "Games & engines", i: "gamepad", d: "C++ and real-time graphics" },
      { v: "Servers & backends", i: "server", d: "APIs, databases, cloud" },
      { v: "Data & AI", i: "chart", d: "Analysis, ML and pipelines" },
      { v: "Just curious", i: "sparkle", d: "I want to see what coding is" },
    ]},
    { key: "experience", q: "How much coding have you done?", helper: "No judgement. This sets your starting pace.", options: [
      { v: "Never written code", i: "heart", d: "Total beginner" },
      { v: "A little", i: "heart", d: "I have tried tutorials" },
      { v: "Comfortable", i: "heart", d: "I can build small things" },
      { v: "Experienced", i: "star", d: "I want the deep end" },
    ]},
    { key: "languages", q: "Which languages excite you most?", helper: "Pick as many as you like. You can add more later.", multi: true, options: [
      { v: "python", i: "code" }, { v: "cpp", i: "settings" }, { v: "javascript", i: "bolt" },
      { v: "typescript", i: "code" }, { v: "java", i: "server" }, { v: "csharp", i: "target" },
      { v: "go", i: "heartbeat" }, { v: "rust", i: "settings" }, { v: "sql", i: "db" },
      { v: "bash", i: "server" }, { v: "htmlcss", i: "palette" },
    ]},
    { key: "hours", q: "How long are you willing to invest?", helper: "Mochi will build a realistic plan around it.", options: [
      { v: "5 minutes a day", i: "server", d: "Casual and steady" },
      { v: "15 minutes a day", i: "timer", d: "The sweet spot" },
      { v: "30 minutes a day", i: "clock", d: "Serious progress" },
      { v: "1 hour or more", i: "rocket", d: "I want to go fast" },
    ]},
    { key: "motivation", q: "Why are you learning to code?", helper: "This shapes the tone of Mochi's coaching.", options: [
      { v: "A career", i: "bag", d: "Get hired as a developer" },
      { v: "A personal project", i: "settings", d: "I have something to build" },
      { v: "School or university", i: "cap", d: "For my studies" },
      { v: "Pure fun", i: "sparkle", d: "It looks like a good time" },
    ]},
  ];

  function initOnboarding() {
    state.onboarding = { index: 0, answers: {} };
    $("#onboard-back").addEventListener("click", () => {
      if (state.onboarding.index > 0) { state.onboarding.index--; renderOnboardStep(); }
    });
    $("#onboard-next").addEventListener("click", async () => {
      const steps = ONBOARD_STEPS;
      if (state.onboarding.index < steps.length - 1) {
        state.onboarding.index++;
        renderOnboardStep();
      } else {
        await finishOnboarding();
      }
    });
    renderOnboardStep();
  }

  function hasAnswer(step) {
    const v = state.onboarding.answers[step.key];
    if (step.multi) return Array.isArray(v) && v.length > 0;
    return !!v;
  }

  function renderOnboardStep() {
    const steps = ONBOARD_STEPS;
    const step = steps[state.onboarding.index];
    $("#onboard-kicker").textContent = "Question " + (state.onboarding.index + 1) + " of " + steps.length;
    $("#onboard-question").textContent = step.q;
    $("#onboard-helper").textContent = step.helper || "";
    $("#onboard-progress").style.width = (state.onboarding.index / steps.length) * 100 + "%";

    const box = $("#onboard-options");
    box.innerHTML = "";
    const current = state.onboarding.answers[step.key];
    const group = "onboard-" + step.key;

    step.options.forEach((opt) => {
      const label = el("label", "option");
      const selected = step.multi ? (current || []).includes(opt.v) : current === opt.v;
      if (selected) label.classList.add("selected");

      // A real radio (single choice) or checkbox (multi choice) control.
      const input = document.createElement("input");
      input.type = step.multi ? "checkbox" : "radio";
      input.name = group;
      input.value = opt.v;
      input.checked = selected;
      input.addEventListener("change", () => {
        if (step.multi) {
          const arr = state.onboarding.answers[step.key] || [];
          const i = arr.indexOf(opt.v);
          if (input.checked && i < 0) arr.push(opt.v);
          if (!input.checked && i >= 0) arr.splice(i, 1);
          state.onboarding.answers[step.key] = arr;
        } else {
          state.onboarding.answers[step.key] = opt.v;
        }
        // Reflect selection styling and enable the Next button.
        Array.from(box.children).forEach((child) => {
          const cb = child.querySelector("input");
          child.classList.toggle("selected", cb && cb.checked);
        });
        $("#onboard-next").disabled = !hasAnswer(step);
      });

      label.appendChild(input);
      const body = document.createElement("span");
      body.innerHTML = '<span class="o-icon">' + ic(opt.i, 22) + '</span><span>' +
        '<span class="o-label">' + escapeHtml(opt.v) + "</span>" +
        (opt.d ? '<span class="o-desc"> · ' + escapeHtml(opt.d) + "</span>" : "") + "</span>";
      label.appendChild(body);
      box.appendChild(label);
    });

    $("#onboard-back").style.visibility = state.onboarding.index === 0 ? "hidden" : "visible";
    $("#onboard-next").disabled = !hasAnswer(step);
    $("#onboard-next").textContent = state.onboarding.index === steps.length - 1 ? "Start learning" : "Next";
    state.onboardBot && state.onboardBot.setState("thinking");
  }

  async function finishOnboarding() {
    const a = state.onboarding.answers;
    try {
      const r = await api("/onboarding", { method: "POST", body: {
        goal: a.goal || "", experience: a.experience || "",
        languages: a.languages || [], hours: a.hours || "", motivation: a.motivation || "",
      }});
      celebrate(r.newAchievements);
      $("#onboarding").classList.add("hidden");
      $("#app").classList.remove("hidden");
      $("#bot-dock").classList.remove("hidden");
      state.me = await api("/me");
      refreshHud();
      toast("sparkle", "Welcome to ChimCode!", "+50 Books for finishing setup.", "good");
      go("learn");
    } catch (e) { toast("alert", "Could not save", e.message, "bad"); }
  }

  // ================================================================ bootstrap
  function wireAuth() {
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
        $("#form-login").classList.toggle("hidden", tab.dataset.tab !== "login");
        $("#form-register").classList.toggle("hidden", tab.dataset.tab !== "register");
        $("#gate-error").textContent = "";
      });
    });
    $("#form-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const r = await api("/auth/login", { method: "POST", body: { username: f.username.value, password: f.password.value } });
        afterAuth(r.token);
      } catch (err) { $("#gate-error").textContent = err.message; }
    });
    $("#form-register").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const r = await api("/auth/register", { method: "POST", body: { username: f.username.value, email: f.email.value, password: f.password.value } });
        afterAuth(r.token);
      } catch (err) { $("#gate-error").textContent = err.message; }
    });
  }

  async function afterAuth(token) {
    state.token = token;
    try { localStorage.setItem("chimcode_token", token); } catch (e) { /* ignore */ }
    try {
      state.me = await api("/me");
      await enterApp();
    } catch (e) {
      state.token = "";
      try { localStorage.removeItem("chimcode_token"); } catch (err) { /* ignore */ }
      $("#gate-error").textContent = "Session could not be started.";
    }
  }

  async function enterApp() {
    refreshHud();
    const ob = await api("/onboarding");
    // The offline/server badge is a pre-login hint only. Once inside the app
    // it disappears so it never lingers over the UI.
    const badge = $("#mode-badge");
    if (badge) badge.classList.add("hidden");
    if (!ob.completed) {
      $("#gate").classList.add("hidden");
      $("#onboarding").classList.remove("hidden");
      initOnboarding();
    } else {
      $("#gate").classList.add("hidden");
      $("#app").classList.remove("hidden");
      $("#bot-dock").classList.remove("hidden");
      go("learn");
    }
  }

  async function boot() {
    hydrateIcons(document);

    // Run the cinematic intro while we figure out where the user should land.
    let destination = null;
    await window.ChimIntro.run({
      work: async () => {
        try { await window.ChimAPI.boot(); } catch (e) { /* local always works */ }
        // Decide the destination during the animation so there is no flash
        // of the login screen for someone who is already signed in.
        try {
          state.me = await api("/me");
          destination = "app";
        } catch (e) {
          state.me = null;
          destination = "gate";
        }
      },
      destination: () => {
        if (destination === "app") {
          enterApp().catch(showGate);
        } else {
          wireAuthOnce();
          showGate();
        }
      },
    });

    wireAuthOnce();
    setIntervalIfNeeded();
  }

  let authWired = false;
  function wireAuthOnce() {
    if (authWired) return;
    authWired = true;
    wireAuth();
    $$(".nav-link").forEach((b) => b.addEventListener("click", () => go(b.dataset.route)));
    $("#hud-avatar").addEventListener("click", () => go("profile"));
    $("#nav-toggle").addEventListener("click", () => $("#topnav").classList.toggle("open"));
    state.bot = new Mochi($("#bot-stage-gate"), 150);
    state.onboardBot = new Mochi($("#bot-stage-onboard"), 240);
    initBotDock();
    showModeBadge();
    api("/health").then((h) => {
      $("#stat-ach").textContent = h.achievements;
      $("#stat-langs").textContent = h.languages;
      $("#stat-lessons").textContent = h.lessons;
    }).catch(() => {});
  }

  let heartbeatStarted = false;
  function setIntervalIfNeeded() {
    if (heartbeatStarted) return;
    heartbeatStarted = true;
    if (window.ChimAPI.mode === "server") {
      setInterval(() => { if (state.token) api("/heartbeat", { method: "POST" }).catch(() => {}); }, 40000);
    }
  }

  function showGate() {
    $("#gate").classList.remove("hidden");
    $("#onboarding").classList.add("hidden");
    $("#app").classList.add("hidden");
  }

  function showModeBadge() {
    const badge = $("#mode-badge");
    const fineprint = $("#gate-fineprint");
    if (window.ChimAPI.mode === "local") {
      if (badge) {
        badge.innerHTML = ic("check",14) + "Ready offline — no server needed";
        badge.classList.add("mode-local");
        badge.classList.remove("hidden");
      }
      if (fineprint) fineprint.textContent = "Everything saves on this device. No server, no sign-up fees, no internet required.";
    } else {
      if (badge) {
        badge.innerHTML = ic("globe",14) + "Connected to server";
        badge.classList.add("mode-server");
        badge.classList.remove("hidden");
      }
      if (fineprint) fineprint.textContent = "Connected to a ChimCode server, so your account works across devices.";
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
