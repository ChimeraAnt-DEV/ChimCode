"""Runtime configuration for the ChimCode server."""
from __future__ import annotations

import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("CHIMCODE_DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "chimcode.db"

# In production this must be provided through the environment.
SECRET_KEY = os.environ.get("CHIMCODE_SECRET_KEY") or secrets.token_urlsafe(48)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("CHIMCODE_JWT_HOURS", "720"))

# The frontend is served from this same process, so same-origin by default.
ALLOWED_ORIGINS = os.environ.get("CHIMCODE_ORIGINS", "*").split(",")

ONLINE_WINDOW_SECONDS = 90
SUPER_DAY_COST = int(os.environ.get("CHIMCODE_SUPERDAY_COST", "250"))
