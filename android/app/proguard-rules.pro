# Keep the WebView JavaScript interface used to bridge native TTS.
-keepclassmembers class dev.chimera.chimcode.MainActivity$ChimVoiceBridge {
    public *;
}
-keepattributes JavascriptInterface
