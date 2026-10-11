"""Achievement catalogue.

The catalogue is generated deterministically so ids stay stable between runs
while still producing well over 700 distinct achievements across milestones,
per-language tracks, per-lesson mastery, social play and collection goals.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .curriculum.registry import LANGUAGES

CATEGORY_META = {
    "milestone": ("Milestones", "🏁", "#7c5cff"),
    "python": ("Python", "🐍", "#4b8bbe"),
    "cpp": ("C++", "⚙️", "#00599c"),
    "javascript": ("JavaScript", "🟨", "#e8c400"),
    "typescript": ("TypeScript", "🔷", "#3178c6"),
    "java": ("Java", "☕", "#e76f00"),
    "csharp": ("C#", "🎯", "#68217a"),
    "go": ("Go", "🐹", "#00add8"),
    "rust": ("Rust", "🦀", "#c76b3e"),
    "sql": ("SQL", "🗄️", "#e38c00"),
    "bash": ("Bash", "🖥️", "#4eaa25"),
    "htmlcss": ("HTML & CSS", "🎨", "#e34f26"),
    "mastery": ("Lesson Mastery", "🏅", "#ffd166"),
    "social": ("Social", "🤝", "#ff5c8a"),
    "collection": ("Collection", "💎", "#22d3ee"),
    "superday": ("Super Days", "🌟", "#f59e0b"),
    "special": ("Special", "✨", "#a3e635"),
}

RARITY_POINTS = {"common": 5, "rare": 15, "epic": 40, "legendary": 100}


@dataclass
class Achievement:
    id: str
    name: str
    description: str
    category: str
    icon: str
    rarity: str
    metric: str
    target: float
    scope: str = ""

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "categoryName": CATEGORY_META.get(self.category, (self.category, "🏆", "#888"))[0],
            "icon": self.icon,
            "rarity": self.rarity,
            "points": RARITY_POINTS[self.rarity],
            "metric": self.metric,
            "target": self.target,
            "scope": self.scope,
        }


def _rarity_for(rank: int, total: int) -> str:
    ratio = rank / max(total, 1)
    if ratio < 0.15:
        return "common"
    if ratio < 0.5:
        return "rare"
    if ratio < 0.85:
        return "epic"
    return "legendary"


def _tiered(prefix: str, category: str, icon: str, metric: str, tiers: list[tuple[float, str]]) -> list[Achievement]:
    out: list[Achievement] = []
    total = len(tiers)
    for i, (target, label) in enumerate(tiers):
        out.append(
            Achievement(
                id=f"{prefix}-{int(target)}" if float(target).is_integer() else f"{prefix}-{target}",
                name=label,
                description=f"Unlock: {label}.",
                category=category,
                icon=icon,
                rarity=_rarity_for(i, total),
                metric=metric,
                target=target,
            )
        )
    return out


def _build() -> list[Achievement]:
    items: list[Achievement] = []

    # ---------------------------------------------------------- Milestones
    # Thresholds are deliberately demanding: early tiers are reachable, but the
    # meaningful badges require sustained, real practice.
    xp_tiers = []
    for target in [500, 1500, 3000, 6000, 10000, 16000, 24000, 34000, 46000, 60000,
                   80000, 105000, 135000, 170000, 210000, 260000, 320000, 400000,
                   500000, 650000]:
        xp_tiers.append((target, f"{target:,} XP"))
    items += _tiered("xp", "milestone", "⚡", "xp", xp_tiers)

    streak_tiers = [(d, f"{d} day streak") for d in
                    [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 250, 365, 500]]
    items += _tiered("streak", "milestone", "🔥", "streak", streak_tiers)

    lesson_tiers = [(n, f"{n} lessons done") for n in
                    [5, 10, 20, 30, 40, 50, 60, 75, 90, 110, 130, 150, 175, 200]]
    items += _tiered("lessons", "milestone", "📚", "lessons_completed", lesson_tiers)

    perfect_tiers = [(n, f"{n} perfect lessons") for n in
                     [5, 10, 18, 28, 40, 55, 70, 90, 110, 135]]
    items += _tiered("perfect", "milestone", "💯", "perfect_scores", perfect_tiers)

    quiz_tiers = [(n, f"{n} quiz answers") for n in
                  [10, 25, 50, 100, 175, 275, 400, 550, 750, 1000]]
    items += _tiered("quiz", "milestone", "🧠", "quiz_correct", quiz_tiers)

    minute_tiers = [(n, f"{n} minutes in lessons") for n in
                    [60, 180, 360, 600, 900, 1200, 1800, 2400, 3000, 4000, 5000, 6000]]
    items += _tiered("minutes", "milestone", "⏱️", "minutes", minute_tiers)

    challenge_tiers = [(n, f"{n} challenges solved") for n in
                       [3, 8, 15, 25, 40, 55, 70, 85, 100]]
    items += _tiered("challenge", "milestone", "🧩", "challenges_completed", challenge_tiers)

    # ---------------------------------------------------------- Super days
    super_tiers = [(n, f"{n} Super Day{'s' if n > 1 else ''}") for n in [1, 3, 7, 14, 30]]
    items += _tiered("superday", "superday", "🌟", "super_days", super_tiers)
    items += [
        Achievement("super-legend", "Super Legend", "Reach 30 Super Days.", "superday", "💫", "legendary", "super_days", 30),
        Achievement("super-marathon", "Marathon Mind", "Spend 2000 minutes inside Super Days.", "superday", "🧘", "legendary", "super_minutes", 2000),
    ]

    # ---------------------------------------------------------- Per language
    for lang_id, language in LANGUAGES.items():
        cat = lang_id if lang_id in CATEGORY_META else "milestone"
        icon = language.icon
        items.append(Achievement(
            f"{lang_id}-start", f"{language.name} Initiate", f"Complete your first {language.name} lesson.",
            cat, icon, "common", "lessons_in", 1, scope=lang_id,
        ))
        for n in (3, 5, 10):
            if len(language.lessons) >= n:
                items.append(Achievement(
                    f"{lang_id}-{n}", f"{language.name} x{n}", f"Complete {n} {language.name} lessons.",
                    cat, icon, "rare" if n < 10 else "epic", "lessons_in", n, scope=lang_id,
                ))
        if language.lessons:
            items.append(Achievement(
                f"{lang_id}-all", f"{language.name} Master", f"Complete every {language.name} lesson.",
                cat, icon, "legendary", "lessons_in", len(language.lessons), scope=lang_id,
            ))
            # Hard per-language goals: ace everything, clear every challenge,
            # and do it all without leaning on hints.
            total = len(language.lessons)
            items.append(Achievement(
                f"{lang_id}-aces", f"{language.name} Aced", f"Score 100% on every {language.name} lesson.",
                cat, icon, "legendary", "aces_in", total, scope=lang_id,
            ))
            items.append(Achievement(
                f"{lang_id}-challenges", f"{language.name} Challenger",
                f"Solve every challenge in the {language.name} track.",
                cat, icon, "legendary", "challenges_in", total, scope=lang_id,
            ))
            items.append(Achievement(
                f"{lang_id}-flawless", f"{language.name} Flawless",
                f"Master every {language.name} lesson and its challenge.",
                cat, icon, "legendary", "mastered_in", total, scope=lang_id,
            ))
            items.append(Achievement(
                f"{lang_id}-nohelp", f"{language.name} Self-Taught",
                f"Complete every {language.name} lesson without hints.",
                cat, icon, "legendary", "nohint_in", total, scope=lang_id,
            ))
            for level in sorted({lesson.level for lesson in language.lessons}):
                count = sum(1 for lesson in language.lessons if lesson.level == level)
                items.append(Achievement(
                    f"{lang_id}-{level}", f"{language.name} {level.title()}", f"Complete every {level} {language.name} lesson.",
                    cat, icon, "epic", "lessons_in_level", count, scope=f"{lang_id}:{level}",
                ))
                items.append(Achievement(
                    f"{lang_id}-{level}-aced", f"{language.name} {level.title()} Aced",
                    f"Ace every {level} {language.name} lesson.",
                    cat, icon, "legendary", "aces_in_level", count, scope=f"{lang_id}:{level}",
                ))
                items.append(Achievement(
                    f"{lang_id}-{level}-chal", f"{language.name} {level.title()} Challenger",
                    f"Solve every {level} {language.name} challenge.",
                    cat, icon, "legendary", "challenges_in_level", count, scope=f"{lang_id}:{level}",
                ))

    # ---------------------------------------------------------- Per lesson
    for language in LANGUAGES.values():
        for lesson in language.lessons:
            items.append(Achievement(
                f"done-{lesson.id}", f"{lesson.title}", f"Finish the lesson '{lesson.title}'.",
                "mastery", "✅", "common", "completed_lesson", 1, scope=lesson.id,
            ))
            items.append(Achievement(
                f"ace-{lesson.id}", f"{lesson.title} Ace", f"Score 100% on '{lesson.title}'.",
                "mastery", "🌟", "rare", "aced_lesson", 1, scope=lesson.id,
            ))
            items.append(Achievement(
                f"chal-{lesson.id}", f"{lesson.title} Challenge", f"Solve the challenge for '{lesson.title}'.",
                "mastery", "🧩", "epic", "challenged_lesson", 1, scope=lesson.id,
            ))
            items.append(Achievement(
                f"clean-{lesson.id}", f"{lesson.title} Clean Run",
                f"Finish '{lesson.title}' using no hints.",
                "mastery", "🧗", "rare", "no_hint_lesson", 1, scope=lesson.id,
            ))
            items.append(Achievement(
                f"flawless-{lesson.id}", f"{lesson.title} Flawless",
                f"Ace '{lesson.title}' and its challenge.",
                "mastery", "💎", "epic", "mastered_lesson", 1, scope=lesson.id,
            ))
            items.append(Achievement(
                f"speedrun-{lesson.id}", f"{lesson.title} Speedrun",
                f"Finish '{lesson.title}' on your first attempt.",
                "mastery", "⚡", "rare", "first_try_lesson", 1, scope=lesson.id,
            ))
            items.append(Achievement(
                f"perfect-{lesson.id}", f"{lesson.title} Perfectionist",
                f"Score 100% on '{lesson.title}' without using a hint.",
                "mastery", "🌟", "epic", "perfect_nohint_lesson", 1, scope=lesson.id,
            ))

    # ---------------------------------------------------------- Social
    friend_tiers = [(i, f"{i} friend{'s' if i > 1 else ''}") for i in [3, 6, 10, 15, 25, 40]]
    items += _tiered("friends", "social", "🤝", "friends", friend_tiers)
    follower_tiers = [(i, f"{i} followers") for i in [5, 15, 30, 60, 100, 200, 400, 750]]
    items += _tiered("followers", "social", "📣", "followers", follower_tiers)
    items += [
        Achievement("profile-pioneer", "Profile Pioneer", "Complete your profile.", "social", "🪪", "common", "profile_edits", 1),
        Achievement("profile-stylist", "Profile Stylist", "Change your avatar and username.", "social", "💅", "rare", "profile_edits", 3),
        Achievement("public-speaker", "Public Speaker", "Make your profile public.", "social", "🌍", "common", "is_public", 1),
        Achievement("social-butterfly", "Social Butterfly", "Have 10 friends and 20 followers.", "social", "🦋", "legendary", "friends", 10),
        Achievement("helpful-hand", "Helpful Hand", "Follow 15 other coders.", "social", "🙌", "epic", "following", 15),
        Achievement("community-pillar", "Community Pillar", "Reach 50 followers.", "social", "🏛️", "legendary", "followers", 50),
    ]

    # ---------------------------------------------------------- Collection
    item_tiers = [(i, f"{i} cosmetics owned") for i in [2, 4, 6, 8, 10, 12, 15, 18, 21, 24]]
    items += _tiered("cosmetics", "collection", "💎", "cosmetics_owned", item_tiers)
    spend_tiers = [(n, f"Spend {n} Books") for n in [250, 750, 1500, 3000, 5000]]
    items += _tiered("spend", "collection", "🛒", "books_spent", spend_tiers)
    earn_tiers = [(n, f"Earn {n} Books") for n in [500, 1500, 3500, 7000, 12000]]
    items += _tiered("earn", "collection", "📖", "books_earned", earn_tiers)

    # ---------------------------------------------------------- Achievement count
    # Raised so the big collector badges take real dedication.
    ach_tiers = [(n, f"{n} achievements") for n in
                 [5, 10, 20, 35, 50, 70, 90, 110, 130, 150, 175, 210, 245, 290, 350]]
    items += _tiered("ach", "special", "🏆", "achievements_earned", ach_tiers)
    items += [
        Achievement("collector-bronze", "Bronze Collector", "Earn 50 achievements.", "special", "🥉", "rare", "achievements_earned", 50),
        Achievement("collector-silver", "Silver Collector", "Earn 200 achievements.", "special", "🥈", "epic", "achievements_earned", 200),
        Achievement("collector-gold", "Gold Collector", "Earn 400 achievements.", "special", "🥇", "legendary", "achievements_earned", 400),
        Achievement("completionist", "Completionist", "Earn 650 achievements.", "special", "👑", "legendary", "achievements_earned", 650),
    ]

    # ---------------------------------------------------------- Language variety
    lang_tiers = [(i, f"{i} language{'s' if i > 1 else ''} started") for i in range(1, len(LANGUAGES) + 1)]
    items += _tiered("polyglot", "special", "🌐", "languages_started", lang_tiers)
    # Cross-language depth: reach a real foothold in many tracks at once.
    for n in (2, 3, 5, 8):
        items.append(Achievement(
            f"deep-langs-{n}", f"{n} Languages Deep",
            f"Complete at least 10 lessons in {n} different languages.",
            "special", "🌐", "legendary" if n >= 5 else "epic", "langs_with_ten", n,
        ))
    for n in (3, 10, 25, 50):
        items.append(Achievement(
            f"daily-{n}", f"{n} Days Active",
            f"Study on {n} different days.",
            "special", "📅", "rare" if n < 25 else "legendary", "active_days", n,
        ))
    items += [
        Achievement("polyglot-legend", "Polyglot Legend", "Reach 5 lessons in every language.", "special", "🧙", "legendary", "min_lessons_all_langs", 5),
        Achievement("night-owl", "Night Owl", "Study after midnight.", "special", "🦉", "rare", "night_sessions", 1),
        Achievement("early-bird", "Early Bird", "Study before 7am.", "special", "🐦", "rare", "morning_sessions", 1),
        Achievement("first-blood", "Hello, World", "Complete your very first lesson.", "special", "🎉", "common", "lessons_completed", 1),
        Achievement("bot-friend", "Bot Friend", "Ask Mochi for help 10 times.", "special", "🤖", "rare", "bot_helps", 10),
        Achievement("bot-bestie", "Mochi's Bestie", "Ask Mochi for help 100 times.", "special", "🤖", "legendary", "bot_helps", 100),
        Achievement("hint-collector", "Hint Collector", "Use 25 hints.", "special", "💡", "rare", "hints_used", 25),
        Achievement("self-reliant", "Self Reliant", "Complete 10 lessons without hints.", "special", "🧗", "epic", "no_hint_lessons", 10),
    ]

    # De-duplicate while preserving order.
    seen: set[str] = set()
    unique: list[Achievement] = []
    for item in items:
        if item.id in seen:
            continue
        seen.add(item.id)
        unique.append(item)
    return unique


ACHIEVEMENTS: list[Achievement] = _build()
ACHIEVEMENT_INDEX: dict[str, Achievement] = {a.id: a for a in ACHIEVEMENTS}
TOTAL_ACHIEVEMENTS = len(ACHIEVEMENTS)


def categories() -> list[dict[str, Any]]:
    counts: dict[str, int] = {}
    for a in ACHIEVEMENTS:
        counts[a.category] = counts.get(a.category, 0) + 1
    out = []
    for key, (name, icon, color) in CATEGORY_META.items():
        out.append({"id": key, "name": name, "icon": icon, "color": color, "count": counts.get(key, 0)})
    return out
