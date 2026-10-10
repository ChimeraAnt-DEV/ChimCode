"""Registry that assembles every language and lesson into one catalogue."""
from __future__ import annotations

from . import cpp_lessons, more_lessons, python_lessons, web_lessons
from .schema import Language

LANGUAGE_META = [
    ("python", "Python", "Bots, servers, data, automation", "🐍", "#4b8bbe",
     "The friendliest first language and a serious tool for bots, APIs and automation."),
    ("cpp", "C++", "Speed, games, systems", "⚙️", "#00599c",
     "Close-to-the-metal performance for engines, servers and anything that must be fast."),
    ("javascript", "JavaScript", "The language of the web", "🟨", "#e8c400",
     "Runs everywhere a browser runs, plus servers through Node.js."),
    ("typescript", "TypeScript", "JavaScript with types", "🔷", "#3178c6",
     "Catch bugs before they ship with static types on top of JavaScript."),
    ("java", "Java", "Enterprise and Android", "☕", "#e76f00",
     "A workhorse for large backends and Android apps."),
    ("csharp", "C#", ".NET, games, apps", "🎯", "#68217a",
     "Modern, expressive and the heart of the .NET ecosystem and Unity."),
    ("go", "Go", "Cloud and concurrency", "🐹", "#00add8",
     "Simple, fast and built for servers, CLIs and distributed systems."),
    ("rust", "Rust", "Safety without garbage collection", "🦀", "#c76b3e",
     "Memory safety at compile time with C-level speed."),
    ("sql", "SQL", "Talk to databases", "🗄️", "#e38c00",
     "The universal language for querying and shaping data."),
    ("bash", "Bash", "Automate everything", "🖥️", "#4eaa25",
     "Glue for your machine: scripts, pipelines and automation."),
    ("htmlcss", "HTML & CSS", "Build beautiful interfaces", "🎨", "#e34f26",
     "The markup and styling that every website is made of."),
]

LANGUAGES: dict[str, Language] = {}


def _build() -> None:
    by_lang: dict[str, list] = {lang_id: [] for lang_id, *_ in LANGUAGE_META}
    for lesson in python_lessons.LESSONS:
        by_lang["python"].append(lesson)
    for lesson in cpp_lessons.LESSONS:
        by_lang["cpp"].append(lesson)
    for lesson in web_lessons.LESSONS:
        by_lang[lesson.language].append(lesson)
    for lesson in more_lessons.LESSONS:
        by_lang[lesson.language].append(lesson)

    for lang_id, name, tagline, icon, color, blurb in LANGUAGE_META:
        LANGUAGES[lang_id] = Language(
            id=lang_id,
            name=name,
            tagline=tagline,
            icon=icon,
            color=color,
            blurb=blurb,
            lessons=by_lang.get(lang_id, []),
        )


_build()


def all_lessons():
    for language in LANGUAGES.values():
        for lesson in language.lessons:
            yield lesson


def find_lesson(lesson_id: str):
    for lesson in all_lessons():
        if lesson.id == lesson_id:
            return lesson
    return None


def catalogue() -> list[dict]:
    return [language.public(include_lessons=False) for language in LANGUAGES.values()]


LESSON_INDEX = {lesson.id: lesson for lesson in all_lessons()}
