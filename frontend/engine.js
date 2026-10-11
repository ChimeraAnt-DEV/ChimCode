/* ============================================================
   ChimCode local engine.
   JavaScript port of server/app/engine.py. Grades submissions,
   finds mistakes and produces Mochi's coaching — all offline.
   It never executes the learner's code.
   ============================================================ */
(function () {
  const C_LIKE = new Set(["cpp", "java", "csharp", "javascript", "typescript", "go", "rust"]);
  const SEMICOLON_LANGS = new Set(["cpp", "java", "csharp"]);
  const BRACKETS = { "(": ")", "[": "]", "{": "}" };
  const CLOSERS = { ")": "(", "]": "[", "}": "{" };

  const TYPO_MAP = {
    python: { prnt: "print", pritn: "print", pint: "print", retrun: "return", fro: "for", whlie: "while", elsif: "elif", improt: "import", slf: "self", nul: "None", ture: "True" },
    javascript: { cosole: "console", consol: "console", functon: "function", retrun: "return", lenght: "length", documnet: "document" },
    typescript: { cosole: "console", interfase: "interface", retrun: "return" },
    cpp: { retrun: "return", couts: "cout", stdnam: "std" },
    java: { Sytem: "System", pbulic: "public", retrun: "return", strng: "String" },
    csharp: { Cosole: "Console", pubic: "public", retrun: "return" },
    go: { fnt: "func", prnitln: "Println", pckage: "package" },
    rust: { fnc: "fn", pritnln: "println", mutt: "mut" },
    sql: { slect: "SELECT", form: "FROM", wher: "WHERE" },
    bash: { ehco: "echo", dnoe: "done" },
  };

  const CONCEPT_TALK = {
    print: "Output is how your program talks back to you. I read the text, then show it.",
    variables: "A variable is a labelled box. The label is the name, the contents are the value.",
    strings: "Text lives inside quotes. An f-string lets you drop a variable straight into that text.",
    conditional: "A condition is a yes-or-no question. The code runs only when the answer is yes.",
    loops: "A loop repeats work so you do not have to copy and paste.",
    functions: "A function is a machine: inputs go in, one result comes out.",
    collections: "Collections group many values under one name so you can move them together.",
    errors: "Errors are not failure, they are feedback. We catch them and stay in control.",
    files: "A file is memory that survives after your program stops.",
    classes: "A class is a blueprint. Each object built from it is a real thing with its own data.",
    memory: "Memory is where your values live. Owning it correctly is the whole game.",
    async: "Async lets your program wait on slow work without freezing everything else.",
  };

  function family(language) {
    if (C_LIKE.has(language)) return "c_like";
    if (language === "python") return "python";
    if (language === "bash") return "shell";
    return "markup";
  }

  // Mask comments and string contents so bracket counting ignores them.
  function blankCommentsAndStrings(line) {
    let out = "";
    let inStr = null;
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (inStr) {
        out += " ";
        if (ch === "\\" && i + 1 < line.length) { out += " "; i += 2; continue; }
        if (ch === inStr) inStr = null;
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; out += ch; i += 1; continue; }
      if (ch === "#" || (ch === "/" && line[i + 1] === "/")) break;
      out += ch;
      i += 1;
    }
    return out;
  }

  function unbalanced(code, lines) {
    const issues = [];
    const stack = [];
    lines.forEach((raw, idx) => {
      const masked = blankCommentsAndStrings(raw);
      for (let col = 0; col < masked.length; col += 1) {
        const ch = masked[col];
        if (BRACKETS[ch]) stack.push([ch, idx + 1]);
        else if (CLOSERS[ch]) {
          if (stack.length && stack[stack.length - 1][0] === CLOSERS[ch]) stack.pop();
          else {
            issues.push({
              line: idx + 1, column: col + 1, severity: "error", code: "unmatched-closer",
              message: `Unexpected '${ch}'. There is no matching '${CLOSERS[ch]}'.`,
              expected: `remove '${ch}' or add the matching opener`, fix: null, ghost: null,
            });
          }
        }
      }
    });
    stack.forEach(([opener, lineno]) => {
      issues.push({
        line: lineno, column: (lines[lineno - 1] || "").length + 1, severity: "error",
        code: "unclosed-bracket", message: `This '${opener}' is never closed.`,
        expected: `add '${BRACKETS[opener]}'`,
        fix: (lines[lineno - 1] || "").replace(/\s+$/, "") + BRACKETS[opener],
        ghost: BRACKETS[opener],
      });
    });
    return issues;
  }

  function analyze(language, code) {
    const issues = [];
    const lines = code.split("\n");
    const fam = family(language);
    const typos = TYPO_MAP[language] || {};

    lines.forEach((raw, idx) => {
      const lineno = idx + 1;
      const masked = blankCommentsAndStrings(raw);
      const stripped = raw.trim();

      const quoteCount = (raw.match(/"/g) || []).length;
      if (quoteCount % 2 === 1 && !raw.includes('"""')) {
        issues.push({
          line: lineno, column: raw.length + 1, severity: "error", code: "unclosed-string",
          message: "This string is missing its closing quote.",
          expected: 'add a matching " at the end of the text',
          fix: raw.replace(/\s+$/, "") + '"', ghost: '"',
        });
      }

      Object.keys(typos).forEach((wrong) => {
        const re = new RegExp("\\b" + wrong.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        if (re.test(masked)) {
          issues.push({
            line: lineno, column: raw.indexOf(wrong) + 1, severity: "error", code: "typo",
            message: `'${wrong}' is not a ${language} keyword. Did you mean '${typos[wrong]}'?`,
            expected: typos[wrong], fix: raw.split(wrong).join(typos[wrong]), ghost: typos[wrong],
          });
        }
      });

      if (fam === "python" && stripped.endsWith(":")) {
        const next = lines[idx + 1] !== undefined ? lines[idx + 1] : "";
        if (next.trim() && !/^[ \t]/.test(next)) {
          issues.push({
            line: lineno + 1, column: 1, severity: "error", code: "indentation",
            message: "The block after ':' must be indented.",
            expected: "indent the next line by four spaces",
            fix: "    " + next, ghost: "    ",
          });
        }
      }

      if (SEMICOLON_LANGS.has(language) && stripped && !stripped.startsWith("#") && !stripped.startsWith("//")) {
        const last = stripped.endsWith("{") || stripped.endsWith("}") || stripped.endsWith(";") ||
          stripped.endsWith(":") || stripped.endsWith(",");
        const opens = (masked.match(/\(/g) || []).length - (masked.match(/\)/g) || []).length;
        if (!last && opens <= 0 && masked.includes("=") && !/[;{]\s*$/.test(raw)) {
          issues.push({
            line: lineno, column: raw.length + 1, severity: "warning", code: "missing-semicolon",
            message: "Statements in this language end with a semicolon.",
            expected: ";", fix: raw.replace(/\s+$/, "") + ";", ghost: ";",
          });
        }
      }

      if (fam === "c_like" && language !== "go" && /\bprint\s*\(/.test(masked)) {
        issues.push({
          line: lineno, column: raw.indexOf("print") + 1, severity: "warning", code: "wrong-output",
          message: `'${language}' does not use print() like Python.`,
          expected: { javascript: "console.log", typescript: "console.log", cpp: "std::cout <<", java: "System.out.println", csharp: "Console.WriteLine", rust: "println!" }[language] || "the language's output function",
          fix: null, ghost: null,
        });
      }
    });

    return issues.concat(unbalanced(code, lines));
  }

  function checkOk(check, code) {
    const value = check.value;
    const message = check.message || "Requirement not met.";
    switch (check.type) {
      case "contains": return [code.includes(String(value)), message];
      case "not_contains": return [!code.includes(String(value)), message];
      case "regex": return [new RegExp(String(value)).test(code), message];
      case "min_lines": return [code.split("\n").filter((l) => l.trim()).length >= Number(value), message];
      case "balanced": return [unbalanced(code, code.split("\n")).length === 0, message];
      default: return [true, message];
    }
  }

  function regexToPlaceholder(pattern) {
    return pattern.replace(/\\s\*/g, " ").replace(/\\s\+/g, " ").replace(/\\/g, "")
      .replace(/\(\?:/g, "").replace(/[()[\]]/g, "").replace(/[?+*]/g, "").trim();
  }

  // Precise "type this" hint. Compares the learner's code to the reference
  // line by line so the ghost always contains real code, not a fragment.
  function ghostFor(lesson, code, results) {
    const lines = code.split("\n");
    const typed = lines.map((l) => l.replace(/\s+$/, ""));

    // 1. Point at an exact syntax fix when one exists.
    const issues = analyze(lesson.language, code);
    for (const issue of issues) {
      if (issue.ghost) {
        return { message: issue.message, text: issue.ghost, line: issue.line || lines.length, column: issue.column, mode: "insert" };
      }
    }

    const unmetOf = () => (lesson.checks || []).filter(
      (c) => c.message && !results.some((r) => r.message === c.message && r.ok));

    // Only walk a reference line by line when that reference is a genuinely
    // correct solution. Otherwise we would be pointing at code that does not
    // satisfy the task.
    const reference = referenceSolution(lesson);
    const referencePasses = (lesson.checks || []).every((c) => checkOk(c, reference)[0]);
    const ref = reference.split("\n").filter((l) => l.trim());
    if (!referencePasses || !ref.length) {
      const unmet = unmetOf();
      if (!unmet.length) return null;
      const check = unmet[0];
      let value = String(check.value || "");
      if (check.type === "regex") value = regexToPlaceholder(value);
      return { message: check.message, text: value, line: lines.length, mode: "insert" };
    }

    // 2. Advance past lines already matched.
    let idx = 0;
    for (const ln of typed) {
      const s = ln.trim();
      if (!s) continue;
      if (idx < ref.length && (s === ref[idx].trim() || ref[idx].includes(s))) idx += 1;
    }

    const unmet = unmetOf();
    if (idx >= ref.length) {
      if (!unmet.length) return null;
      const check = unmet[0];
      let value = String(check.value || "");
      if (check.type === "regex") value = regexToPlaceholder(value);
      return { message: check.message, text: value, line: lines.length, mode: "insert" };
    }

    const expected = ref[idx];
    // 3. When a specific token is missing, prefer it over the whole line.
    if (unmet.length) {
      const check = unmet[0];
      let value = String(check.value || "");
      if (check.type === "regex") value = regexToPlaceholder(value);
      if (value && !code.includes(value) && value.length <= expected.length) {
        return { message: check.message, text: value, line: lines.length, mode: "insert" };
      }
    }

    // 4. Otherwise give the exact next line to type.
    return { message: "Next line — type this exactly:", text: expected.trim(), line: lines.length + 1, mode: "newline" };
  }

  function grade(lesson, code) {
    const checks = lesson.checks || [];
    const results = [];
    let passed = 0;
    checks.forEach((check) => {
      const [ok, message] = checkOk(check, code);
      if (ok) passed += 1;
      results.push({ ok, message });
    });
    const issues = analyze(lesson.language, code);
    const errors = issues.filter((i) => i.severity === "error");
    let score = checks.length ? Math.round((100 * passed) / checks.length) : 0;
    if (errors.length) score = Math.max(0, score - Math.min(errors.length * 10, 40));
    return {
      passed: passed === checks.length && errors.length === 0,
      score, checks: results, issues, errors: errors.length,
      ghost: ghostFor(lesson, code, results),
    };
  }

  function referenceSolution(lesson) {
    if (lesson.solution && (lesson.checks || []).every((ch) => checkOk(ch, lesson.solution)[0])) return lesson.solution;
    if (lesson.example && (lesson.checks || []).every((ch) => checkOk(ch, lesson.example)[0])) return lesson.example;
    if (lesson.solution) return lesson.solution;
    return lesson.starter ? (lesson.starter + "\n" + lesson.example).trim() : lesson.example;
  }

  function walkthrough(lesson) {
    const reference = referenceSolution(lesson);
    const lines = reference.split("\n");
    const narration = lines.map((line, i) => {
      const s = line.trim();
      let note;
      if (!s) note = "Blank line, just breathing room.";
      else if (/^(#|\/\/|\/\*|\*)/.test(s)) note = "This is a comment. It explains intent and the computer skips it.";
      else if (/(print|cout|println|Console|fmt\.|echo|console\.log|SELECT)/.test(s)) note = "This line produces output so we can see the result.";
      else if (/(def |func |fn |function|class |int main|public static)/.test(s)) note = "This defines a reusable piece. The name is how we call it later.";
      else if (/(for |while |if |elif|else|switch|range)/.test(s)) note = "This is control flow. It decides what runs and how often.";
      else if (s.includes("=")) note = "This assigns a value to a name so we can reuse it.";
      else note = "This continues the logic from the line above.";
      return { line: i + 1, code: line, note };
    });
    return { reference, narration, spoken: `Watch closely. I will build ${lesson.title.toLowerCase()} one line at a time and explain each move.` };
  }

  const SUPERDAY_VARIATIONS = [
    ["swap the data", "Use completely different values or names than the example."],
    ["invert it", "Make the program do the opposite of the original goal."],
    ["wrap it", "Put the logic inside a function or loop that calls it repeatedly."],
    ["constrain it", "Solve it using only one line, or without a variable."],
    ["extend it", "Add one extra feature on top of the original requirement."],
  ];

  function superdayPlan(lesson) {
    return {
      lessonId: lesson.id, concept: lesson.concept, title: lesson.title,
      walkthrough: walkthrough(lesson),
      variations: SUPERDAY_VARIATIONS.map(([name, prompt], i) => ({
        id: `${lesson.id}-v${i + 1}`, name,
        prompt: `${prompt} Focus concept: ${lesson.concept}.`,
        starter: lesson.starter || "",
      })),
      spoken: "Super Day mode. I will never write the answer for you, but I will explain as many times as you need. Pick a variation below and I will show you the same idea from a new angle.",
      reference: referenceSolution(lesson),
    };
  }

  // Mochi's coaching. It reads the actual state of the learner's code — what
  // is missing, what is wrong, how far along they are — and answers with a
  // specific, contextual explanation rather than a generic one.
  function botExplain(lesson, code, question) {
    const report = grade(lesson, code);
    const concept = (lesson.concept || "").toLowerCase();
    let talk = null;
    Object.keys(CONCEPT_TALK).forEach((k) => { if (!talk && concept.includes(k)) talk = CONCEPT_TALK[k]; });

    const unmet = (lesson.checks || []).filter(
      (c) => c.message && !report.checks.some((r) => r.message === c.message && r.ok));
    const done = (lesson.checks || []).filter(
      (c) => report.checks.some((r) => r.message === c.message && r.ok));
    const errors = report.issues.filter((i) => i.severity === "error");

    // Build a plan tailored to where they actually are.
    const steps = [];
    if (done.length) {
      steps.push({ title: "Already working", detail: "You have got " + done.length + " of " +
        lesson.checks.length + " requirements right: " + done.map((c) => c.message.replace(/\.$/, "")).join("; ") + "." });
    }
    unmet.slice(0, 3).forEach((c, i) => {
      steps.push({ title: "Still needed " + (i + 1), detail: c.message });
    });
    (lesson.theory || []).slice(0, 3).forEach((t, i) => {
      steps.push({ title: "Concept " + (i + 1), detail: t });
    });

    const q = (question || "").toLowerCase();
    let spoken;

    // Direct answers to common questions, using the real code state.
    if (q && /why|wrong|error|not work|broken|fail/.test(q)) {
      if (errors.length) {
        spoken = "Line " + errors[0].line + ": " + errors[0].message +
          (errors[0].expected ? " Fix it by " + errors[0].expected + "." : "");
      } else if (unmet.length) {
        spoken = "Nothing is broken syntactically. What is missing is: " + unmet[0].message +
          " I would add that next.";
      } else {
        spoken = "Your code passes every check. If it feels wrong, tell me what you expected to happen.";
      }
    } else if (q && /hint|help|stuck|how/.test(q)) {
      if (unmet.length) {
        spoken = "You still need to " + unmet[0].message.replace(/\.$/, "") +
          ". " + (lesson.hints && lesson.hints[0] ? "Try: " + lesson.hints[0] : "");
      } else {
        spoken = "You are actually done. Try the challenge to prove it sticks.";
      }
    } else if (q && /what|explain|meaning|mean/.test(q)) {
      spoken = (talk || lesson.task) + " In this lesson, " + concept + " is the whole point.";
    } else if (errors.length) {
      const f = errors[0];
      spoken = "I found " + errors.length + " error" + (errors.length > 1 ? "s" : "") +
        ". The first is on line " + f.line + ": " + f.message +
        (f.expected ? " You should " + f.expected + "." : "") + " Let me show you.";
    } else if (report.passed) {
      spoken = "That is correct — all " + lesson.checks.length + " requirements are met and the code is clean. " +
        "Try the challenge next, or teach it back to me in your own words.";
    } else if (unmet.length) {
      spoken = "You are " + Math.round((done.length / lesson.checks.length) * 100) +
        "% of the way there. The next thing to add is: " + unmet[0].message;
    } else {
      spoken = "You are close. Let me point at the exact requirement that still needs your attention.";
    }

    return {
      spoken, summary: talk || lesson.task, steps, issues: report.issues, checks: report.checks,
      passed: report.passed, score: report.score, ghost: report.ghost,
      question: question || "", example: lesson.example, hints: lesson.hints || [],
      unmet: unmet.map((c) => c.message),
      done: done.map((c) => c.message),
      progress: lesson.checks.length ? Math.round((done.length / lesson.checks.length) * 100) : 0,
    };
  }

  window.ChimEngine = { analyze, grade, ghostFor, botExplain, walkthrough, superdayPlan, referenceSolution };
})();
