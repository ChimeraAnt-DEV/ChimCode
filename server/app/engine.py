"""Lesson engine: grading, mistake detection and Mochi's coaching.

Everything here is deterministic static analysis. It never executes the
learner's code, so it is safe to run on untrusted input.
"""
from __future__ import annotations

import difflib
import re
from typing import Any

C_LIKE = {"cpp", "java", "csharp", "javascript", "typescript", "go", "rust"}
SEMICOLON_LANGS = {"cpp", "java", "csharp"}
BRACKETS = {"(": ")", "[": "]", "{": "}"}
CLOSERS = {v: k for k, v in BRACKETS.items()}

# Words that are almost always typos of a language keyword.
TYPO_MAP = {
    "python": {
        "prnt": "print", "pritn": "print", "pint": "print", "retrun": "return",
        "defintion": "def", "fro": "for", "whlie": "while", "elsif": "elif",
        "improt": "import", "slf": "self", "nul": "None", "ture": "True",
    },
    "javascript": {
        "cosole": "console", "consol": "console", "functon": "function",
        "retrun": "return", "lenght": "length", "documnet": "document",
    },
    "typescript": {"cosole": "console", "interfase": "interface", "retrun": "return"},
    "cpp": {"retrun": "return", "couts": "cout", "stdnam": "std", "includ": "#include"},
    "java": {"Sytem": "System", "pbulic": "public", "retrun": "return", "strng": "String"},
    "csharp": {"Cosole": "Console", "pubic": "public", "retrun": "return"},
    "go": {"fnt": "func", "prnitln": "Println", "pckage": "package"},
    "rust": {"fnc": "fn", "pritnln": "println", "mutt": "mut"},
    "sql": {"slect": "SELECT", "form": "FROM", "wher": "WHERE"},
    "bash": {"ehco": "echo", "fi": "fi", "dnoe": "done"},
}


def _lang_family(language: str) -> str:
    if language in C_LIKE:
        return "c_like"
    if language == "python":
        return "python"
    if language == "bash":
        return "shell"
    return "markup"


def _line_of(code: str, index: int) -> int:
    return code.count("\n", 0, index) + 1


def _blank_comment_and_strings(line: str) -> str:
    """Mask comments and string contents so bracket counting ignores them."""
    out = []
    i = 0
    in_str = None
    while i < len(line):
        ch = line[i]
        if in_str:
            out.append(" ")
            if ch == "\\" and i + 1 < len(line):
                out.append(" ")
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in "\"'`":
            in_str = ch
            out.append(ch)
            i += 1
            continue
        if ch == "#" or (ch == "/" and i + 1 < len(line) and line[i + 1] == "/"):
            break
        out.append(ch)
        i += 1
    return "".join(out)


def analyze(language: str, code: str) -> list[dict[str, Any]]:
    """Return a list of issues, each pointing at a line for the bot to hover."""
    issues: list[dict[str, Any]] = []
    lines = code.split("\n")
    family = _lang_family(language)
    typos = TYPO_MAP.get(language, {})

    for lineno, raw in enumerate(lines, start=1):
        masked = _blank_comment_and_strings(raw)
        stripped = raw.strip()

        # Unbalanced quotes on a line.
        if raw.count('"') % 2 == 1 and '"' not in ("",):
            if not re.search(r'"""', raw):
                issues.append({
                    "line": lineno, "column": len(raw) + 1, "severity": "error",
                    "code": "unclosed-string",
                    "message": "This string is missing its closing quote.",
                    "expected": 'add a matching " at the end of the text',
                    "fix": raw.rstrip() + '"',
                    "ghost": '"',
                })

        # Keyword typos.
        for wrong, right in typos.items():
            if re.search(rf"\b{re.escape(wrong)}\b", masked):
                issues.append({
                    "line": lineno, "column": raw.find(wrong) + 1, "severity": "error",
                    "code": "typo",
                    "message": f"'{wrong}' is not a {language} keyword. Did you mean '{right}'?",
                    "expected": right,
                    "fix": raw.replace(wrong, right),
                    "ghost": right,
                })

        # Python indentation after a colon.
        if family == "python" and stripped.endswith(":"):
            next_line = lines[lineno] if lineno < len(lines) else ""
            if next_line.strip() and not next_line.startswith((" ", "\t")):
                issues.append({
                    "line": lineno + 1, "column": 1, "severity": "error",
                    "code": "indentation",
                    "message": "The block after ':' must be indented.",
                    "expected": "indent the next line by four spaces",
                    "fix": "    " + next_line,
                    "ghost": "    ",
                })

        # Missing semicolon for semicolon languages.
        if language in SEMICOLON_LANGS and stripped and not stripped.startswith(("#", "//")):
            if not stripped.endswith(("{", "}", ";", ":", ",")) and "(" not in stripped.split()[-1:][0][:1]:
                opens = masked.count("(") - masked.count(")")
                if opens <= 0 and "=" in masked and not re.search(r"[;{]\s*$", raw):
                    issues.append({
                        "line": lineno, "column": len(raw) + 1, "severity": "warning",
                        "code": "missing-semicolon",
                        "message": "Statements in this language end with a semicolon.",
                        "expected": ";",
                        "fix": raw.rstrip() + ";",
                        "ghost": ";",
                    })

        # print vs console.log cross-language nudge.
        if family == "c_like" and re.search(r"\bprint\s*\(", masked) and language != "go":
            issues.append({
                "line": lineno, "column": raw.find("print") + 1, "severity": "warning",
                "code": "wrong-output",
                "message": f"'{language}' does not use print() like Python.",
                "expected": {"javascript": "console.log", "typescript": "console.log",
                             "cpp": "std::cout <<", "java": "System.out.println",
                             "csharp": "Console.WriteLine", "rust": "println!"}.get(language, "the language's output function"),
                "fix": None, "ghost": None,
            })

    issues += _unbalanced(code, lines, language)
    return issues


