package dev.chimera.chimcode

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.SharedPreferences
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.Locale

/**
 * ChimCode Android shell.
 *
 * The whole web app is bundled in the APK, so the app works immediately with
 * no server and no internet. Mochi's voice is bridged to the native Android
 * TextToSpeech engine, because the WebView speechSynthesis API is unreliable.
 *
 * An advanced option lets the user point at a remote ChimCode server instead.
 */
class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var prefs: SharedPreferences
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val bundledUrl = "file:///android_asset/www/index.html"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("chimcode", MODE_PRIVATE)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        progress = findViewById(R.id.progress)

        tts = TextToSpeech(this, this)
        configureWebView()

        findViewById<android.widget.Button>(R.id.menu_button).setOnClickListener {
            showServerMenu()
        }

        // Always start from the bundled app. No setup, no server, no waiting.
        load(bundledUrl)
    }

    // ------------------------------------------------------------ webview
    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        // Let the bundled page call out to a configured server if one is set.
        settings.allowUniversalAccessFromFileURLs = true
        settings.allowFileAccessFromFileURLs = true

        webView.addJavascriptInterface(ChimVoiceBridge(), "ChimVoice")
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                injectNativeVoice()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean = false
        }
    }

    private fun load(url: String) {
        progress.visibility = View.VISIBLE
        webView.loadUrl(url)
    }

    /**
     * Install the native voice shim and honour any saved server override so
     * the page boots against the right backend.
     */
    private fun injectNativeVoice() {
        val server = prefs.getString("server_url", "") ?: ""
        val js = """
            (function(){
              if (!window.__chimNativeVoice) {
                window.__chimNativeVoice = true;
                window.mochiVoice = {
                  enabled: true,
                  speak: function(text){
                    if (!this.enabled) return;
                    try { window.ChimVoice.speak(String(text)); } catch(e){}
                  },
                  stop: function(){ try { window.ChimVoice.stop(); } catch(e){} }
                };
              }
              var server = ${if (server.isBlank()) "null" else "'" + server + "'"};
              if (window.ChimAPI) { window.ChimAPI.setServer(server); }
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    inner class ChimVoiceBridge {
        @JavascriptInterface
        fun speak(text: String) {
            runOnUiThread {
                if (ttsReady) {
                    tts?.setPitch(1.35f)
                    tts?.setSpeechRate(1.02f)
                    tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "chimcode")
                }
            }
        }

        @JavascriptInterface
        fun stop() {
            runOnUiThread { tts?.stop() }
        }
    }

    // ------------------------------------------------------------ server menu
    private fun showServerMenu() {
        val view = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 8)
        }
        val info = TextView(this).apply {
            text = "ChimCode already works offline with no server.\n\n" +
                "Optionally connect to a ChimCode server on your network to use a shared account:"
            textSize = 14f
        }
        val input = EditText(this).apply {
            hint = "http://192.168.1.10:12000"
            setText(prefs.getString("server_url", ""))
        }
        view.addView(info)
        view.addView(input)

        AlertDialog.Builder(this)
            .setTitle("Advanced: server connection")
            .setView(view)
            .setPositiveButton("Use server") { _, _ ->
                val value = input.text.toString().trim().trimEnd('/')
                prefs.edit().putString("server_url", value).apply()
                restartBundled()
            }
            .setNeutralButton("Use offline only") { _, _ ->
                prefs.edit().putString("server_url", "").apply()
                restartBundled()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun restartBundled() {
        webView.clearCache(false)
        load(bundledUrl)
    }

    // ------------------------------------------------------------ tts
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            ttsReady = result != TextToSpeech.LANG_MISSING_DATA &&
                result != TextToSpeech.LANG_NOT_SUPPORTED
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }
}
