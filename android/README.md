# ChimCode for Android

A native Android app that runs the **entire ChimCode web app offline**, with
Mochi's voice bridged to the native Android TextToSpeech engine.

**No server. No sign-up fees. No internet required.** The whole curriculum, all
707 achievements and the full UI ship inside the APK, and your progress is
saved on the device.

- Kotlin + AndroidX, `minSdk 24`, `targetSdk 34`
- Web app bundled under `assets/www` (copied from `frontend/` at build time)
- Native `TextToSpeech` exposed to the page as `window.ChimVoice`
- Progress and account stored in the WebView's `localStorage`
- Adaptive launcher icons generated from the shared icon renderer
- Optional advanced setting to point at a ChimCode server instead

## Build it yourself

You need **JDK 17+** and the **Android SDK** (platform 34, build-tools 34.0.0).

```bash
python3 tools/export_static_data.py     # refresh frontend/data/chimdata.js
cd android
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew assembleDebug
```

The APK lands in `app/build/outputs/apk/debug/app-debug.apk`.

To build a signed release APK, point the build at a keystore:

```bash
export CHIMCODE_KEYSTORE=$PWD/chimcode-release.keystore
export CHIMCODE_KEYSTORE_PASSWORD=your-store-password
export CHIMCODE_KEY_ALIAS=chimcode
export CHIMCODE_KEY_PASSWORD=your-key-password
./gradlew assembleRelease
```

Without those variables the release build falls back to debug signing, so it
still works locally.

## Install it

Enable **Install unknown apps** for your file manager or browser, then open the
APK. Or use adb:

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

## How it works

The app opens the bundled `file:///android_asset/www/index.html`. On load, the
frontend detects that it is running standalone and switches to its local
backend, which implements the whole API in the browser and persists to
`localStorage`. Nothing leaves the device.

An optional **Advanced: server connection** menu (the ⚙ button) lets you point
at a running ChimCode server instead — see the main README — for a shared
account across devices. Leave it on *Use offline only* and everything just
works.

## Regenerate the launcher icons

```bash
python3 android/tools/make_android_icons.py
```

Uses only the Python standard library and reads the shared renderer at
`frontend/assets/icon/make_icons.py`.

## Continuous integration

[`.github/workflows/android.yml`](../.github/workflows/android.yml) builds both
the debug and release APKs on every push to `android/`, regenerates the icons,
and uploads the APKs as workflow artifacts.
