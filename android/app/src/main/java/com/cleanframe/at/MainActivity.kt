package com.cleanframe.at

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private val launcherUrl = "https://yuanchensbg.github.io/CleanFrame-AT/"
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            // Ambilight und Shelly laufen über http im Heimnetz, die Seite selbst über https
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            isFocusable = true
            isFocusableInTouchMode = true
            addJavascriptInterface(Bridge(), "Android")
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    // Nur reagieren, wenn die Seite selbst nicht lädt, nicht bei offline Smart-Home-Geräten
                    if (request.isForMainFrame) {
                        view.loadData(OFFLINE_HTML, "text/html; charset=utf-8", "UTF-8")
                        view.postDelayed({ view.loadUrl(launcherUrl) }, 10_000)
                    }
                }
            }
        }

        setContentView(webView)
        hideSystemBars()
        webView.loadUrl(launcherUrl)
        webView.requestFocus()
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        webView.requestFocus()
    }

    @Deprecated("Launcher bleibt offen, Zurück-Taste schließt ihn nicht")
    override fun onBackPressed() {
        webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))", null)
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
    }

    inner class Bridge {
        @JavascriptInterface
        fun launchApp(packageName: String) {
            runOnUiThread {
                val intent = packageManager.getLeanbackLaunchIntentForPackage(packageName)
                    ?: packageManager.getLaunchIntentForPackage(packageName)
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(intent)
                } else {
                    openInAppstore(packageName)
                }
            }
        }

        @JavascriptInterface
        fun alexaCommand(command: String) {
            // Fire TV hat keine öffentliche Schnittstelle für Alexa-Befehle, Alexa über die Fernbedienung nutzen
        }
    }

    private fun openInAppstore(packageName: String) {
        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("amzn://apps/android?p=$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { startActivity(intent) } catch (_: Exception) { }
    }

    companion object {
        private const val OFFLINE_HTML = """
            <html><body style="background:#000;color:#888;font-family:sans-serif;display:flex;
            align-items:center;justify-content:center;height:100vh;margin:0">
            <div style="text-align:center"><div style="font-size:28px;color:#fff;font-weight:200">Keine Internetverbindung</div>
            <div style="margin-top:12px">Neuer Versuch in 10 Sekunden …</div></div></body></html>
        """
    }
}
