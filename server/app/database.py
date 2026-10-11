"""Thin SQLite access layer. Uses the stdlib only so setup stays trivial."""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import DB_PATH


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    pfp           TEXT NOT NULL DEFAULT 'chim-01',
    pfp_color     TEXT NOT NULL DEFAULT '#7c5cff',
    bio           TEXT NOT NULL DEFAULT '',
    books         INTEGER NOT NULL DEFAULT 120,
    streak        INTEGER NOT NULL DEFAULT 0,
    streak_day    TEXT NOT NULL DEFAULT '',
    xp            INTEGER NOT NULL DEFAULT 0,
    super_until   INTEGER NOT NULL DEFAULT 0,
    is_public     INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL,
    last_seen     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id   TEXT NOT NULL,
    language    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'in_progress',
    best_score  INTEGER NOT NULL DEFAULT 0,
    no_hints    INTEGER NOT NULL DEFAULT 0,
    attempts    INTEGER NOT NULL DEFAULT 0,
    updated_at  INTEGER NOT NULL,
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS achievements (
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    earned_at      INTEGER NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS inventory (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id  TEXT NOT NULL,
    owned_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS equipped (
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot     TEXT NOT NULL,
    item_id  TEXT NOT NULL,
    PRIMARY KEY (user_id, slot)
);

CREATE TABLE IF NOT EXISTS onboarding (
    user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    goal         TEXT NOT NULL DEFAULT '',
    experience   TEXT NOT NULL DEFAULT '',
    languages    TEXT NOT NULL DEFAULT '',
    hours        TEXT NOT NULL DEFAULT '',
    motivation   TEXT NOT NULL DEFAULT '',
    completed_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS friendships (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS super_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id  TEXT NOT NULL,
    language   TEXT NOT NULL,
    concept    TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    detail     TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stats (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key     TEXT NOT NULL,
    value   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
"""


def init_db() -> None:
    with db() as conn:
        conn.executescript(SCHEMA)
