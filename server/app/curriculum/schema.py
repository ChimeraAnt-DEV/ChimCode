"""Lesson schema and helpers shared by every language module."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Quiz:
    question: str
    options: list[str]
    answer: int
    explanation: str = ""


@dataclass
class Lesson:
    id: str
    language: str
    title: str
    concept: str
    level: str  # beginner | intermediate | advanced | expert
    minutes: int
    theory: list[str]
    example: str
    task: str
    starter: str
    checks: list[dict[str, Any]]
    hints: list[str] = field(default_factory=list)
    quiz: Quiz | None = None
    challenge: str = ""
    challenge_starter: str = ""
    # A known-correct solution. Used for the "type this next" hint and the
    # narrated walkthrough, so those never point at code that fails the task.
    solution: str = ""
    tags: list[str] = field(default_factory=list)

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "language": self.language,
            "title": self.title,
            "concept": self.concept,
            "level": self.level,
            "minutes": self.minutes,
            "theory": self.theory,
            "example": self.example,
            "task": self.task,
            "starter": self.starter,
            "hints": self.hints,
            "challenge": self.challenge,
            "challengeStarter": self.challenge_starter,
            "solution": self.solution,
            "tags": self.tags,
        }

    def full(self) -> dict[str, Any]:
        data = self.public()
        data["checks"] = self.checks
        if self.quiz:
            data["quiz"] = {
                "question": self.quiz.question,
                "options": self.quiz.options,
                "explanation": self.quiz.explanation,
            }
        return data


@dataclass
class Language:
    id: str
    name: str
    tagline: str
    icon: str
    color: str
    blurb: str
    lessons: list[Lesson] = field(default_factory=list)

    def public(self, include_lessons: bool = True) -> dict[str, Any]:
        data = {
            "id": self.id,
            "name": self.name,
            "tagline": self.tagline,
            "icon": self.icon,
            "color": self.color,
            "blurb": self.blurb,
            "lessonCount": len(self.lessons),
            "levels": sorted({lesson.level for lesson in self.lessons}),
        }
        if include_lessons:
            data["lessons"] = [lesson.public() for lesson in self.lessons]
        return data


def contains(value: str, message: str) -> dict[str, Any]:
    return {"type": "contains", "value": value, "message": message}


def regex(pattern: str, message: str) -> dict[str, Any]:
    return {"type": "regex", "value": pattern, "message": message}


def not_contains(value: str, message: str) -> dict[str, Any]:
    return {"type": "not_contains", "value": value, "message": message}


def balanced(message: str) -> dict[str, Any]:
    return {"type": "balanced", "value": "", "message": message}


def min_lines(count: int, message: str) -> dict[str, Any]:
    return {"type": "min_lines", "value": count, "message": message}
