# AGENTS.md

Repository-specific knowledge for ChimCode.

## What this is
A coding tutor that runs **with no server at all**. The web app is a static
site; a JavaScript backend (`frontend/local.js`) implements the whole API in the
browser and persists to `localStorage`. An optional Python/FastAPI server in
`server/` adds shared accounts and a REST API. A native Android app bundles the
web app so it is offline out of the box.

## Run it
```bash
# No server (default): just serve the static frontend
cd frontend && python3 -m http.server 8080

# Optional server
./run.sh                       # creates venv, installs deps, serves on :12000

# Tests
node tools/test_local_backend.js
```
Env knobs (server only): `CHIMCODE_SECRET_KEY`, `CHIMCODE_DATA_DIR`,
`CHIMCODE_SUPERDAY_COST`, `CHIMCODE_JWT_HOURS`, `HOST`, `PORT`.

## Key facts
- **No build step** for the frontend. Edit `frontend/*.js` / `styles.css` directly.
- **Single source of truth:** curriculum, achievements and shop live in
  `server/app/`. Run `python3 tools/export_static_data.py` after changing them;
  it regenerates `frontend/data/chimdata.js`, which the offline engine reads.
  Never hand-edit `chimdata.js`.
- **Two engines that must stay in sync:** `server/app/engine.py` and
  `frontend/engine.js`. `tools/test_local_backend.js` covers the JS one; when you
  change grading or mistake detection, change both.
- `frontend/api.js` picks the backend: explicit server > co-located server (when
  served over http) > local. The app must always work in local mode.
- The lesson **engine never executes user code**. Static analysis only.
- **707 achievements** are generated deterministically in
  `server/app/achievements.py`. If you change lesson counts or add languages,
  re-check the total stays > 700 (and re-export).
- App icons: web via `frontend/assets/icon/make_icons.py`, Android via
  `android/tools/make_android_icons.py` (both stdlib PNG writers).
- The server data dir (`server/data/`) is gitignored. `rm -rf server/data` resets it.

## Layout
- `frontend/app.js` — routing, all views, onboarding
- `frontend/api.js` — backend selection (local vs server)
- `frontend/local.js` — the entire API implemented in the browser
- `frontend/engine.js` — grading, mistake detection, ghost text, walkthroughs
- `frontend/bot.js` — the Mochi robot (canvas) + speech voice
- `frontend/editor.js` — editor, error markers, ghost text, bot bubble
- `frontend/data/chimdata.js` — generated content data (do not edit by hand)
- `server/app/` — optional FastAPI server (routes, engine, content)
- `tools/export_static_data.py` — content exporter
- `tools/test_local_backend.js` — headless tests for the offline backend
- `android/` — native Android shell (Kotlin WebView + native TTS bridge)

## Android
- The web app is copied into `android/app/src/main/assets/www` by a Gradle
  `Copy` task at build time (`copyWebAssets`), so the APK is fully offline.
- `MainActivity` loads `file:///android_asset/www/index.html` and injects a
  `window.mochiVoice` shim backed by Android `TextToSpeech` (via the `ChimVoice`
  JavaScript interface). WebView `speechSynthesis` is unreliable on Android.
- The ⚙ button opens an optional server override.
- Build with the committed Gradle wrapper; needs JDK 17+ and Android SDK 34.
  `android/local.properties` (`sdk.dir=...`) is gitignored.
- Release signing reads `CHIMCODE_KEYSTORE`, `CHIMCODE_KEYSTORE_PASSWORD`,
  `CHIMCODE_KEY_ALIAS`, `CHIMCODE_KEY_PASSWORD`; falls back to debug signing.

## Environment note
The runtime may reset non-`/workspace` state between sessions. If `java` is
missing, `sudo apt-get install -y openjdk-21-jdk-headless`. For Android builds
prefer installing the SDK under `/workspace/.toolchain/android-sdk` so it
survives resets.

## Conventions
- Lessons: add to the relevant `*_lessons.py`, then they appear via the registry.
  Each `Lesson` needs `checks` (list of `contains`/`regex`/etc. from
  `curriculum/schema.py`).
- Keep API responses camelCase for frontend fields, snake_case internally.
- Test with the full flow: register -> onboarding -> submit -> shop -> superday.

## Gotcha
A short-lived background server may still hold port 12000 between runs. Kill it
with a targeted `pkill -f "uvicorn app.main"` style match before restarting.