def _unbalanced(code: str, lines: list[str], language: str) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    stack: list[tuple[str, int]] = []
    for lineno, raw in enumerate(lines, start=1):
        masked = _blank_comment_and_strings(raw)
        for col, ch in enumerate(masked, start=1):
            if ch in BRACKETS:
                stack.append((ch, lineno))
            elif ch in CLOSERS:
                if stack and stack[-1][0] == CLOSERS[ch]:
                    stack.pop()
                else:
                    issues.append({
                        "line": lineno, "column": col, "severity": "error",
                        "code": "unmatched-closer",
                        "message": f"Unexpected '{ch}'. There is no matching '{CLOSERS[ch]}'.",
                        "expected": f"remove '{ch}' or add the matching opener",
                        "fix": None, "ghost": None,
                    })
    for opener, lineno in stack:
        issues.append({
            "line": lineno, "column": len(lines[lineno - 1]) + 1, "severity": "error",
            "code": "unclosed-bracket",
            "message": f"This '{opener}' is never closed.",
            "expected": f"add '{BRACKETS[opener]}'",
            "fix": lines[lineno - 1].rstrip() + BRACKETS[opener],
            "ghost": BRACKETS[opener],
        })
    return issues


def _check_ok(check: dict[str, Any], code: str) -> tuple[bool, str]:
    kind = check.get("type")
    value = check.get("value")
    message = check.get("message", "Requirement not met.")
    if kind == "contains":
        return (str(value) in code), message
    if kind == "not_contains":
        return (str(value) not in code), message
    if kind == "regex":
        return (re.search(str(value), code) is not None), message
    if kind == "min_lines":
        return (len([ln for ln in code.split("\n") if ln.strip()]) >= int(value)), message
    if kind == "balanced":
        return (len(_unbalanced(code, code.split("\n"), "")) == 0), message
    return True, message


def grade(lesson, code: str) -> dict[str, Any]:
    checks = lesson.checks
    results = []
    passed = 0
    for check in checks:
        ok, message = _check_ok(check, code)
        passed += 1 if ok else 0
        results.append({"ok": ok, "message": message})

    issues = analyze(lesson.language, code)
    errors = [i for i in issues if i["severity"] == "error"]

    score = 0
    if checks:
        score = round(100 * passed / len(checks))
    if errors:
        score = max(0, score - min(len(errors) * 10, 40))

    return {
        "passed": passed == len(checks) and not errors,
        "score": score,
        "checks": results,
        "issues": issues,
        "errors": len(errors),
        "ghost": ghost_for(lesson, code, results),
    }


