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


def build() -> dict:
    languages = []
    for lang in LANGUAGES.values():
        data = lang.public(include_lessons=True)
        # full() adds checks and includes the quiz; add the correct index for grading.
        data["lessons"] = [lesson.full() for lesson in lang.lessons]
        for lesson, full in zip(lang.lessons, data["lessons"]):
            if full.get("quiz"):
                full["quiz"]["answer"] = lesson.quiz.answer
        languages.append(data)

    return {
        "config": {"superDayCost": SUPER_DAY_COST},
        "languages": languages,
        "achievements": [a.public() for a in ach.ACHIEVEMENTS],
        "achievementTotal": ach.TOTAL_ACHIEVEMENTS,
        "achievementCategories": ach.categories(),
        "achCategoryMeta": {
            k: {"name": v[0], "icon": v[1], "color": v[2]}
            for k, v in ach.CATEGORY_META.items()
        },
        "rarityPoints": ach.RARITY_POINTS,
        "shop": shop.shop_payload(),
        "storeSlots": list(shop.SLOTS.keys()),
        "slotNames": shop.SLOTS,
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
