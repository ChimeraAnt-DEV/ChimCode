// Headless test of the local-first backend (no browser, no server).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const FE = path.join(__dirname, "..", "frontend");
const store = {};
const sandbox = {
  console,
  window: {},
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  fetch: () => Promise.reject(new Error("no network in local test")),
  setTimeout, clearTimeout, Promise, Date, Math, JSON, Object, Array, Set, RegExp, Number, String,
  URLSearchParams,
  location: { search: "" },
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);

for (const f of ["data/chimdata.js", "engine.js", "local.js", "api.js"]) {
  vm.runInContext(fs.readFileSync(path.join(FE, f), "utf8"), sandbox, { filename: f });
}

const API = sandbox.ChimAPI;
const L = sandbox.ChimLocal;

function call(p, m, b) { return L.call(p, m || "GET", b); }

(async () => {
  let failures = 0;
  const check = (name, cond, extra) => {
    if (!cond) { failures++; console.log("FAIL", name, extra || ""); }
    else console.log("ok  ", name);
  };

  await API.boot();
  check("API picks local mode", API.mode === "local");
  const health = await call("/health");
  check("health local", health.local === true && health.achievements > 700, JSON.stringify(health));

  const cat = await call("/catalogue");

  // ---- every lesson must ship a working reference solution ----
  let badSolutions = 0;
  let missingSolutions = 0;
  for (const lang of cat.languages.map((l) => l.id)) {
    const full = await call("/languages/" + lang);
    for (const lesson of full.lessons) {
      if (!lesson.solution) { missingSolutions += 1; continue; }
      const g = await call("/analyze", "POST", { lesson_id: lesson.id, code: lesson.solution });
      if (!g.passed) badSolutions += 1;
    }
  }
  check("every lesson has a solution", missingSolutions === 0, missingSolutions + " missing");
  check("every solution satisfies its checks", badSolutions === 0, badSolutions + " invalid");
  check("catalogue 16+ langs", cat.languages.length >= 16);
  check("catalogue 700+ achievements", cat.achievementTotal > 700);

  // fresh state -> /me must fail (no account yet) then register works
  let failedBefore = false;
  try { await call("/me"); } catch (e) { failedBefore = true; }
  check("no account before register", failedBefore);

  const reg = await call("/auth/register", "POST", { username: "tester", email: "t@e.com", password: "password123" });
  check("register returns token", reg.token === "local");
  const me = await call("/me");
  check("me after register", me.username === "tester" && me.books === 120, JSON.stringify({ u: me.username, b: me.books }));
  check("starter cosmetics", (await call("/shop")).owned.length >= 6);

  // onboarding
  const ob = await call("/onboarding", "POST", { goal: "Bots & automation", experience: "A little", languages: ["python"], hours: "15 minutes a day", motivation: "Pure fun" });
  check("onboarding completes", (await call("/onboarding")).completed === true);
  check("onboarding grants books", ob.books === 50);

  // lesson + analyze
  const lesson = await call("/lessons/py-hello");
  check("lesson loaded", lesson.title === "Your first program" && lesson.checks.length === 2);

  const bad = await call("/analyze", "POST", { lesson_id: "py-hello", code: 'prnt("hi' });
  const codes = bad.issues.map((i) => i.code);
  check("analyze finds typo", codes.includes("typo"));
  check("analyze finds unclosed string", codes.includes("unclosed-string"));
  check("analyze finds unclosed bracket", codes.includes("unclosed-bracket"));

  const good = await call("/submit", "POST", { lesson_id: "py-hello", code: 'print("Hello, ChimCode!")' });
  check("submit passes", good.passed === true && good.score === 100, JSON.stringify({ p: good.passed, s: good.score }));
  check("submit awards rewards", good.rewards.books === 26 && good.rewards.xp === 80, JSON.stringify(good.rewards));
  check("submit unlocked achievements", good.rewards.newAchievements.length > 0, good.rewards.newAchievements.length);

  // ghost text for an unmet requirement
  const partial = await call("/analyze", "POST", { lesson_id: "py-hello", code: 'print("wrong")' });
  check("ghost text produced", !!partial.ghost && !!partial.ghost.text, JSON.stringify(partial.ghost));

  // quiz
  const quiz = await call("/quiz", "POST", { lesson_id: "py-hello", option: 1 });
  check("quiz correct", quiz.correct === true);

  // bot help
  const bot = await call("/bot/help", "POST", { lesson_id: "py-hello", code: "prnt(1)" });
  check("bot explains", typeof bot.spoken === "string" && bot.spoken.length > 10 && bot.issues.length > 0);

  const wt = await call("/bot/walkthrough/py-bots");
  check("walkthrough narrated", wt.narration.length > 0 && !!wt.reference);

  // shop buy + equip
  const shop0 = await call("/shop");
  const buy = await call("/shop/buy/ava-neon", "POST");
  check("buy cosmetic", buy.owned === true && typeof buy.books === "number");
  const eq = await call("/shop/equip/ava-neon", "POST");
  check("equip cosmetic", eq.equipped.avatar === "ava-neon");
  const me2 = await call("/me");
  check("avatar equipped shows in profile", me2.equipped.avatar === "ava-neon");

    // ---- exploit regression: challenges cannot be farmed for Books ----
  // Lesson 1 challenge starter is not the answer; submitting it must be refused.
  const l1 = await call("/lessons/py-hello");
  const beforeExploit = (await call("/me")).books;
  const refused = await call("/challenge", "POST", { lesson_id: "py-hello", code: l1.challengeStarter });
  check("challenge rejects unchanged starter", refused.rewards.needsChange === true && refused.rewards.books === 0,
    JSON.stringify(refused.rewards));

  // A real, distinct solution pays out once.
  const realSolution = '# add a second line\nprint("Hello, ChimCode!")\nprint("Tester")';
  const firstChallenge = await call("/challenge", "POST", { lesson_id: "py-hello", code: realSolution });
  const afterFirst = (await call("/me")).books;
  check("challenge pays on first real solve", firstChallenge.rewards.books === 45 && afterFirst >= beforeExploit + 45,
    `reward ${firstChallenge.rewards.books}, books ${beforeExploit} -> ${afterFirst}`);

  // Re-submitting the identical solution many times must pay nothing more.
  let farmed = 0;
  for (let i = 0; i < 5; i++) {
    const again = await call("/challenge", "POST", { lesson_id: "py-hello", code: realSolution });
    farmed += again.rewards.books;
  }
  const afterFarm = (await call("/me")).books;
  check("challenge cannot be farmed", farmed === 0 && afterFarm === afterFirst, `farmed ${farmed}, books ${afterFarm}`);

  // Re-running a completed lesson must also pay nothing.
  const beforeRepeat = (await call("/me")).books;
  const repeat = await call("/submit", "POST", { lesson_id: "py-hello", code: 'print("Hello, ChimCode!")' });
  const afterRepeat = (await call("/me")).books;
  check("completed lesson re-run pays nothing", repeat.rewards.books === 0 && afterRepeat === beforeRepeat,
    `books ${beforeRepeat} -> ${afterRepeat}`);

  // super day (lower the bar not needed: 170 books >= 250? no) -> give books via lessons
  const before = (await call("/me")).books;
  let sdErr = null;
  try { await call("/superday/buy", "POST"); } catch (e) { sdErr = e; }
  if (before < 250) check("superday blocked without books", !!sdErr && sdErr.status === 400);
  // earn enough then buy
  for (const id of ["py-variables", "py-strings", "py-conditionals", "py-loops", "py-functions", "py-collections", "py-errors", "py-files", "py-classes", "py-modules"]) {
    const ls = await call("/lessons/" + id);
    await call("/submit", "POST", { lesson_id: id, code: ls.example });
  }
  const rich = await call("/me");
  const sd = await call("/superday/buy", "POST");
  check("superday activates when affordable", sd.active === true, "books=" + rich.books);
  const lessonSD = await call("/lessons/py-bots");
  check("superplan available", !!lessonSD.superPlan && lessonSD.superPlan.variations.length === 5);

  // profile + username
  const prof = await call("/profile", "POST", { bio: "hi", is_public: true, pfp: "ava-flame" });
  check("profile updates", prof.bio === "hi" && prof.pfp === "ava-flame");
  const un = await call("/username", "POST", { username: "tester2" });
  check("username changes", un.username === "tester2");
  const badUn = await call("/username", "POST", { username: "x" }).then(() => null).catch((e) => e);
  check("username validation", !!badUn && badUn.status === 400);

  // social
  const users = await call("/users");
  check("seeded community present", users.users.length >= 8);
  const f1 = await call("/follow/nova_dev", "POST");
  check("follow toggles on", f1.following === true);
  const fr1 = await call("/friends/nova_dev", "POST");
  check("friend toggles on", fr1.friends === true);
  const seeded = await call("/users/nova_dev");
  check("seeded profile viewable", seeded.username === "nova_dev" && seeded.achievementList.length > 0);
  const board = await call("/leaderboard");
  check("leaderboard ranks", board.leaders.length > 0 && board.leaders[0].rank === 1);
  const feed = await call("/feed");
  check("feed has items", feed.feed.length > 0);

  // achievements listing
  const ach = await call("/achievements");
  check("achievements 700+ total", ach.total > 700);
  check("achievements earned count", ach.earned > 0, ach.earned);

  // persistence across reload
  const saved = JSON.parse(store["chimcode_local_v1"]);
  check("persisted to storage", saved.user && saved.user.username === "tester2");
  check("progress persisted", Object.keys(saved.progress).length >= 6, Object.keys(saved.progress).length);

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL LOCAL FLOW TESTS PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("crash", e); process.exit(1); });
