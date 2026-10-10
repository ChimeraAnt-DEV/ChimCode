<div align="center">

<img src="frontend/assets/icon/icon-256.png" width="128" height="128" alt="ChimCode app icon" />

# ChimCode

### Learn to code. Then build *anything.*

A premium, animated coding tutor that takes you from your very first `print()`
all the way to **Python bots, C++ engines and live servers** — with a 2D robot
named **Mochi** who hovers over your mistakes and explains exactly what to fix.

[![Languages](https://img.shields.io/badge/languages-11-7c5cff?style=for-the-badge)](.)
[![Lessons](https://img.shields.io/badge/lessons-57-22d3ee?style=for-the-badge)](.)
[![Achievements](https://img.shields.io/badge/achievements-707-fbbf24?style=for-the-badge)](.)
[![License](https://img.shields.io/badge/license-MIT-f472b6?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11%2B-3776ab?style=for-the-badge&logo=python&logoColor=white)](.)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](.)

</div>

---

## What makes ChimCode different

Most coding apps stop at `hello world`. ChimCode is built for people who want to
**build real things** — Discord bots, HTTP servers, scrapers, systems code — and
who want a tutor that actually watches their code.

- 🤖 **Mochi, a 2D animated robot tutor.** A real canvas-rendered robot with a
  head, torso, robotic arms and legs. It hovers *directly above your mistake*
  with a speech bubble telling you what is wrong and what it should be instead.
- ✨ **Transparent ghost text.** When you are missing a piece of code, faint
  green text appears exactly where you need to type it. You finish the line
  yourself — Mochi never does the work for you.
- 🗣️ **A bot voice.** Mochi explains concepts out loud in a synthesized bot
  voice while the text appears on screen.
- 🌟 **Super Days.** Spend Books to unlock a whole day of *only hard stuff*.
  Mochi explains as many times as you need, opens a menu of "same idea, new
  shape" practice problems, and narrates a full line-by-line walkthrough while
  you retype it yourself.
- 🏆 **707 achievements** across milestones, every language, lesson mastery,
  social play, your collection and Super Days.
- 👥 **A real social layer.** Custom accounts, profile pictures, bios,
  usernames, followers, friends, online/offline status and live progress.
- 📖 **Books currency.** Earn Books by learning and spend them on avatars,
  profile effects, card overlays, themes, banners and Super Days.
- 💎 **A VIP interface.** Glassmorphism, animated gradients, floating orbs,
  a premium dark theme and six unlockable themes.
- 📱 **A native Android app.** WebView shell with native Text-To-Speech for
  Mochi's voice, adaptive launcher icons and an in-app server setup screen.

---

## Downloads

### Option 1 — Clone and run (recommended)

```bash
git clone https://github.com/ChimeraAnt-DEV/ChimCode.git
cd ChimCode
./run.sh
```

Then open **<http://localhost:12000>**.

`run.sh` creates a virtual environment, installs the dependencies, generates a
secret key and starts the server. That is the whole setup.

### Option 2 — Download the ZIP

1. Click the green **`< > Code`** button on GitHub.
2. Choose **Download ZIP**, then unzip it.
3. Run `./run.sh` (macOS/Linux) or `python -m uvicorn app.main:app` from `server/`.

### Option 3 — Manual

```bash
cd server
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 12000
```

### Option 4 — Android app

A native Android app is included in [`android/`](android). It wraps ChimCode in
a WebView and adds **native Text-To-Speech**, so Mochi's voice works on Android.

**Download the APK** from the [**Releases page**](../../releases) — grab
`chimcode-1.0.0-android.apk`, enable *Install unknown apps*, and open it.

**Build it yourself:**

```bash
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleDebug               # or assembleRelease for a signed build
```

Requires JDK 17+ and Android SDK platform 34. See [`android/README.md`](android/README.md)
for the connect screen, signing and emulator details.

### App icon

The full icon set is generated and committed under
[`frontend/assets/icon/`](frontend/assets/icon) — PNGs from 16px to 1024px plus
an SVG. Regenerate them any time with:

```bash
python frontend/assets/icon/make_icons.py
```

It uses only the Python standard library, so no image tools are required.

---

## The languages you will master

| Language | Track highlights |
| --- | --- |
| 🐍 **Python** | Basics → classes, async, **Discord bots**, **FastAPI servers**, scraping, pytest |
| ⚙️ **C++** | Syntax, pointers, STL, memory & smart pointers, templates, **TCP servers**, profiling |
| 🟨 **JavaScript** | Variables, arrays & methods, async/await, **Node.js servers** |
| 🔷 **TypeScript** | Static types, interfaces, generics, unions |
| ☕ **Java** | Classes, inheritance, collections, **Spring Boot APIs** |
| 🎯 **C#** | Console apps, LINQ, async, Tasks |
| 🐹 **Go** | Packages, goroutines & channels, **net/http servers** |
| 🦀 **Rust** | Ownership & borrowing, `Result`/`Option`, error handling |
| 🗄️ **SQL** | `SELECT`, filtering, joins and aggregation |
| 🖥️ **Bash** | Scripts, loops, automation and pipes |
| 🎨 **HTML & CSS** | Structure, styling, animations, responsive layout |

Every lesson includes **theory**, a worked **example**, a hands-on **task**,
live **mistake detection**, a **multiple-choice check**, and most have a bonus
**challenge**.

---

## How Mochi teaches

1. **You type code.** The editor analyses it as you go.
2. **A mistake appears.** Mochi pops up above that exact line:

   > `'prnt' is not a python keyword. Did you mean 'print'?` → `print`

3. **Ghost text shows the fix.** Faint green text marks where the missing piece
   goes, so you complete it yourself.
4. **Run & check.** You get a score, a checklist and a list of what Mochi found.
5. **Ask Mochi anything.** It answers in the dock, in text and out loud.
6. **Watch Mochi build it.** A full narrated walkthrough — you retype every line.

On a **Super Day**, step 6 becomes the main event: the bot explains endlessly,
opens a menu of variations on the thing you are stuck on, and never writes the
answer for you.

---

## Features at a glance

<table>
<tr><td width="50%" valign="top">

**Learning**
- 11 languages, 57 guided lessons
- Beginner → expert difficulty tiers
- Live static mistake analysis
- Bot overlay above the error
- Ghost-text completion hints
- Narrated walkthroughs
- Quizzes and challenges
- Per-lesson progress tracking

</td><td width="50%" valign="top">

**Account & social**
- Email + password accounts
- Custom username, avatar, bio
- Public or private profiles
- Followers and friends
- Online / offline presence
- Leaderboard and live feed
- See anyone's progress & trophies

</td></tr>
<tr><td valign="top">

**Progression**
- 707 achievements, 17 categories
- XP, streaks and levels
- Books currency
- Rarity tiers: common → legendary

</td><td valign="top">

**Customisation**
- 8 avatars, 8 frames
- 6 profile effects
- 5 card overlays
- 6 themes
- 6 profile banners
- Super Day boosts

</td></tr>
</table>

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Backend | **FastAPI** + Uvicorn | Fast, typed, auto-documented |
| Database | **SQLite** (stdlib) | Zero-config, file-based, easy to reset |
| Auth | **PBKDF2 + HMAC JWT** (stdlib) | Secure hashing and tokens with no dependencies |
| Frontend | **Vanilla JS + Canvas** | No build step; the robot is drawn frame by frame |
| Android | **Kotlin + AndroidX WebView** | Native shell with a Text-To-Speech bridge |
| Icons | **stdlib PNG writer** | Reproducible assets, no tooling required |

The only third-party runtime dependencies are `fastapi`, `uvicorn` and
`pydantic`. Everything else — password hashing, JWTs, database, image
generation — is the Python standard library.

---

## Project layout

```
ChimCode/
├── frontend/                  # The premium single-page app (served by the API)
│   ├── index.html
│   ├── styles.css             # Glassmorphism, animations, six themes
│   ├── app.js                 # Routing, lessons, shop, profiles, onboarding
│   ├── bot.js                 # Mochi: canvas robot + speech-synthesis voice
│   ├── editor.js              # Editor, mistake markers, ghost text, bot overlay
│   ├── manifest.webmanifest
│   └── assets/icon/           # App icons 16→1024px, SVG, generator script
├── server/
│   ├── app/
│   │   ├── main.py            # FastAPI app and every API route
│   │   ├── database.py        # SQLite schema and helpers
│   │   ├── security.py        # PBKDF2 hashing + JWT
│   │   ├── engine.py          # Grading, mistake detection, walkthroughs
│   │   ├── achievements.py    # The 707-achievement engine
│   │   ├── shop.py            # Cosmetics catalogue
│   │   └── curriculum/        # Lesson content for every language
│   └── requirements.txt
├── android/                   # Native Android app (Kotlin + WebView + TTS)
│   ├── app/src/main/          # Activity, layout, manifest, launcher icons
│   ├── tools/                 # Launcher icon generator
│   └── gradlew                # Gradle wrapper
├── .github/workflows/         # CI that builds the APKs
├── run.sh                     # One-command launcher
└── README.md
```

---

## Configuration

All optional — sensible defaults apply.

| Variable | Default | Purpose |
| --- | --- | --- |
| `CHIMCODE_SECRET_KEY` | random per boot | Signing key for JWTs (set this in production) |
| `CHIMCODE_DATA_DIR` | `server/data` | Where the SQLite database lives |
| `CHIMCODE_SUPERDAY_COST` | `250` | Books required to start a Super Day |
| `CHIMCODE_JWT_HOURS` | `720` | Session lifetime in hours |
| `HOST` / `PORT` | `0.0.0.0` / `12000` | Bind address for `run.sh` |

---

## API reference

<details>
<summary><b>Click to expand the endpoints</b></summary>

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in, returns a token |
| `GET` | `/api/me` | Current user |
| `POST` | `/api/heartbeat` | Refresh online status |
| `GET` | `/api/catalogue` | All languages |
| `GET` | `/api/languages/{id}` | One language with lessons |
| `GET` | `/api/lessons/{id}` | One lesson with checks |
| `POST` | `/api/analyze` | Static analysis only (no rewards) |
| `POST` | `/api/submit` | Grade a submission, award rewards |
| `POST` | `/api/challenge` | Submit a challenge solution |
| `POST` | `/api/quiz` | Answer a lesson quiz |
| `POST` | `/api/bot/help` | Ask Mochi for help |
| `GET` | `/api/bot/walkthrough/{id}` | Narrated walkthrough |
| `POST` | `/api/superday/buy` | Activate a Super Day |
| `GET` | `/api/progress` | Lesson progress and stats |
| `GET` | `/api/achievements` | All achievements and earned state |
| `GET` | `/api/shop` | Cosmetics catalogue + wallet |
| `POST` | `/api/shop/buy/{id}` | Buy a cosmetic |
| `POST` | `/api/shop/equip/{id}` | Equip a cosmetic |
| `POST` | `/api/profile` | Update bio, avatar, privacy |
| `POST` | `/api/username` | Change your username |
| `POST` | `/api/onboarding` | Save onboarding answers |
| `GET` | `/api/users` | Public profiles |
| `GET` | `/api/users/{username}` | One profile with trophies |
| `POST` | `/api/follow/{username}` | Follow / unfollow |
| `POST` | `/api/friends/{username}` | Add / remove friend |
| `GET` | `/api/leaderboard` | Top coders by XP |
| `GET` | `/api/feed` | Live activity feed |
| `GET` | `/api/health` | Health and content counts |

</details>

Interactive docs are available at **`/docs`** while the server runs.

---

## Reset your data

The database is a single SQLite file. To start fresh:

```bash
rm -rf server/data
```

It will be recreated on the next boot.

---

## Roadmap

- [ ] Real code execution in a sandboxed runner
- [ ] Community-published lessons
- [ ] Mobile app wrapper (PWA install already works)
- [ ] More languages: PHP, Kotlin, Swift, Lua

---

## Contributing

Issues and pull requests are welcome. Please keep the frontend dependency-free
and the backend on the standard library wherever practical.

---

## License

Released under the [MIT License](LICENSE).

<div align="center">
<br />
<b>ChimCode</b> — because "hello world" was never the goal.
</div>