def ghost_for(lesson, code: str, results: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Build a transparent 'type here' hint for the first unmet requirement."""
    unmet = [c for c in lesson.checks if c.get("message") and not any(
        r["message"] == c["message"] and r["ok"] for r in results)]
    if not unmet:
        return None
    check = unmet[0]
    value = str(check.get("value", ""))
    if check.get("type") == "regex":
        value = _regex_to_placeholder(value)
    return {
        "message": check.get("message", "Add the missing piece here."),
        "text": value,
        "line": len(code.split("\n")),
    }


def _regex_to_placeholder(pattern: str) -> str:
    cleaned = pattern.replace(r"\s*", " ").replace(r"\s+", " ").replace("\\", "")
    cleaned = cleaned.replace("(?:", "").replace(")", "").replace("[", "").replace("]", "")
    cleaned = cleaned.replace("?", "").replace("+", "").replace("*", "")
    return cleaned.strip()


# ---------------------------------------------------------------- bot coaching

CONCEPT_TALK = {
    "print": "Output is how your program talks back to you. I read the text, then show it.",
    "variables": "A variable is a labelled box. The label is the name, the contents are the value.",
    "strings": "Text lives inside quotes. An f-string lets you drop a variable straight into that text.",
    "conditionals": "A condition is a yes-or-no question. The code runs only when the answer is yes.",
    "loops": "A loop repeats work so you do not have to copy and paste.",
    "functions": "A function is a machine: inputs go in, one result comes out.",
    "collections": "Collections group many values under one name so you can move them together.",
    "errors": "Errors are not failure, they are feedback. We catch them and stay in control.",
    "files": "A file is memory that survives after your program stops.",
    "classes": "A class is a blueprint. Each object built from it is a real thing with its own data.",
    "memory": "Memory is where your values live. Owning it correctly is the whole game.",
    "async": "Async lets your program wait on slow work without freezing everything else.",
}


def bot_explain(lesson, code: str, question: str = "") -> dict[str, Any]:
    """Produce Mochi's structured coaching reply for a lesson + submission."""
    report = grade(lesson, code)
    concept = lesson.concept.lower()
    talk = next((v for k, v in CONCEPT_TALK.items() if k in concept), None)

    steps = []
    for i, t in enumerate(lesson.theory, start=1):
        steps.append({"title": f"Step {i}", "detail": t})

    issues = report["issues"]
    if issues:
        focus = issues[0]
        spoken = (
            f"I spotted something on line {focus['line']}. "
            f"{focus['message']} {('You should ' + focus['expected'] + '.') if focus['expected'] else ''} "
            "Let me walk you through it."
        )
    elif report["passed"]:
        spoken = "Beautiful work. Every requirement is met and I found no mistakes. Want to try the challenge?"
    else:
        spoken = "You are close. Let me point at the exact requirement that still needs your attention."

    return {
        "spoken": spoken,
        "summary": talk or lesson.task,
        "steps": steps,
        "issues": issues,
        "checks": report["checks"],
        "passed": report["passed"],
        "score": report["score"],
        "ghost": report["ghost"],
        "question": question,
        "example": lesson.example,
        "hints": lesson.hints,
    }


def walkthrough(lesson) -> dict[str, Any]:
    """A narrated, line-by-line solution the bot can demonstrate on a Super Day."""
    reference = _reference_solution(lesson)
    lines = reference.split("\n")
    narration = []
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped:
            note = "Blank line, just breathing room."
        elif stripped.startswith(("#", "//", "/*", "*")):
            note = "This is a comment. It explains intent and the computer skips it."
        elif any(k in stripped for k in ("print", "cout", "println", "Console", "fmt.", "echo", "console.log", "SELECT")):
            note = "This line produces output so we can see the result."
        elif any(k in stripped for k in ("def ", "func ", "fn ", "function", "class ", "int main", "public static")):
            note = "This defines a reusable piece. The name is how we call it later."
        elif any(k in stripped for k in ("for ", "while ", "if ", "elif", "else", "switch", "range")):
            note = "This is control flow. It decides what runs and how often."
        elif "=" in stripped:
            note = "This assigns a value to a name so we can reuse it."
        else:
            note = "This continues the logic from the line above."
        narration.append({"line": i, "code": line, "note": note})
    return {
        "reference": reference,
        "narration": narration,
        "spoken": f"Watch closely. I will build {lesson.title.lower()} one line at a time and explain each move.",
    }


def _reference_solution(lesson) -> str:
    """Best-effort reference answer, preferring the lesson example when it satisfies checks."""
    candidates = [lesson.example]
    if lesson.challenge_starter:
        candidates.append(lesson.challenge_starter)
    for candidate in candidates:
        if candidate and all(_check_ok(c, candidate)[0] for c in lesson.checks):
            return candidate
    # Fall back to the example with starter scaffolding prepended.
    return (lesson.starter + "\n" + lesson.example).strip() if lesson.starter else lesson.example


SUPERDAY_VARIATIONS = [
    ("swap the data", "Use completely different values or names than the example."),
    ("invert it", "Make the program do the opposite of the original goal."),
    ("wrap it", "Put the logic inside a function or loop that calls it repeatedly."),
    ("constrain it", "Solve it using only one line, or without a variable."),
    ("extend it", "Add one extra feature on top of the original requirement."),
]


def superday_plan(lesson) -> dict[str, Any]:
    """Build the 'different but same' practice menu for a Super Day."""
    base = _reference_solution(lesson)
    variations = []
    for i, (name, prompt) in enumerate(SUPERDAY_VARIATIONS, start=1):
        variations.append({
            "id": f"{lesson.id}-v{i}",
            "name": name,
            "prompt": f"{prompt} Focus concept: {lesson.concept}.",
            "starter": lesson.starter or "",
        })
    return {
        "lessonId": lesson.id,
        "concept": lesson.concept,
        "title": lesson.title,
        "walkthrough": walkthrough(lesson),
        "variations": variations,
        "spoken": (
            "Super Day mode. I will never write the answer for you, but I will explain as many times "
            "as you need. Pick a variation below and I will show you the same idea from a new angle."
        ),
        "reference": base,
    }


def similarity(a: str, b: str) -> float:
    return round(difflib.SequenceMatcher(None, a, b).ratio(), 3)
