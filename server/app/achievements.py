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
    xp_tiers = []
    for i in range(1, 71):
        target = i * 250
        xp_tiers.append((target, f"{target:,} XP"))
    items += _tiered("xp", "milestone", "⚡", "xp", xp_tiers)

    streak_tiers = [(i, f"{i} day streak") for i in range(1, 36)]
    items += _tiered("streak", "milestone", "🔥", "streak", streak_tiers)

    lesson_tiers = [(i, f"{i} lessons done") for i in range(1, 46)]
    items += _tiered("lessons", "milestone", "📚", "lessons_completed", lesson_tiers)

    perfect_tiers = [(i, f"{i} perfect lessons") for i in range(1, 26)]
    items += _tiered("perfect", "milestone", "💯", "perfect_scores", perfect_tiers)

    quiz_tiers = [(i * 5, f"{i * 5} quiz answers") for i in range(1, 36)]
    items += _tiered("quiz", "milestone", "🧠", "quiz_correct", quiz_tiers)

    minute_tiers = [(i * 30, f"{i * 30} minutes") for i in range(1, 31)]
    items += _tiered("minutes", "milestone", "⏱️", "minutes", minute_tiers)

    challenge_tiers = [(i, f"{i} challenges") for i in range(1, 31)]
    items += _tiered("challenge", "milestone", "🧩", "challenges_completed", challenge_tiers)

    # ---------------------------------------------------------- Super days
    super_tiers = [(i, f"{i} Super Day{'s' if i > 1 else ''}") for i in range(1, 16)]
    items += _tiered("superday", "superday", "🌟", "super_days", super_tiers)
    items += [
        Achievement("super-first", "First Super Day", "Activate your first Super Day.", "superday", "🌟", "rare", "super_days", 1),
        Achievement("super-legend", "Super Legend", "Reach 25 Super Days.", "superday", "💫", "legendary", "super_days", 25),
        Achievement("super-marathon", "Marathon Mind", "Spend 500 minutes inside Super Days.", "superday", "🧘", "epic", "super_minutes", 500),
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
            for level in sorted({lesson.level for lesson in language.lessons}):
                count = sum(1 for lesson in language.lessons if lesson.level == level)
                items.append(Achievement(
                    f"{lang_id}-{level}", f"{language.name} {level.title()}", f"Complete every {level} {language.name} lesson.",
                    cat, icon, "epic", "lessons_in_level", count, scope=f"{lang_id}:{level}",
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

    # ---------------------------------------------------------- Social
    friend_tiers = [(i, f"{i} friend{'s' if i > 1 else ''}") for i in range(1, 13)]
    items += _tiered("friends", "social", "🤝", "friends", friend_tiers)
    follower_tiers = [(i * 2, f"{i * 2} followers") for i in range(1, 13)]
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
    item_tiers = [(i, f"{i} cosmetics") for i in range(1, 26)]
    items += _tiered("cosmetics", "collection", "💎", "cosmetics_owned", item_tiers)
    spend_tiers = [(i * 100, f"Spend {i * 100} Books") for i in range(1, 21)]
    items += _tiered("spend", "collection", "🛒", "books_spent", spend_tiers)
    earn_tiers = [(i * 100, f"Earn {i * 100} Books") for i in range(1, 21)]
    items += _tiered("earn", "collection", "📖", "books_earned", earn_tiers)

    # ---------------------------------------------------------- Achievement count
    ach_tiers = [(i * 5, f"{i * 5} achievements") for i in range(1, 61)]
    items += _tiered("ach", "special", "🏆", "achievements_earned", ach_tiers)
    items += [
        Achievement("collector-bronze", "Bronze Collector", "Earn 25 achievements.", "special", "🥉", "rare", "achievements_earned", 25),
        Achievement("collector-silver", "Silver Collector", "Earn 100 achievements.", "special", "🥈", "epic", "achievements_earned", 100),
        Achievement("collector-gold", "Gold Collector", "Earn 250 achievements.", "special", "🥇", "legendary", "achievements_earned", 250),
        Achievement("completionist", "Completionist", "Earn 500 achievements.", "special", "👑", "legendary", "achievements_earned", 500),
    ]

    # ---------------------------------------------------------- Language variety
    lang_tiers = [(i, f"{i} language{'s' if i > 1 else ''} started") for i in range(1, len(LANGUAGES) + 1)]
    items += _tiered("polyglot", "special", "🌐", "languages_started", lang_tiers)
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
