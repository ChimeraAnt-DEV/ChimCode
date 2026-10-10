"""Cosmetics shop: avatars, effects, overlays, themes and profile frames."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

SLOTS = {
    "avatar": "Avatar",
    "effect": "Profile Effect",
    "overlay": "Card Overlay",
    "frame": "Avatar Frame",
    "theme": "Theme",
    "banner": "Profile Banner",
}


@dataclass
class ShopItem:
    id: str
    name: str
    slot: str
    rarity: str
    price: int
    icon: str
    description: str
    css: str = ""
    tags: list[str] = field(default_factory=list)

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "slot": self.slot,
            "slotName": SLOTS.get(self.slot, self.slot),
            "rarity": self.rarity,
            "price": self.price,
            "icon": self.icon,
            "description": self.description,
            "css": self.css,
            "tags": self.tags,
        }


def _item(**kw) -> ShopItem:
    return ShopItem(**kw)


ITEMS: list[ShopItem] = [
    # ------------------------------------------------------------- avatars
    _item(id="chim-01", name="Mochi Classic", slot="avatar", rarity="common", price=0,
          icon="🤖", description="The original Mochi look.", css="linear-gradient(135deg,#7c5cff,#22d3ee)", tags=["starter"]),
    _item(id="ava-astro", name="Astro Bot", slot="avatar", rarity="common", price=40,
          icon="🚀", description="A robot built for the stars.", css="linear-gradient(135deg,#0ea5e9,#312e81)"),
    _item(id="ava-neon", name="Neon Core", slot="avatar", rarity="rare", price=90,
          icon="💠", description="Glowing circuitry.", css="linear-gradient(135deg,#f472b6,#22d3ee)"),
    _item(id="ava-flame", name="Ember Unit", slot="avatar", rarity="rare", price=110,
          icon="🔥", description="Runs hot, never slow.", css="linear-gradient(135deg,#f97316,#b91c1c)"),
    _item(id="ava-void", name="Void Walker", slot="avatar", rarity="epic", price=200,
          icon="🌌", description="Compiled in deep space.", css="linear-gradient(135deg,#111827,#6d28d9)"),
    _item(id="ava-dragon", name="Syntax Dragon", slot="avatar", rarity="epic", price=240,
          icon="🐉", description="Breathes semicolons.", css="linear-gradient(135deg,#16a34a,#065f46)"),
    _item(id="ava-crown", name="Crowned Compiler", slot="avatar", rarity="legendary", price=420,
          icon="👑", description="Royalty of the terminal.", css="linear-gradient(135deg,#fbbf24,#b45309)"),
    _item(id="ava-prism", name="Prism Mind", slot="avatar", rarity="legendary", price=480,
          icon="🌈", description="Every language, one mind.", css="linear-gradient(135deg,#f43f5e,#8b5cf6,#22d3ee)"),

    # ------------------------------------------------------------- frames
    _item(id="frame-none", name="No Frame", slot="frame", rarity="common", price=0, icon="⬜",
          description="A clean look.", css="none", tags=["starter"]),
    _item(id="frame-gold", name="Gold Frame", slot="frame", rarity="rare", price=120, icon="🟡",
          description="A warm golden ring.", css="0 0 0 3px #fbbf24, 0 0 18px rgba(251,191,36,.7)"),
    _item(id="frame-neon", name="Neon Frame", slot="frame", rarity="epic", price=210, icon="🟢",
          description="A pulsing neon ring.", css="0 0 0 3px #22d3ee, 0 0 22px rgba(34,211,238,.8)"),
    _item(id="frame-royal", name="Royal Frame", slot="frame", rarity="legendary", price=380, icon="🟣",
          description="Regal and rare.", css="0 0 0 3px #a855f7, 0 0 26px rgba(168,85,247,.85)"),

    # ------------------------------------------------------------- effects
    _item(id="fx-none", name="No Effect", slot="effect", rarity="common", price=0, icon="➖",
          description="Nothing extra.", tags=["starter"]),
    _item(id="fx-sparkle", name="Sparkle Trail", slot="effect", rarity="rare", price=140, icon="✨",
          description="Twinkling particles follow your card.", css="sparkle"),
    _item(id="fx-matrix", name="Matrix Rain", slot="effect", rarity="epic", price=260, icon="🟩",
          description="Falling green code.", css="matrix"),
    _item(id="fx-aurora", name="Aurora Glow", slot="effect", rarity="epic", price=280, icon="🌠",
          description="A shifting aurora backdrop.", css="aurora"),
    _item(id="fx-galaxy", name="Galaxy Drift", slot="effect", rarity="legendary", price=460, icon="🌌",
          description="A slow galaxy rotation.", css="galaxy"),
    _item(id="fx-lightning", name="Storm Surge", slot="effect", rarity="legendary", price=500, icon="⚡",
          description="Crackling energy.", css="lightning"),

    # ------------------------------------------------------------- overlays
    _item(id="ov-none", name="No Overlay", slot="overlay", rarity="common", price=0, icon="▫️",
          description="Plain card.", tags=["starter"]),
    _item(id="ov-grid", name="Blueprint Grid", slot="overlay", rarity="common", price=50, icon="🟦",
          description="A technical grid overlay.", css="grid"),
    _item(id="ov-scanline", name="CRT Scanlines", slot="overlay", rarity="rare", price=100, icon="📺",
          description="Retro monitor lines.", css="scanline"),
    _item(id="ov-holo", name="Holo Sheen", slot="overlay", rarity="epic", price=220, icon="💿",
          description="Iridescent shine.", css="holo"),
    _item(id="ov-circuit", name="Circuit Trace", slot="overlay", rarity="epic", price=240, icon="🔌",
          description="Glowing traces.", css="circuit"),

    # ------------------------------------------------------------- themes
    _item(id="theme-midnight", name="Midnight VIP", slot="theme", rarity="common", price=0, icon="🌙",
          description="The default premium dark theme.", css="midnight", tags=["starter"]),
    _item(id="theme-cyber", name="Cyber Neon", slot="theme", rarity="rare", price=150, icon="🩷",
          description="Hot pink and cyan.", css="cyber"),
    _item(id="theme-emerald", name="Emerald Terminal", slot="theme", rarity="rare", price=150, icon="💚",
          description="Classic green screen.", css="emerald"),
    _item(id="theme-crimson", name="Crimson Forge", slot="theme", rarity="epic", price=230, icon="❤️‍🔥",
          description="Molten red.", css="crimson"),
    _item(id="theme-aurora", name="Aurora Dream", slot="theme", rarity="epic", price=250, icon="🫧",
          description="Soft shifting colours.", css="aurora"),
    _item(id="theme-royal", name="Royal Gold", slot="theme", rarity="legendary", price=440, icon="🏆",
          description="The VIP of VIP themes.", css="royal"),

    # ------------------------------------------------------------- banners
    _item(id="ban-none", name="No Banner", slot="banner", rarity="common", price=0, icon="⬛",
          description="No banner image.", tags=["starter"]),
    _item(id="ban-city", name="Neon City", slot="banner", rarity="rare", price=130, icon="🌆",
          description="Skyline at night.", css="linear-gradient(90deg,#1e1b4b,#7c3aed,#22d3ee)"),
    _item(id="ban-peaks", name="Data Peaks", slot="banner", rarity="rare", price=130, icon="⛰️",
          description="Mountains of data.", css="linear-gradient(90deg,#0f766e,#0ea5e9,#1e3a8a)"),
    _item(id="ban-sunset", name="Compile Sunset", slot="banner", rarity="epic", price=240, icon="🌅",
          description="Warm gradients.", css="linear-gradient(90deg,#f97316,#f43f5e,#7c3aed)"),
    _item(id="ban-matrix", name="Green Rain", slot="banner", rarity="epic", price=260, icon="🌿",
          description="Cascading code.", css="linear-gradient(90deg,#052e16,#16a34a,#052e16)"),
    _item(id="ban-royal", name="Crown Jewel", slot="banner", rarity="legendary", price=400, icon="💎",
          description="Banner of champions.", css="linear-gradient(90deg,#b45309,#fbbf24,#b45309)"),
]

ITEM_INDEX: dict[str, ShopItem] = {item.id: item for item in ITEMS}
STARTER_ITEMS = {item.id for item in ITEMS if "starter" in item.tags}
AVATAR_PRESETS = [
    {"id": "chim-01", "label": "Mochi", "color": "#7c5cff"},
    {"id": "chim-02", "label": "Bolt", "color": "#22d3ee"},
    {"id": "chim-03", "label": "Nova", "color": "#f472b6"},
    {"id": "chim-04", "label": "Turbo", "color": "#fbbf24"},
    {"id": "chim-05", "label": "Pixel", "color": "#34d399"},
    {"id": "chim-06", "label": "Byte", "color": "#f97316"},
]


def shop_payload() -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = {slot: [] for slot in SLOTS}
    for item in ITEMS:
        grouped.setdefault(item.slot, []).append(item.public())
    return {"slots": SLOTS, "items": [item.public() for item in ITEMS], "grouped": grouped}
