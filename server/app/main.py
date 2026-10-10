"""ChimCode API and static frontend host.

A single FastAPI application serves the JSON API under /api and the
premium single-page frontend from ../frontend.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import achievements as ach
from . import engine
from . import shop
from .config import ALLOWED_ORIGINS, ONLINE_WINDOW_SECONDS, SUPER_DAY_COST
from .curriculum.registry import LANGUAGES, LESSON_INDEX, catalogue, find_lesson
from .database import db, init_db
from .security import create_token, decode_token, hash_password, verify_password

app = FastAPI(title="ChimCode API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
now = lambda: int(time.time())


@app.on_event("startup")
def _startup() -> None:
    init_db()


# --------------------------------------------------------------------- models
class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    username: str
    password: str


class ProfileIn(BaseModel):
    pfp: str | None = None
    pfp_color: str | None = None
    bio: str | None = None
    is_public: bool | None = None


class OnboardingIn(BaseModel):
    goal: str
    experience: str
    languages: list[str] = []
    hours: str
    motivation: str


class SubmitIn(BaseModel):
    lesson_id: str
    code: str
    hints_used: int = 0
    quiz_correct: int = 0


class BotIn(BaseModel):
    lesson_id: str
    code: str = ""
    question: str = ""


class QuizIn(BaseModel):
    lesson_id: str
    option: int


# --------------------------------------------------------------------- helpers
def current_user(authorization: str = Header(default="")) -> dict[str, Any]:
    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (int(payload["sub"]),)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Unknown user")
    return dict(row)


def optional_user(authorization: str = Header(default="")) -> dict[str, Any] | None:
    try:
        return current_user(authorization)
    except HTTPException:
        return None


def touch(user_id: int) -> None:
    with db() as conn:
        conn.execute("UPDATE users SET last_seen = ? WHERE id = ?", (now(), user_id))


def bump_stat(conn, user_id: int, key: str, amount: int = 1) -> None:
    conn.execute(
        "INSERT INTO stats (user_id, key, value) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id, key) DO UPDATE SET value = value + excluded.value",
        (user_id, key, amount),
    )


def add_books(conn, user_id: int, amount: int) -> None:
    conn.execute("UPDATE users SET books = books + ? WHERE id = ?", (amount, user_id))
    if amount > 0:
        bump_stat(conn, user_id, "books_earned", amount)
    elif amount < 0:
        bump_stat(conn, user_id, "books_spent", -amount)


def log_activity(conn, user_id: int, kind: str, detail: str = "") -> None:
    conn.execute(
        "INSERT INTO activity (user_id, kind, detail, created_at) VALUES (?, ?, ?, ?)",
        (user_id, kind, detail, now()),
    )


def grant_achievement(conn, user_id: int, achievement_id: str) -> bool:
    if achievement_id not in ach.ACHIEVEMENT_INDEX:
        return False
    cur = conn.execute(
        "INSERT OR IGNORE INTO achievements (user_id, achievement_id, earned_at) VALUES (?, ?, ?)",
        (user_id, achievement_id, now()),
    )
    if cur.rowcount:
        bump_stat(conn, user_id, "achievements_earned", 1)
        item = ach.ACHIEVEMENT_INDEX[achievement_id]
        add_books(conn, user_id, ach.RARITY_POINTS[item.rarity] // 5)
        return True
    return False


def stats_dict(conn, user_id: int) -> dict[str, int]:
    rows = conn.execute("SELECT key, value FROM stats WHERE user_id = ?", (user_id,)).fetchall()
    return {r["key"]: r["value"] for r in rows}


def user_stats(conn, user_id: int) -> dict[str, int]:
    """Aggregate every metric the achievement engine can read."""
    s = stats_dict(conn, user_id)
    s.setdefault("xp", 0)
    s.setdefault("books_earned", 0)
    s.setdefault("books_spent", 0)

    progress = conn.execute(
        "SELECT lesson_id, language, status, best_score FROM lesson_progress WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    completed = [p for p in progress if p["status"] == "completed"]
    s["lessons_completed"] = len(completed)
    s["perfect_scores"] = sum(1 for p in completed if p["best_score"] >= 100)
    s["minutes"] = sum(
        LESSON_INDEX[p["lesson_id"]].minutes for p in completed if p["lesson_id"] in LESSON_INDEX
    )
    s["languages_started"] = len({p["language"] for p in progress})
    s["challenges_completed"] = sum(1 for p in progress if p["status"] == "challenged")
    s["hints_used"] = s.get("hints_used", 0)
    s["bot_helps"] = s.get("bot_helps", 0)
    s["super_days"] = s.get("super_days", 0)

    per_lang: dict[str, int] = {}
    for p in completed:
        per_lang[p["language"]] = per_lang.get(p["language"], 0) + 1
    per_lang_level: dict[str, int] = {}
    for p in completed:
        lesson = LESSON_INDEX.get(p["lesson_id"])
        if lesson:
            key = f"{lesson.language}:{lesson.level}"
            per_lang_level[key] = per_lang_level.get(key, 0) + 1

    friends = conn.execute("SELECT COUNT(*) c FROM friendships WHERE user_id = ?", (user_id,)).fetchone()["c"]
    followers = conn.execute("SELECT COUNT(*) c FROM follows WHERE followee_id = ?", (user_id,)).fetchone()["c"]
    following = conn.execute("SELECT COUNT(*) c FROM follows WHERE follower_id = ?", (user_id,)).fetchone()["c"]
    s["friends"] = friends
    s["followers"] = followers
    s["following"] = following
    s["cosmetics_owned"] = conn.execute(
        "SELECT COUNT(*) c FROM inventory WHERE user_id = ?", (user_id,)
    ).fetchone()["c"]
    s["streak"] = conn.execute("SELECT streak FROM users WHERE id = ?", (user_id,)).fetchone()["streak"]
    s["_per_lang"] = per_lang
    s["_per_lang_level"] = per_lang_level
    return s


def metric_value(metric: str, scope: str, stats: dict[str, int], conn, user_id: int) -> float:
    if metric == "completed_lesson":
        row = conn.execute(
            "SELECT status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
            (user_id, scope),
        ).fetchone()
        return 1 if row and row["status"] == "completed" else 0
    if metric == "aced_lesson":
        row = conn.execute(
            "SELECT best_score FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
            (user_id, scope),
        ).fetchone()
        return 1 if row and row["best_score"] >= 100 else 0
    if metric == "challenged_lesson":
        row = conn.execute(
            "SELECT status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
            (user_id, scope),
        ).fetchone()
        return 1 if row and row["status"] == "challenged" else 0
    if metric == "lessons_in":
        return stats.get("_per_lang", {}).get(scope, 0)
    if metric == "lessons_in_level":
        return stats.get("_per_lang_level", {}).get(scope, 0)
    if metric == "min_lessons_all_langs":
        per_lang = stats.get("_per_lang", {})
        return min((per_lang.get(l, 0) for l in LANGUAGES), default=0)
    if metric == "is_public":
        return stats.get("is_public", 0)
    return stats.get(metric, 0)


def evaluate_achievements(conn, user_id: int) -> list[dict[str, Any]]:
    stats = user_stats(conn, user_id)
    user = conn.execute("SELECT is_public FROM users WHERE id = ?", (user_id,)).fetchone()
    stats["is_public"] = user["is_public"] if user else 0
    newly: list[dict[str, Any]] = []
    for item in ach.ACHIEVEMENTS:
        value = metric_value(item.metric, item.scope, stats, conn, user_id)
        if value >= item.target:
            if grant_achievement(conn, user_id, item.id):
                newly.append(item.public())
    return newly


def public_user(conn, user: dict[str, Any], viewer_id: int | None = None) -> dict[str, Any]:
    equipped = {
        r["slot"]: r["item_id"]
        for r in conn.execute("SELECT slot, item_id FROM equipped WHERE user_id = ?", (user["id"],)).fetchall()
    }
    for slot in shop.SLOTS:
        equipped.setdefault(slot, next((i.id for i in shop.ITEMS if i.slot == slot and "starter" in i.tags), ""))
    earned = conn.execute("SELECT COUNT(*) c FROM achievements WHERE user_id = ?", (user["id"],)).fetchone()["c"]
    online = (now() - user["last_seen"]) <= ONLINE_WINDOW_SECONDS
    is_self = viewer_id == user["id"]
    return {
        "id": user["id"],
        "username": user["username"],
        "pfp": user["pfp"],
        "pfpColor": user["pfp_color"],
        "bio": user["bio"] if (is_self or user["is_public"]) else "",
        "books": user["books"] if is_self else None,
        "xp": user["xp"],
        "streak": user["streak"],
        "achievements": earned,
        "online": online,
        "public": bool(user["is_public"]),
        "superUntil": user["super_until"],
        "superActive": user["super_until"] > now(),
        "equipped": equipped,
        "joined": user["created_at"],
    }


def public_item_map() -> dict[str, dict[str, Any]]:
    return {i.id: i.public() for i in shop.ITEMS}


# --------------------------------------------------------------------- auth
@app.post("/api/auth/register")
def register(body: RegisterIn):
    username = body.username.strip()
    email = body.email.strip().lower()
    if not username.replace("_", "").isalnum():
        raise HTTPException(400, "Username may only contain letters, numbers and underscores.")
    if "@" not in email or "." not in email:
        raise HTTPException(400, "Please enter a valid email address.")
    with db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM users WHERE username = ? OR email = ?", (username, email)
        ).fetchone()
        if exists:
            raise HTTPException(409, "That username or email is already taken.")
        cur = conn.execute(
            "INSERT INTO users (username, email, password_hash, created_at, last_seen) VALUES (?, ?, ?, ?, ?)",
            (username, email, hash_password(body.password), now(), now()),
        )
        uid = cur.lastrowid
        for item in shop.STARTER_ITEMS:
            conn.execute(
                "INSERT OR IGNORE INTO inventory (user_id, item_id, owned_at) VALUES (?, ?, ?)",
                (uid, item, now()),
            )
        conn.execute(
            "INSERT INTO stats (user_id, key, value) VALUES (?, 'books_earned', 120) ON CONFLICT DO NOTHING",
            (uid,),
        )
        log_activity(conn, uid, "joined", "created an account")
    return {"token": create_token(uid, username), "username": username}


@app.post("/api/auth/login")
def login(body: LoginIn):
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (body.username.strip(), body.username.strip().lower()),
        ).fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(401, "Incorrect username or password.")
        conn.execute("UPDATE users SET last_seen = ? WHERE id = ?", (now(), row["id"]))
    return {"token": create_token(row["id"], row["username"]), "username": row["username"]}


@app.get("/api/me")
def me(user: dict = Depends(current_user)):
    touch(user["id"])
    with db() as conn:
        return public_user(conn, user, user["id"])


@app.post("/api/heartbeat")
def heartbeat(user: dict = Depends(current_user)):
    touch(user["id"])
    return {"online": True}


# --------------------------------------------------------------------- content
@app.get("/api/catalogue")
def get_catalogue():
    return {
        "languages": catalogue(),
        "achievementTotal": ach.TOTAL_ACHIEVEMENTS,
        "achievementCategories": ach.categories(),
    }


@app.get("/api/languages/{lang_id}")
def get_language(lang_id: str):
    lang = LANGUAGES.get(lang_id)
    if not lang:
        raise HTTPException(404, "Unknown language")
    return lang.public()


@app.get("/api/lessons/{lesson_id}")
def get_lesson(lesson_id: str, user: dict = Depends(current_user)):
    lesson = find_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Unknown lesson")
    with db() as conn:
        row = conn.execute(
            "SELECT status, best_score FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
            (user["id"], lesson_id),
        ).fetchone()
        super_active = conn.execute("SELECT super_until FROM users WHERE id = ?", (user["id"],)).fetchone()[
            "super_until"
        ] > now()
    data = lesson.full()
    data["progress"] = {"status": row["status"], "bestScore": row["best_score"]} if row else None
    data["superDay"] = super_active
    if super_active:
        data["superPlan"] = engine.superday_plan(lesson)
    return data


# --------------------------------------------------------------------- learning
@app.post("/api/submit")
def submit(body: SubmitIn, user: dict = Depends(current_user)):
    lesson = find_lesson(body.lesson_id)
    if not lesson:
        raise HTTPException(404, "Unknown lesson")
    report = engine.grade(lesson, body.code)
    rewards = {"books": 0, "xp": 0, "newAchievements": []}

    with db() as conn:
        touch(user["id"])
        status = "completed" if report["passed"] else "in_progress"
        prev = conn.execute(
            "SELECT status, best_score FROM lesson_progress WHERE user_id = ? AND lesson_id = ?",
            (user["id"], lesson.id),
        ).fetchone()
        best = max(report["score"], prev["best_score"] if prev else 0)
        conn.execute(
            "INSERT INTO lesson_progress (user_id, lesson_id, language, status, best_score, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, lesson_id) DO UPDATE SET "
            "status = excluded.status, best_score = excluded.best_score, updated_at = excluded.updated_at",
            (user["id"], lesson.id, lesson.language, status, best, now()),
        )
        if body.hints_used:
            bump_stat(conn, user["id"], "hints_used", body.hints_used)
        else:
            bump_stat(conn, user["id"], "no_hint_lessons", 1)
        if body.quiz_correct:
            bump_stat(conn, user["id"], "quiz_correct", body.quiz_correct)
        hour = time.localtime().tm_hour
        if hour >= 0 and hour < 5:
            bump_stat(conn, user["id"], "night_sessions", 1)
        elif hour < 7:
            bump_stat(conn, user["id"], "morning_sessions", 1)

        if report["passed"] and (not prev or prev["status"] != "completed"):
            gained_books = 20 + lesson.minutes
            gained_xp = 50 + lesson.minutes * 5
            add_books(conn, user["id"], gained_books)
            conn.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (gained_xp, user["id"]))
            bump_stat(conn, user["id"], "xp", gained_xp)
            bump_stat(conn, user["id"], "lessons_completed", 1)
            if report["score"] >= 100:
                bump_stat(conn, user["id"], "perfect_scores", 1)
            rewards["books"] = gained_books
            rewards["xp"] = gained_xp
            log_activity(conn, user["id"], "lesson", f"completed {lesson.title}")

        rewards["newAchievements"] = evaluate_achievements(conn, user["id"])

    return {**report, "rewards": rewards}


@app.post("/api/analyze")
def analyze_only(body: BotIn, user: dict = Depends(current_user)):
    """Static analysis only: no progress, rewards or side effects."""
    lesson = find_lesson(body.lesson_id)
    if not lesson:
        raise HTTPException(404, "Unknown lesson")
    return engine.grade(lesson, body.code)


@app.post("/api/challenge")
def challenge(body: SubmitIn, user: dict = Depends(current_user)):
    lesson = find_lesson(body.lesson_id)
    if not lesson:
        raise HTTPException(404, "Unknown lesson")
    report = engine.grade(lesson, body.code)
    with db() as conn:
        touch(user["id"])
        if report["passed"]:
            conn.execute(
                "INSERT INTO lesson_progress (user_id, lesson_id, language, status, best_score, updated_at) "
                "VALUES (?, ?, ?, 'challenged', ?, ?) ON CONFLICT(user_id, lesson_id) DO UPDATE SET "
                "status = 'challenged', best_score = MAX(best_score, excluded.best_score), updated_at = excluded.updated_at",
                (user["id"], lesson.id, lesson.language, report["score"], now()),
            )
            add_books(conn, user["id"], 45)
            conn.execute("UPDATE users SET xp = xp + 120 WHERE id = ?", (user["id"],))
            bump_stat(conn, user["id"], "xp", 120)
            bump_stat(conn, user["id"], "challenges_completed", 1)
            log_activity(conn, user["id"], "challenge", f"beat the challenge for {lesson.title}")
        newly = evaluate_achievements(conn, user["id"])
    return {**report, "rewards": {"books": 45 if report["passed"] else 0, "xp": 120 if report["passed"] else 0,
                                  "newAchievements": newly}}


@app.post("/api/quiz")
def quiz(body: QuizIn, user: dict = Depends(current_user)):
    lesson = find_lesson(body.lesson_id)
    if not lesson or not lesson.quiz:
        raise HTTPException(404, "No quiz for this lesson")
    correct = body.option == lesson.quiz.answer
    with db() as conn:
        touch(user["id"])
        if correct:
            bump_stat(conn, user["id"], "quiz_correct", 1)
            add_books(conn, user["id"], 5)
            conn.execute("UPDATE users SET xp = xp + 15 WHERE id = ?", (user["id"],))
            bump_stat(conn, user["id"], "xp", 15)
        newly = evaluate_achievements(conn, user["id"])
    return {"correct": correct, "answer": lesson.quiz.answer, "explanation": lesson.quiz.explanation,
            "newAchievements": newly}


@app.post("/api/bot/help")
def bot_help(body: BotIn, user: dict = Depends(current_user)):
    lesson = find_lesson(body.lesson_id)
    if not lesson:
        raise HTTPException(404, "Unknown lesson")
    with db() as conn:
        touch(user["id"])
        bump_stat(conn, user["id"], "bot_helps", 1)
        newly = evaluate_achievements(conn, user["id"])
    reply = engine.bot_explain(lesson, body.code, body.question)
    reply["newAchievements"] = newly
    return reply


@app.get("/api/bot/walkthrough/{lesson_id}")
def bot_walkthrough(lesson_id: str, user: dict = Depends(current_user)):
    lesson = find_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Unknown lesson")
    return engine.walkthrough(lesson)


# --------------------------------------------------------------------- super day
@app.post("/api/superday/buy")
def buy_superday(user: dict = Depends(current_user)):
    with db() as conn:
        row = conn.execute("SELECT books, super_until FROM users WHERE id = ?", (user["id"],)).fetchone()
        if row["super_until"] > now():
            return {"active": True, "until": row["super_until"], "message": "A Super Day is already running."}
        if row["books"] < SUPER_DAY_COST:
            raise HTTPException(400, f"Super Days cost {SUPER_DAY_COST} Books.")
        conn.execute("UPDATE users SET books = books - ?, super_until = ? WHERE id = ?",
                     (SUPER_DAY_COST, now() + 86400, user["id"]))
        bump_stat(conn, user["id"], "books_spent", SUPER_DAY_COST)
        bump_stat(conn, user["id"], "super_days", 1)
        log_activity(conn, user["id"], "superday", "activated a Super Day")
        newly = evaluate_achievements(conn, user["id"])
    return {"active": True, "until": now() + 86400, "newAchievements": newly}


@app.post("/api/superday/log")
def log_superday(body: dict, user: dict = Depends(current_user)):
    minutes = int(body.get("minutes", 0))
    with db() as conn:
        bump_stat(conn, user["id"], "super_minutes", minutes)
        newly = evaluate_achievements(conn, user["id"])
    return {"newAchievements": newly}


# --------------------------------------------------------------------- progress
@app.get("/api/progress")
def progress(user: dict = Depends(current_user)):
    with db() as conn:
        rows = conn.execute(
            "SELECT lesson_id, language, status, best_score, updated_at FROM lesson_progress WHERE user_id = ?",
            (user["id"],),
        ).fetchall()
        earned = {r["achievement_id"] for r in conn.execute(
            "SELECT achievement_id FROM achievements WHERE user_id = ?", (user["id"],)).fetchall()}
        stats = user_stats(conn, user["id"])
    return {
        "progress": [dict(r) for r in rows],
        "earned": sorted(earned),
        "stats": {k: v for k, v in stats.items() if not k.startswith("_")},
    }


@app.get("/api/achievements")
def achievements(user: dict = Depends(current_user)):
    with db() as conn:
        rows = conn.execute(
            "SELECT achievement_id, earned_at FROM achievements WHERE user_id = ?", (user["id"],)
        ).fetchall()
    earned = {r["achievement_id"]: r["earned_at"] for r in rows}
    items = []
    for item in ach.ACHIEVEMENTS:
        data = item.public()
        data["earned"] = item.id in earned
        data["earnedAt"] = earned.get(item.id)
        items.append(data)
    return {"total": ach.TOTAL_ACHIEVEMENTS, "earned": len(earned), "categories": ach.categories(), "achievements": items}


# --------------------------------------------------------------------- shop
@app.get("/api/shop")
def get_shop(user: dict = Depends(current_user)):
    with db() as conn:
        owned = {r["item_id"] for r in conn.execute(
            "SELECT item_id FROM inventory WHERE user_id = ?", (user["id"],)).fetchall()}
        equipped = {r["slot"]: r["item_id"] for r in conn.execute(
            "SELECT slot, item_id FROM equipped WHERE user_id = ?", (user["id"],)).fetchall()}
        books = conn.execute("SELECT books FROM users WHERE id = ?", (user["id"],)).fetchone()["books"]
    payload = shop.shop_payload()
    for item in payload["items"]:
        item["owned"] = item["id"] in owned or item["price"] == 0
        item["equipped"] = equipped.get(item["slot"]) == item["id"]
    for slot in shop.SLOTS:
        equipped.setdefault(slot, next((i.id for i in shop.ITEMS if i.slot == slot and "starter" in i.tags), ""))
    return {**payload, "owned": sorted(owned), "equipped": equipped, "books": books,
            "superDayCost": SUPER_DAY_COST}


@app.post("/api/shop/buy/{item_id}")
def buy_item(item_id: str, user: dict = Depends(current_user)):
    item = shop.ITEM_INDEX.get(item_id)
    if not item:
        raise HTTPException(404, "Unknown item")
    with db() as conn:
        owned = conn.execute(
            "SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?", (user["id"], item_id)
        ).fetchone()
        if owned or item.price == 0:
            conn.execute("INSERT OR IGNORE INTO inventory (user_id, item_id, owned_at) VALUES (?, ?, ?)",
                         (user["id"], item_id, now()))
            return {"owned": True, "message": "Already yours."}
        books = conn.execute("SELECT books FROM users WHERE id = ?", (user["id"],)).fetchone()["books"]
        if books < item.price:
            raise HTTPException(400, "Not enough Books.")
        conn.execute("UPDATE users SET books = books - ? WHERE id = ?", (item.price, user["id"]))
        conn.execute("INSERT INTO inventory (user_id, item_id, owned_at) VALUES (?, ?, ?)",
                     (user["id"], item_id, now()))
        bump_stat(conn, user["id"], "books_spent", item.price)
        newly = evaluate_achievements(conn, user["id"])
    return {"owned": True, "books": books - item.price, "newAchievements": newly}


@app.post("/api/shop/equip/{item_id}")
def equip_item(item_id: str, user: dict = Depends(current_user)):
    item = shop.ITEM_INDEX.get(item_id)
    if not item:
        raise HTTPException(404, "Unknown item")
    with db() as conn:
        owned = conn.execute(
            "SELECT 1 FROM inventory WHERE user_id = ? AND item_id = ?", (user["id"], item_id)
        ).fetchone()
        if not owned and item.price > 0:
            raise HTTPException(403, "You do not own this item.")
        conn.execute(
            "INSERT INTO equipped (user_id, slot, item_id) VALUES (?, ?, ?) "
            "ON CONFLICT(user_id, slot) DO UPDATE SET item_id = excluded.item_id",
            (user["id"], item.slot, item_id),
        )
    return {"equipped": {item.slot: item_id}}


@app.post("/api/shop/unequip/{slot}")
def unequip_item(slot: str, user: dict = Depends(current_user)):
    if slot not in shop.SLOTS:
        raise HTTPException(404, "Unknown slot")
    with db() as conn:
        conn.execute("DELETE FROM equipped WHERE user_id = ? AND slot = ?", (user["id"], slot))
    return {"ok": True}


# --------------------------------------------------------------------- profile
@app.post("/api/profile")
def update_profile(body: ProfileIn, user: dict = Depends(current_user)):
    with db() as conn:
        fields, values = [], []
        if body.pfp is not None:
            fields.append("pfp = ?"); values.append(body.pfp)
        if body.pfp_color is not None:
            fields.append("pfp_color = ?"); values.append(body.pfp_color)
        if body.bio is not None:
            fields.append("bio = ?"); values.append(body.bio[:280])
        if body.is_public is not None:
            fields.append("is_public = ?"); values.append(1 if body.is_public else 0)
        if fields:
            values.append(user["id"])
            conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)
            bump_stat(conn, user["id"], "profile_edits", 1)
            newly = evaluate_achievements(conn, user["id"])
        else:
            newly = []
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        result = public_user(conn, dict(row), user["id"])
    return {**result, "newAchievements": newly}


@app.post("/api/username")
def change_username(body: dict, user: dict = Depends(current_user)):
    new_name = str(body.get("username", "")).strip()
    if len(new_name) < 3 or len(new_name) > 20 or not new_name.replace("_", "").isalnum():
        raise HTTPException(400, "Usernames are 3-20 letters, numbers or underscores.")
    with db() as conn:
        taken = conn.execute("SELECT 1 FROM users WHERE username = ? AND id != ?", (new_name, user["id"])).fetchone()
        if taken:
            raise HTTPException(409, "That username is already taken.")
        conn.execute("UPDATE users SET username = ? WHERE id = ?", (new_name, user["id"]))
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        result = public_user(conn, dict(row), user["id"])
    return {**result, "token": create_token(user["id"], new_name)}


@app.post("/api/onboarding")
def onboarding(body: OnboardingIn, user: dict = Depends(current_user)):
    with db() as conn:
        conn.execute(
            "INSERT INTO onboarding (user_id, goal, experience, languages, hours, motivation, completed_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET goal = excluded.goal, "
            "experience = excluded.experience, languages = excluded.languages, hours = excluded.hours, "
            "motivation = excluded.motivation, completed_at = excluded.completed_at",
            (user["id"], body.goal, body.experience, ",".join(body.languages), body.hours, body.motivation, now()),
        )
        add_books(conn, user["id"], 50)
        conn.execute("UPDATE users SET xp = xp + 30 WHERE id = ?", (user["id"],))
        bump_stat(conn, user["id"], "xp", 30)
        newly = evaluate_achievements(conn, user["id"])
    return {"ok": True, "books": 50, "newAchievements": newly}


@app.get("/api/onboarding")
def get_onboarding(user: dict = Depends(current_user)):
    with db() as conn:
        row = conn.execute("SELECT * FROM onboarding WHERE user_id = ?", (user["id"],)).fetchone()
    if not row:
        return {"completed": False}
    data = dict(row)
    data["languages"] = [l for l in data["languages"].split(",") if l]
    data["completed"] = data["completed_at"] > 0
    return data


# --------------------------------------------------------------------- social
@app.get("/api/users")
def list_users(user: dict = Depends(current_user)):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM users WHERE id != ? AND is_public = 1 ORDER BY last_seen DESC LIMIT 60",
            (user["id"],),
        ).fetchall()
        out = []
        for row in rows:
            out.append(public_user(conn, dict(row), user["id"]))
        me_friends = {r["friend_id"] for r in conn.execute(
            "SELECT friend_id FROM friendships WHERE user_id = ?", (user["id"],)).fetchall()}
        me_follows = {r["followee_id"] for r in conn.execute(
            "SELECT followee_id FROM follows WHERE follower_id = ?", (user["id"],)).fetchall()}
    for item in out:
        item["isFriend"] = item["id"] in me_friends
        item["isFollowing"] = item["id"] in me_follows
    return {"users": out}


@app.get("/api/users/{username}")
def get_user(username: str, viewer: dict = Depends(optional_user)):
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            raise HTTPException(404, "User not found")
        user = dict(row)
        if not user["is_public"] and (not viewer or viewer["id"] != user["id"]):
            raise HTTPException(403, "This profile is private.")
        profile = public_user(conn, user, viewer["id"] if viewer else None)
        earned = conn.execute(
            "SELECT achievement_id, earned_at FROM achievements WHERE user_id = ? ORDER BY earned_at DESC",
            (user["id"],),
        ).fetchall()
        profile["achievementList"] = [
            {**ach.ACHIEVEMENT_INDEX[r["achievement_id"]].public(), "earnedAt": r["earned_at"]}
            for r in earned if r["achievement_id"] in ach.ACHIEVEMENT_INDEX
        ]
        profile["progress"] = [dict(r) for r in conn.execute(
            "SELECT lesson_id, language, status, best_score FROM lesson_progress WHERE user_id = ?",
            (user["id"],)).fetchall()]
        profile["followers"] = conn.execute(
            "SELECT COUNT(*) c FROM follows WHERE followee_id = ?", (user["id"],)).fetchone()["c"]
        profile["following"] = conn.execute(
            "SELECT COUNT(*) c FROM follows WHERE follower_id = ?", (user["id"],)).fetchone()["c"]
        if viewer:
            profile["isFollowing"] = bool(conn.execute(
                "SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?",
                (viewer["id"], user["id"])).fetchone())
            profile["isFriend"] = bool(conn.execute(
                "SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?",
                (viewer["id"], user["id"])).fetchone())
    return profile


@app.post("/api/follow/{username}")
def follow(username: str, user: dict = Depends(current_user)):
    with db() as conn:
        target = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not target or target["id"] == user["id"]:
            raise HTTPException(404, "User not found")
        existing = conn.execute(
            "SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?", (user["id"], target["id"])
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?",
                         (user["id"], target["id"]))
            state = False
        else:
            conn.execute("INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)",
                         (user["id"], target["id"], now()))
            state = True
        evaluate_achievements(conn, user["id"])
    return {"following": state}


@app.post("/api/friends/{username}")
def toggle_friend(username: str, user: dict = Depends(current_user)):
    with db() as conn:
        target = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not target or target["id"] == user["id"]:
            raise HTTPException(404, "User not found")
        existing = conn.execute(
            "SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?", (user["id"], target["id"])
        ).fetchone()
        if existing:
            conn.execute("DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
                         (user["id"], target["id"], target["id"], user["id"]))
            state = False
        else:
            conn.execute("INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)",
                         (user["id"], target["id"], now()))
            conn.execute("INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)",
                         (target["id"], user["id"], now()))
            state = True
        evaluate_achievements(conn, user["id"])
    return {"friends": state}


@app.get("/api/leaderboard")
def leaderboard(user: dict = Depends(current_user)):
    with db() as conn:
        rows = conn.execute(
            "SELECT u.*, (SELECT COUNT(*) FROM achievements a WHERE a.user_id = u.id) AS ach_count "
            "FROM users u WHERE u.is_public = 1 ORDER BY u.xp DESC LIMIT 25"
        ).fetchall()
        out = []
        for i, row in enumerate(rows, start=1):
            data = public_user(conn, dict(row), user["id"])
            data["rank"] = i
            data["achievements"] = row["ach_count"]
            out.append(data)
    return {"leaders": out}


@app.get("/api/feed")
def feed(user: dict = Depends(current_user)):
    with db() as conn:
        rows = conn.execute(
            "SELECT a.*, u.username, u.pfp, u.pfp_color FROM activity a JOIN users u ON u.id = a.user_id "
            "WHERE u.is_public = 1 ORDER BY a.created_at DESC LIMIT 40"
        ).fetchall()
    return {"feed": [dict(r) for r in rows]}


@app.get("/api/health")
def health():
    return {"status": "ok", "achievements": ach.TOTAL_ACHIEVEMENTS, "languages": len(LANGUAGES),
            "lessons": len(LESSON_INDEX)}


# --------------------------------------------------------------------- frontend
if FRONTEND_DIR.exists():
    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIR / "index.html")

    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
