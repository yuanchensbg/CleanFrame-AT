package com.cleanframe.at

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.*
import androidx.fragment.app.FragmentActivity

class MainActivity : FragmentActivity() {

    // GitHub Pages URL deines Repos — nach dem Upload hier eintragen
    // Beispiel: "https://dein-name.github.io/CleanFrame-AT/"
    private val LAUNCHER_URL = "https://yuanchensbg.github.io/CleanFrame-AT/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // JavaScript-Bridge: erlaubt der Webseite, Apps zu starten
        webView.addJavascriptInterface(AppLauncher(), "Android")

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, req: WebResourceRequest?, err: WebResourceError?) {
                // Bei keiner Internetverbindung: lokale Fallback-Seite laden
                view?.loadUrl("file:///android_asset/index.html")
            }
        }

        webView.loadUrl(LAUNCHER_URL)
    }

    inner class AppLauncher {
        @JavascriptInterface
        fun launchApp(packageName: String) {
            val pm: PackageManager = packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
            }
        }
    }
}
