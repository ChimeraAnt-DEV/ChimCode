/* ============================================================
   ChimCode local backend.

   Implements the whole API in the browser so the app needs no
   server at all. Progress, achievements, cosmetics and the
   account are persisted in localStorage. The shared curriculum,
   achievement and shop data come from window.CHIMDATA (generated
   from the Python source of truth).
   ============================================================ */
(function () {
  const KEY = "chimcode_local_v1";
  const D = window.CHIMDATA;
  const E = window.ChimEngine;

  // ------------------------------------------------------------- catalogue
  const LANG_INDEX = {};
  const LESSON_INDEX = {};
  D.languages.forEach((lang) => {
    LANG_INDEX[lang.id] = lang;
    lang.lessons.forEach((l) => { LESSON_INDEX[l.id] = l; });
  });
  const ACH_INDEX = {};
  D.achievements.forEach((a) => { ACH_INDEX[a.id] = a; });
  const ITEM_INDEX = {};
  D.shop.items.forEach((i) => { ITEM_INDEX[i.id] = i; });
  const CATEGORY_META = D.achCategoryMeta;

  const ACH_ACHIEVEMENTS = {
    xp: "xp", books_earned: "books_earned", books_spent: "books_spent",
    lessons_completed: "lessons_completed", perfect_scores: "perfect_scores",
    minutes: "minutes", languages_started: "languages_started",
    challenges_completed: "challenges_completed", quiz_correct: "quiz_correct",
    hints_used: "hints_used", bot_helps: "bot_helps", super_days: "super_days",
    super_minutes: "super_minutes", cosmetics_owned: "cosmetics_owned",
    friends: "friends", followers: "followers", following: "following",
    profile_edits: "profile_edits", night_sessions: "night_sessions",
    morning_sessions: "morning_sessions", no_hint_lessons: "no_hint_lessons",
    streak: "streak", achievements_earned: "achievements_earned", is_public: "is_public",
  };

  // ------------------------------------------------------------- state
  function blank() {
    return {
      user: null,
      progress: {},
      achievements: {},
      inventory: [],
      equipped: {},
      stats: {},
      superUntil: 0,
      activity: [],
      friends: [],
      following: [],
      onboarded: false,
      onboarding: null,
      lastDay: "",
      streakDay: null,
      activeDays: [],
    };
  }

  let S = blank();

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full/blocked */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) S = Object.assign(blank(), JSON.parse(raw));
    } catch (e) { S = blank(); }
  }

  // ------------------------------------------------------------- seeded community
  const NOW = Math.floor(Date.now() / 1000);
  const SEED = [
    { username: "nova_dev", pfp: "ava-void", pfpColor: "#6d28d9", xp: 48200, streak: 61, achievements: 289, online: true, bio: "Rust + Go. Building servers that never sleep.", followers: 214 },
    { username: "pixel_ada", pfp: "ava-prism", pfpColor: "#f472b6", xp: 41100, streak: 44, achievements: 251, online: true, bio: "First programmer energy. Python main.", followers: 188 },
    { username: "byte_forge", pfp: "ava-flame", pfpColor: "#f97316", xp: 35600, streak: 30, achievements: 234, online: false, bio: "C++ and game engines.", followers: 141 },
    { username: "mochi_fan", pfp: "chim-01", pfpColor: "#7c5cff", xp: 29800, streak: 22, achievements: 198, online: true, bio: "Super Day enjoyer.", followers: 97 },
    { username: "sql_sage", pfp: "ava-neon", pfpColor: "#22d3ee", xp: 24300, streak: 18, achievements: 176, online: false, bio: "Data woman. Ask me about JOINs.", followers: 76 },
    { username: "kernel_kai", pfp: "ava-dragon", pfpColor: "#16a34a", xp: 19750, streak: 12, achievements: 154, online: true, bio: "Bash automation all day.", followers: 64 },
    { username: "web_wren", pfp: "ava-astro", pfpColor: "#0ea5e9", xp: 15200, streak: 9, achievements: 132, online: false, bio: "HTML/CSS and JS animation.", followers: 53 },
    { username: "bot_builder", pfp: "ava-crown", pfpColor: "#fbbf24", xp: 11400, streak: 7, achievements: 108, online: true, bio: "Building Discord bots.", followers: 41 },
  ];

  const SEED_ACTIVITY = [
    { username: "nova_dev", pfp: "ava-void", kind: "lesson", detail: "completed Rust Unsafe Bindings", ago: 240 },
    { username: "pixel_ada", pfp: "ava-prism", kind: "challenge", detail: "beat the challenge for Async programming", ago: 900 },
    { username: "mochi_fan", pfp: "chim-01", kind: "superday", detail: "activated a Super Day", ago: 1800 },
    { username: "sql_sage", pfp: "ava-neon", kind: "lesson", detail: "completed Joins and aggregation", ago: 3600 },
    { username: "kernel_kai", pfp: "ava-dragon", kind: "achievement", detail: "earned 30 day streak", ago: 7200 },
    { username: "web_wren", pfp: "ava-astro", kind: "lesson", detail: "completed Animations and transitions", ago: 10800 },
  ];

  function seedUser(u) {
    return {
      id: "seed:" + u.username, username: u.username, pfp: u.pfp, pfpColor: u.pfpColor,
      bio: u.bio, xp: u.xp, streak: u.streak, achievements: u.achievements, online: u.online,
      followers: u.followers, public: true, superActive: false, equipped: {}, seed: true,
    };
  }

  // ------------------------------------------------------------- helpers
  function uid() { return Math.random().toString(36).slice(2, 10); }

  function dayKey(ts) {
    const d = new Date((ts || Date.now()) * 1000);
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }

  function dayIndex(ts) {
    const d = new Date((ts || Date.now()) * 1000);
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  }

  // The streak advances once per calendar day, when the user shows up — not
  // per lesson. Missing a full day resets it to 1.
  function checkDailyStreak() {
    if (!S.user) return { advanced: false, streak: 0 };
    const today = dayIndex();
    const last = S.streakDay;
    let advanced = false;
    if (last === undefined || last === null) {
      S.streakDay = today;
      if (!S.user.streak) S.user.streak = 1;
    } else if (today === last) {
      // already counted today
    } else if (today === last + 1) {
      S.user.streak = (S.user.streak || 0) + 1;
      S.streakDay = today;
      advanced = true;
    } else {
      S.user.streak = 1;
      S.streakDay = today;
      advanced = true;
    }
    // Track distinct active days for the "days active" achievements.
    S.activeDays = S.activeDays || [];
    const key = dayKey();
    if (S.activeDays.indexOf(key) < 0) S.activeDays.push(key);
    persist();
    return { advanced, streak: S.user.streak };
  }

  function bump(key, amount) {
    S.stats[key] = (S.stats[key] || 0) + (amount === undefined ? 1 : amount);
  }

  function addBooks(n) {
    S.user.books += n;
    if (n > 0) bump("books_earned", n);
    else if (n < 0) bump("books_spent", -n);
  }

  function logActivity(kind, detail) {
    S.activity.unshift({ kind, detail, created_at: Math.floor(Date.now() / 1000) });
    S.activity = S.activity.slice(0, 40);
  }

  function equippedFor() {
    const eq = Object.assign({}, S.equipped);
    D.storeSlots.forEach((slot) => {
      if (!eq[slot]) eq[slot] = D.starterItems.find((id) => ITEM_INDEX[id] && ITEM_INDEX[id].slot === slot) || "";
    });
    return eq;
  }

  function publicMe() {
    return {
      id: "me", username: S.user.username, pfp: S.user.pfp, pfpColor: S.user.pfpColor,
      bio: S.user.bio, books: S.user.books, xp: S.user.xp, streak: S.user.streak,
      achievements: Object.keys(S.achievements).length, online: true, public: S.user.public,
      superUntil: S.superUntil, superActive: S.superUntil > Math.floor(Date.now() / 1000),
      equipped: equippedFor(), joined: S.user.createdAt,
    };
  }

  // ------------------------------------------------------------- achievements
  function perLang() {
    const out = {};
    Object.keys(S.progress).forEach((id) => {
      const p = S.progress[id];
      if (p.status === "completed" || p.status === "challenged") {
        out[p.language] = (out[p.language] || 0) + 1;
      }
    });
    return out;
  }

  function perLangLevel() {
    const out = {};
    Object.keys(S.progress).forEach((id) => {
      const p = S.progress[id];
      if (p.status !== "completed" && p.status !== "challenged") return;
      const lesson = LESSON_INDEX[id];
      if (!lesson) return;
      const key = lesson.language + ":" + lesson.level;
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }

  // Per-language tallies for a specific kind of achievement: aces,
  // challenges cleared, fully mastered lessons, and hint-free finishes.
  function perLangStat(kind) {
    const out = {};
    Object.keys(S.progress).forEach((id) => {
      const p = S.progress[id];
      if (p.status !== "completed" && p.status !== "challenged") return;
      const lang = p.language;
      const aced = p.best_score >= 100;
      const challenged = p.status === "challenged";
      if (kind === "aces" && aced) out[lang] = (out[lang] || 0) + 1;
      if (kind === "challenges" && challenged) out[lang] = (out[lang] || 0) + 1;
      if (kind === "mastered" && aced && challenged) out[lang] = (out[lang] || 0) + 1;
      if (kind === "nohints" && p.no_hints) out[lang] = (out[lang] || 0) + 1;
    });
    return out;
  }

  // Per language+level tallies for the "ace every beginner Python lesson"
  // style achievements.
  function perLevelStat(kind) {
    const out = {};
    Object.keys(S.progress).forEach((id) => {
      const p = S.progress[id];
      if (p.status !== "completed" && p.status !== "challenged") return;
      const lesson = LESSON_INDEX[id];
      if (!lesson) return;
      const key = lesson.language + ":" + lesson.level;
      if (kind === "aces" && p.best_score >= 100) out[key] = (out[key] || 0) + 1;
      if (kind === "challenges" && p.status === "challenged") out[key] = (out[key] || 0) + 1;
    });
    return out;
  }

  function derivedStats() {
    const completed = Object.values(S.progress).filter((p) => p.status === "completed" || p.status === "challenged");
    const perfect = completed.filter((p) => p.best_score >= 100).length;
    const minutes = completed.reduce((sum, p) => sum + ((LESSON_INDEX[p.lesson_id] && LESSON_INDEX[p.lesson_id].minutes) || 0), 0);
    const langs = new Set(Object.keys(S.progress).map((id) => S.progress[id].language));
    const challenges = Object.values(S.progress).filter((p) => p.status === "challenged").length;
    const base = Object.assign({}, S.stats);
    base.lessons_completed = completed.length;
    base.perfect_scores = perfect;
    base.minutes = minutes;
    base.languages_started = langs.size;
    base.challenges_completed = challenges;
    base.cosmetics_owned = S.inventory.length;
    base.followers = 0;
    base.following = S.following.length;
    base.friends = S.friends.length;
    base.achievements_earned = Object.keys(S.achievements).length;
    base.streak = S.user ? S.user.streak : 0;
    base.xp = S.user ? S.user.xp : 0;
    base.is_public = S.user && S.user.public ? 1 : 0;
    return base;
  }

  function metric(metricName, scope, stats) {
    if (metricName === "completed_lesson") {
      const p = S.progress[scope];
      return p && (p.status === "completed" || p.status === "challenged") ? 1 : 0;
    }
    if (metricName === "aced_lesson") {
      const p = S.progress[scope];
      return p && p.best_score >= 100 ? 1 : 0;
    }
    if (metricName === "challenged_lesson") {
      const p = S.progress[scope];
      return p && p.status === "challenged" ? 1 : 0;
    }
    if (metricName === "no_hint_lesson") {
      const p = S.progress[scope];
      return p && p.no_hints ? 1 : 0;
    }
    if (metricName === "mastered_lesson") {
      const p = S.progress[scope];
      return p && p.best_score >= 100 && p.status === "challenged" ? 1 : 0;
    }
    if (metricName === "first_try_lesson") {
      const p = S.progress[scope];
      return p && p.attempts === 1 && p.best_score > 0 ? 1 : 0;
    }
    if (metricName === "perfect_nohint_lesson") {
      const p = S.progress[scope];
      return p && p.best_score >= 100 && p.no_hints ? 1 : 0;
    }
    if (metricName === "lessons_in") return perLang()[scope] || 0;
    if (metricName === "aces_in") return perLangStat("aces")[scope] || 0;
    if (metricName === "challenges_in") return perLangStat("challenges")[scope] || 0;
    if (metricName === "mastered_in") return perLangStat("mastered")[scope] || 0;
    if (metricName === "nohint_in") return perLangStat("nohints")[scope] || 0;
    if (metricName === "lessons_in_level") return perLangLevel()[scope] || 0;
    if (metricName === "aces_in_level") return perLevelStat("aces")[scope] || 0;
    if (metricName === "challenges_in_level") return perLevelStat("challenges")[scope] || 0;
    if (metricName === "min_lessons_all_langs") {
      const pl = perLang();
      return Math.min.apply(null, Object.keys(LANG_INDEX).map((l) => pl[l] || 0));
    }
    if (metricName === "langs_with_ten") {
      const pl = perLang();
      return Object.keys(LANG_INDEX).filter((l) => (pl[l] || 0) >= 10).length;
    }
    if (metricName === "active_days") return (S.activeDays || []).length;
    return stats[metricName] || 0;
  }

  function evaluateAchievements() {
    const stats = derivedStats();
    const newly = [];
    D.achievements.forEach((a) => {
      if (S.achievements[a.id]) return;
      if (metric(a.metric, a.scope, stats) >= a.target) {
        S.achievements[a.id] = Math.floor(Date.now() / 1000);
        stats.achievements_earned = Object.keys(S.achievements).length;
        addBooks(Math.floor((D.rarityPoints[a.rarity] || 5) / 5));
        newly.push(a);
      }
    });
    return newly;
  }

  // ------------------------------------------------------------- routes
  function ok(v) { return v; }

  const handlers = {
    "GET /health": () => ({
      status: "ok", achievements: D.achievementTotal,
      languages: D.languages.length, lessons: Object.keys(LESSON_INDEX).length, local: true,
    }),
    "GET /catalogue": () => ({
      languages: D.languages.map((l) => ({
        id: l.id, name: l.name, tagline: l.tagline, icon: l.icon, color: l.color,
        blurb: l.blurb, lessonCount: l.lessons.length,
        levels: Array.from(new Set(l.lessons.map((x) => x.level))).sort(),
      })),
      achievementTotal: D.achievementTotal, achievementCategories: D.achievementCategories,
    }),
    "GET /me": () => { requireUser(); checkDailyStreak(); return publicMe(); },
    "POST /heartbeat": () => ({ online: true }),
    "POST /auth/register": (b) => {
      const username = String(b.username || "").trim();
      if (S.user) throw httpError(409, "An account already exists on this device.");
      S.user = { username, email: String(b.email || "").toLowerCase(), pfp: "chim-01", pfpColor: "#7c5cff", bio: "", public: true, books: 120, xp: 0, streak: 0, createdAt: Math.floor(Date.now() / 1000) };
      S.inventory = D.starterItems.slice();
      S.stats = { books_earned: 120 };
      persist();
      return { token: "local", username };
    },
    "POST /auth/login": (b) => {
      const username = String(b.username || "").trim();
      if (!S.user) {
        // No account on this device yet: treat the first login as account creation.
        S.user = { username, email: "", pfp: "chim-01", pfpColor: "#7c5cff", bio: "", public: true, books: 120, xp: 0, streak: 0, createdAt: Math.floor(Date.now() / 1000) };
        S.inventory = D.starterItems.slice();
        S.stats = { books_earned: 120 };
      }
      persist();
      return { token: "local", username: S.user.username };
    },
    "GET /onboarding": () => (S.onboarded ? Object.assign({ completed: true }, S.onboarding) : { completed: false }),
    "POST /onboarding": (b) => {
      S.onboarded = true;
      S.onboarding = { goal: b.goal, experience: b.experience, languages: b.languages || [], hours: b.hours, motivation: b.motivation };
      if (!S.stats.onboarded) { addBooks(50); S.user.xp += 30; bump("xp", 30); S.stats.onboarded = 1; }
      const newly = evaluateAchievements();
      persist();
      return { ok: true, books: 50, newAchievements: newly };
    },
    "GET /progress": () => ({
      progress: Object.keys(S.progress).map((id) => S.progress[id]),
      earned: Object.keys(S.achievements),
      stats: derivedStats(),
    }),
    "GET /achievements": () => ({
      total: D.achievementTotal,
      earned: Object.keys(S.achievements).length,
      categories: D.achievementCategories,
      achievements: D.achievements.map((a) => Object.assign({}, a, {
        earned: !!S.achievements[a.id], earnedAt: S.achievements[a.id] || null,
      })),
    }),
    "GET /shop": () => ({
      slots: D.slotNames, items: D.shop.items.map((i) => Object.assign({}, i, {
        owned: S.inventory.includes(i.id) || i.price === 0,
        equipped: equippedFor()[i.slot] === i.id,
      })),
      grouped: D.shop.grouped, owned: S.inventory.slice(), equipped: equippedFor(),
      books: S.user ? S.user.books : 0, superDayCost: D.config.superDayCost,
    }),
    "GET /leaderboard": () => {
      const me = requireUser() ? Object.assign(publicMe(), { rank: 0 }) : null;
      const all = SEED.map(seedUser).concat(me ? [me] : []);
      all.sort((a, b) => b.xp - a.xp);
      all.forEach((u, i) => { u.rank = i + 1; });
      return { leaders: all.slice(0, 25) };
    },
    "GET /users": () => {
      const me = requireUser();
      const mine = me ? { username: me.username } : null;
      const users = SEED.filter((s) => !mine || s.username !== mine.username).map((s) => {
        const u = seedUser(s);
        u.isFollowing = S.following.includes(s.username);
        u.isFriend = S.friends.includes(s.username);
        return u;
      });
      return { users };
    },
    "GET /feed": () => {
      const mine = S.activity.map((a) => Object.assign(a, { username: S.user ? S.user.username : "you", pfp: S.user ? S.user.pfp : "chim-01" }));
      const seeded = SEED_ACTIVITY.map((s) => Object.assign({}, s, { created_at: NOW - s.ago }));
      const all = mine.concat(seeded).sort((a, b) => b.created_at - a.created_at).slice(0, 40);
      return { feed: all };
    },
  };

  function httpError(status, detail) {
    const e = new Error(detail);
    e.status = status;
    return e;
  }

  function requireUser() {
    if (!S.user) throw httpError(401, "Not authenticated");
    return S.user;
  }

  // ------------------------------------------------------------- learning
  function normalise(code) {
    return String(code || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  }

  function submitLesson(b, isChallenge) {
    requireUser();
    const lesson = LESSON_INDEX[b.lesson_id];
    if (!lesson) throw httpError(404, "Unknown lesson");
    const code = b.code || "";
    const report = E.grade(lesson, code);
    const today = dayKey();

    const prev = S.progress[lesson.id] || {};
    const best = Math.max(report.score, prev.best_score || 0);
    const status = report.passed ? (isChallenge ? "challenged" : "completed") : prev.status || "in_progress";

    // One reward per lesson per track. Re-running an already-paid lesson is
    // free practice and pays nothing, so it cannot be farmed for Books.
    const paid = !!prev.challenge_paid;
    const lessonPaid = !!prev.lesson_paid;

    // A challenge must be a real attempt: not empty, not the starter
    // scaffolding, and different from the worked example.
    let challengeValid = true;
    if (isChallenge) {
      const norm = normalise(code);
      const starterNorm = normalise(lesson.challengeStarter || "");
      const exampleNorm = normalise(lesson.example || "");
      const starterNorm2 = normalise(lesson.starter || "");
      challengeValid = norm.length > 0 && norm !== starterNorm && norm !== exampleNorm && norm !== starterNorm2;
    }

    S.progress[lesson.id] = {
      lesson_id: lesson.id, language: lesson.language, status,
      best_score: best, updated_at: Math.floor(Date.now() / 1000),
      lesson_paid: lessonPaid || (report.passed && !isChallenge && challengeValid),
      challenge_paid: paid || (report.passed && isChallenge && challengeValid),
      no_hints: (prev.no_hints ? 1 : 0) || (report.passed && !b.hints_used ? 1 : 0),
      attempts: (prev.attempts || 0) + 1,
    };

    if (b.hints_used) bump("hints_used", b.hints_used); else bump("no_hint_lessons");
    if (b.quiz_correct) bump("quiz_correct", b.quiz_correct);
    const hour = new Date().getHours();
    if (hour < 5) bump("night_sessions"); else if (hour < 7) bump("morning_sessions");

    const reward = { books: 0, xp: 0, repeated: false, needsChange: false, newAchievements: [] };
    if (report.passed) {
      if (isChallenge) {
        if (!challengeValid) {
          reward.needsChange = true;
        } else if (!paid) {
          reward.books = 45;
          reward.xp = 120;
          addBooks(45);
          S.user.xp += 120;
          bump("xp", 120);
          logActivity("challenge", "beat the challenge for " + lesson.title);
        } else {
          reward.repeated = true;
        }
      } else if (!lessonPaid) {
        reward.books = 20 + lesson.minutes;
        reward.xp = 50 + lesson.minutes * 5;
        addBooks(reward.books);
        S.user.xp += reward.xp;
        bump("xp", reward.xp);
        if (report.score >= 100) bump("perfect_scores");
        logActivity("lesson", "completed " + lesson.title);
      } else {
        reward.repeated = true;
      }
    }
    reward.newAchievements = evaluateAchievements();
    persist();
    return Object.assign(report, { rewards: reward, newAchievements: reward.newAchievements });
  }

  function dynamic(path, method, body) {
    let m;
    if ((m = path.match(/^\/languages\/(.+)$/))) {
      const lang = LANG_INDEX[m[1]];
      if (!lang) throw httpError(404, "Unknown language");
      return lang;
    }
    if ((m = path.match(/^\/lessons\/(.+)$/))) {
      const lesson = LESSON_INDEX[m[1]];
      if (!lesson) throw httpError(404, "Unknown lesson");
      const data = JSON.parse(JSON.stringify(lesson));
      const p = S.progress[lesson.id];
      const superActive = S.superUntil > Math.floor(Date.now() / 1000);
      data.progress = p ? { status: p.status, bestScore: p.best_score } : null;
      data.superDay = superActive;
      if (superActive) data.superPlan = E.superdayPlan(lesson);
      return data;
    }
    if (method === "POST" && path === "/analyze") {
      const lesson = LESSON_INDEX[body.lesson_id];
      if (!lesson) throw httpError(404, "Unknown lesson");
      return E.grade(lesson, body.code || "");
    }
    if (method === "POST" && path === "/submit") return submitLesson(body, false);
    if (method === "POST" && path === "/challenge") return submitLesson(body, true);
    if (method === "POST" && path === "/quiz") {
      const lesson = LESSON_INDEX[body.lesson_id];
      if (!lesson || !lesson.quiz) throw httpError(404, "No quiz for this lesson");
      const correct = body.option === lesson.quiz.answer;
      if (correct) { bump("quiz_correct"); addBooks(5); S.user.xp += 15; bump("xp", 15); }
      const newly = evaluateAchievements();
      persist();
      return { correct, answer: lesson.quiz.answer, explanation: lesson.quiz.explanation, newAchievements: newly };
    }
    if (method === "POST" && path === "/bot/help") {
      requireUser();
      const lesson = LESSON_INDEX[body.lesson_id];
      if (!lesson) throw httpError(404, "Unknown lesson");
      bump("bot_helps");
      const newly = evaluateAchievements();
      const reply = E.botExplain(lesson, body.code || "", body.question || "");
      reply.newAchievements = newly;
      persist();
      return reply;
    }
    if (method === "GET" && (m = path.match(/^\/bot\/walkthrough\/(.+)$/))) {
      const lesson = LESSON_INDEX[m[1]];
      if (!lesson) throw httpError(404, "Unknown lesson");
      return E.walkthrough(lesson);
    }
    if (method === "POST" && path === "/superday/buy") {
      requireUser();
      const nowSec = Math.floor(Date.now() / 1000);
      if (S.superUntil > nowSec) return { active: true, until: S.superUntil, message: "A Super Day is already running." };
      if (S.user.books < D.config.superDayCost) throw httpError(400, `Super Days cost ${D.config.superDayCost} Books.`);
      S.user.books -= D.config.superDayCost;
      bump("books_spent", D.config.superDayCost);
      bump("super_days");
      S.superUntil = nowSec + 86400;
      logActivity("superday", "activated a Super Day");
      const newly = evaluateAchievements();
      persist();
      return { active: true, until: S.superUntil, newAchievements: newly };
    }
    if (method === "POST" && path === "/superday/log") {
      bump("super_minutes", Number(body.minutes || 0));
      const newly = evaluateAchievements();
      persist();
      return { newAchievements: newly };
    }
    if (method === "POST" && (m = path.match(/^\/shop\/buy\/(.+)$/))) {
      requireUser();
      const item = ITEM_INDEX[m[1]];
      if (!item) throw httpError(404, "Unknown item");
      if (S.inventory.includes(item.id) || item.price === 0) {
        if (!S.inventory.includes(item.id)) S.inventory.push(item.id);
        persist();
        return { owned: true, message: "Already yours." };
      }
      if (S.user.books < item.price) throw httpError(400, "Not enough Books.");
      addBooks(-item.price);
      S.inventory.push(item.id);
      const newly = evaluateAchievements();
      persist();
      return { owned: true, books: S.user.books, newAchievements: newly };
    }
    if (method === "POST" && (m = path.match(/^\/shop\/equip\/(.+)$/))) {
      const item = ITEM_INDEX[m[1]];
      if (!item) throw httpError(404, "Unknown item");
      if (!S.inventory.includes(item.id) && item.price > 0) throw httpError(403, "You do not own this item.");
      S.equipped[item.slot] = item.id;
      persist();
      return { equipped: { [item.slot]: item.id } };
    }
    if (method === "POST" && (m = path.match(/^\/shop\/unequip\/(.+)$/))) {
      delete S.equipped[m[1]];
      persist();
      return { ok: true };
    }
    if (method === "POST" && path === "/profile") {
      requireUser();
      if (body.pfp != null) S.user.pfp = body.pfp;
      if (body.pfp_color != null) S.user.pfpColor = body.pfp_color;
      if (body.bio != null) S.user.bio = String(body.bio).slice(0, 280);
      if (body.is_public != null) S.user.public = !!body.is_public;
      bump("profile_edits");
      const newly = evaluateAchievements();
      persist();
      return Object.assign(publicMe(), { newAchievements: newly });
    }
    if (method === "POST" && path === "/username") {
      requireUser();
      const name = String(body.username || "").trim();
      if (name.length < 3 || name.length > 20 || !/^[A-Za-z0-9_]+$/.test(name)) {
        throw httpError(400, "Usernames are 3-20 letters, numbers or underscores.");
      }
      S.user.username = name;
      persist();
      return Object.assign(publicMe(), { token: "local" });
    }
    if (method === "POST" && (m = path.match(/^\/follow\/(.+)$/))) {
      requireUser();
      const name = decodeURIComponent(m[1]);
      const i = S.following.indexOf(name);
      if (i >= 0) S.following.splice(i, 1); else S.following.push(name);
      evaluateAchievements();
      persist();
      return { following: i < 0 };
    }
    if (method === "POST" && (m = path.match(/^\/friends\/(.+)$/))) {
      requireUser();
      const name = decodeURIComponent(m[1]);
      const i = S.friends.indexOf(name);
      if (i >= 0) S.friends.splice(i, 1); else S.friends.push(name);
      evaluateAchievements();
      persist();
      return { friends: i < 0 };
    }
    if (method === "GET" && (m = path.match(/^\/users\/(.+)$/))) {
      const name = decodeURIComponent(m[1]);
      if (S.user && name === S.user.username) {
        return Object.assign(publicMe(), {
          achievementList: Object.keys(S.achievements).map((id) => Object.assign({}, ACH_INDEX[id], { earnedAt: S.achievements[id] })).filter(Boolean),
          progress: Object.keys(S.progress).map((id) => S.progress[id]),
          followers: 0,
          following: S.following.length,
        });
      }
      const seed = SEED.find((s) => s.username === name);
      if (!seed) throw httpError(404, "User not found");
      const u = seedUser(seed);
      const sample = D.achievements.slice(0, Math.min(12, seed.achievements));
      return Object.assign(u, {
        achievementList: sample, progress: [],
        isFollowing: S.following.includes(name), isFriend: S.friends.includes(name),
        following: Math.round(seed.followers * 0.6),
      });
    }
    throw httpError(404, "Not found: " + method + " " + path);
  }

  // ------------------------------------------------------------- public API
  window.ChimLocal = {
    init() { load(); return true; },
    reset() { S = blank(); persist(); },
    hasAccount() { return !!S.user; },
    dailyStreak() { requireUser(); return checkDailyStreak(); },
    call(path, method, body) {
      const m = (method || "GET").toUpperCase();
      const key = m + " " + path;
      if (handlers[key]) return Promise.resolve(ok(handlers[key](body || {})));
      try {
        return Promise.resolve(ok(dynamic(path, m, body || {})));
      } catch (e) {
        return Promise.reject(e);
      }
    },
    // Used by the UI so local mode never blocks on a socket.
    isLocal: true,
  };
})();
