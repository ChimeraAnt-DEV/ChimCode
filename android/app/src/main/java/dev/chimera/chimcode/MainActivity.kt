package dev.chimera.chimcode

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.SharedPreferences
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.Locale

/**
 * ChimCode Android shell.
 *
 * Loads the ChimCode single-page app in a WebView and adds a native
 * Text-To-Speech bridge so Mochi's bot voice works on Android, where the
 * WebView speechSynthesis API is unreliable.
 */
class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var webView: WebView
    private lateinit var progress: ProgressBar
    private lateinit var setup: LinearLayout
    private lateinit var status: TextView
    private lateinit var prefs: SharedPreferences
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val defaultUrl = "http://10.0.2.2:12000"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("chimcode", MODE_PRIVATE)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        progress = findViewById(R.id.progress)
        setup = findViewById(R.id.setup)
        status = findViewById(R.id.setup_status)

        tts = TextToSpeech(this, this)
        configureWebView()

        val url = prefs.getString("server_url", null)
        if (url.isNullOrBlank()) {
            showSetup()
        } else {
            load(url)
        }
    }

    // ------------------------------------------------------------ setup
    private fun showSetup(message: String? = null) {
        setup.visibility = View.VISIBLE
        webView.visibility = View.GONE
        message?.let { status.text = it }
        findViewById<android.widget.Button>(R.id.setup_save).setOnClickListener {
            val input = findViewById<EditText>(R.id.setup_url)
            val value = input.text.toString().trim().trimEnd('/')
            if (!value.startsWith("http")) {
                status.text = "Enter a full address beginning with http://"
                return@setOnClickListener
            }
            prefs.edit().putString("server_url", value).apply()
            setup.visibility = View.GONE
            webView.visibility = View.VISIBLE
            load(value)
        }
        findViewById<android.widget.Button>(R.id.setup_reset).setOnClickListener {
            findViewById<EditText>(R.id.setup_url).setText(defaultUrl)
        }
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

        webView.addJavascriptInterface(ChimVoiceBridge(), "ChimVoice")
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                injectNativeVoice()
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (request.isForMainFrame) {
                    progress.visibility = View.GONE
                    showSetup("Could not reach the server. Check the address and that ChimCode is running.")
                }
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
     * Replace the web speech shim with a native-backed one so Mochi speaks
     * through the Android TextToSpeech engine.
     */
    private fun injectNativeVoice() {
        val js = """
            (function(){
              if (window.__chimNativeVoice) return;
              window.__chimNativeVoice = true;
              var shim = {
                enabled: true,
                speak: function(text){
                  if (!this.enabled) return;
                  try { window.ChimVoice.speak(String(text)); } catch(e){}
                },
                stop: function(){ try { window.ChimVoice.stop(); } catch(e){} }
              };
              window.mochiVoice = shim;
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

    // ------------------------------------------------------------ tts
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            ttsReady = result != TextToSpeech.LANG_MISSING_DATA &&
                result != TextToSpeech.LANG_NOT_SUPPORTED
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }
}
