#!/usr/bin/env python3
"""Export the curriculum, achievements and shop to static JS.

The Python modules stay the single source of truth. This writes
frontend/data/chimdata.js so the browser (and the Android app) can run
entirely offline with no server.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SERVER = Path(__file__).resolve().parent.parent / "server"
sys.path.insert(0, str(SERVER))

from app import achievements as ach  # noqa: E402
from app import shop  # noqa: E402
from app.config import SUPER_DAY_COST  # noqa: E402
from app.curriculum.registry import LANGUAGES, LESSON_INDEX  # noqa: E402


def _language_icon(lang_id: str) -> str:
    """Map each language to a vector icon name (no emoji)."""
    return {
        "python": "code", "cpp": "settings", "javascript": "bolt",
        "typescript": "code", "java": "server", "csharp": "target",
        "go": "heartbeat", "rust": "settings", "sql": "db",
        "bash": "terminal", "htmlcss": "palette",
    }.get(lang_id, "code")


# Achievement icons scale with rarity, so the trophy case reads at a glance.
_RARITY_ICON = {"common": "flag", "rare": "medal", "epic": "trophy", "legendary": "crown"}


def _achievement_icon(category: str, rarity: str) -> str:
    return {
        "milestone": "flag", "mastery": "medal", "social": "handshake",
        "collection": "gem", "superday": "star", "special": "sparkle",
    }.get(category, _RARITY_ICON[rarity])


_SHOP_ICON = {
    "avatar": "robot", "frame": "frame", "effect": "sparkle",
    "overlay": "layers", "theme": "palette", "banner": "image",
}


def build() -> dict:
    languages = []
    for lang in LANGUAGES.values():
        data = lang.public(include_lessons=True)
        data["icon"] = _language_icon(lang.id)
        # full() adds checks and includes the quiz; add the correct index for grading.
        data["lessons"] = [lesson.full() for lesson in lang.lessons]
        for lesson, full in zip(lang.lessons, data["lessons"]):
            if full.get("quiz"):
                full["quiz"]["answer"] = lesson.quiz.answer
        languages.append(data)

    achievements = []
    for a in ach.ACHIEVEMENTS:
        item = a.public()
        item["icon"] = _achievement_icon(a.category, a.rarity)
        achievements.append(item)

    categories = []
    for c in ach.categories():
        c = dict(c)
        c["icon"] = {
            "milestone": "flag", "mastery": "medal", "social": "handshake",
            "collection": "gem", "superday": "star", "special": "sparkle",
        }.get(c["id"], _language_icon(c["id"]))
        categories.append(c)

    items = []
    for item in shop.ITEMS:
        data = item.public()
        data["icon"] = _SHOP_ICON.get(item.slot, "gem")
        items.append(data)
    grouped: dict[str, list] = {s: [] for s in shop.SLOTS}
    for item in items:
        grouped.setdefault(item["slot"], []).append(item)
    shop_payload = {"slots": shop.SLOTS, "items": items, "grouped": grouped}

    return {
        "config": {"superDayCost": SUPER_DAY_COST},
        "languages": languages,
        "achievements": achievements,
        "achievementTotal": ach.TOTAL_ACHIEVEMENTS,
        "achievementCategories": categories,
        "achCategoryMeta": {
            k: {"name": v[0], "icon": {
                "milestone": "flag", "mastery": "medal", "social": "handshake",
                "collection": "gem", "superday": "star", "special": "sparkle",
            }.get(k, _language_icon(k)), "color": v[2]}
            for k, v in ach.CATEGORY_META.items()
        },
        "rarityPoints": ach.RARITY_POINTS,
        "shop": shop_payload,
        "storeSlots": list(shop.SLOTS.keys()),
        "slotNames": shop.SLOTS,
        "slotIcons": {s: _SHOP_ICON.get(s, "gem") for s in shop.SLOTS},
        "starterItems": sorted(shop.STARTER_ITEMS),
    }


def main() -> None:
    data = build()
    out = Path(__file__).resolve().parent.parent / "frontend" / "data" / "chimdata.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    out.write_text("window.CHIMDATA=" + payload + ";\n", encoding="utf-8")
    print(
        f"wrote {out.name} ({len(payload)} bytes) "
        f"languages={len(data['languages'])} lessons={len(LESSON_INDEX)} "
        f"achievements={data['achievementTotal']} shop={len(data['shop']['items'])}"
    )


if __name__ == "__main__":
    main()
