# ChimCode for Android

A native Android shell that wraps the ChimCode web app in a WebView and adds
a **native Text-To-Speech bridge**, so Mochi's bot voice works on Android
(the WebView `speechSynthesis` API is unreliable there).

- Kotlin + AndroidX, `minSdk 24`, `targetSdk 34`
- Native `TextToSpeech` exposed to the page as `window.ChimVoice`
- In-app server address setup screen
- Adaptive launcher icons generated from the shared icon renderer

## Build it yourself

You need **JDK 17+** and the **Android SDK** (platform 34, build-tools 34.0.0).

```bash
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

## Run it

The app needs to reach a running ChimCode server:

1. On your computer, start the server: `./run.sh` from the repo root.
2. Find the address your phone can reach:
   - **Android emulator:** `http://10.0.2.2:12000` (already the default button)
   - **Physical device on the same Wi-Fi:** `http://<your-computer-ip>:12000`
3. Open the app and enter that address on the connect screen.

`usesCleartextTraffic` is enabled so plain `http://` LAN addresses work. For a
public deployment, put the server behind HTTPS.

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
