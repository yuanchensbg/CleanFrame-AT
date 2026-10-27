package com.cleanframe.at

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Base64
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

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

        askOverlayPermissionOnce()
    }

    // Ohne diese Erlaubnis kann sich CleanFrame ab Android 10 nicht beim Einschalten nach vorne holen
    private fun askOverlayPermissionOnce() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || Settings.canDrawOverlays(this)) return
        val prefs = getSharedPreferences("cleanframe", MODE_PRIVATE)
        if (prefs.getBoolean("overlayAsked", false)) return
        prefs.edit().putBoolean("overlayAsked", true).apply()
        startSafely(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        webView.requestFocus()
    }

    @Deprecated("Launcher bleibt offen, Zurück-Taste schließt nur Menüs")
    override fun onBackPressed() {
        webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))", null)
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
    }

    private fun startSafely(intent: Intent): Boolean = try {
        startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true
    } catch (_: Exception) { false }

    inner class Bridge {
        @JavascriptInterface
        fun launchApp(packageName: String) {
            runOnUiThread {
                val intent = packageManager.getLeanbackLaunchIntentForPackage(packageName)
                    ?: packageManager.getLaunchIntentForPackage(packageName)
                if (intent == null || !startSafely(intent)) {
                    // App nicht installiert: Seite im Amazon Appstore öffnen
                    startSafely(Intent(Intent.ACTION_VIEW, Uri.parse("amzn://apps/android?p=$packageName")))
                }
            }
        }

        // Eigene Webseiten im Fire-TV-Browser (Silk) öffnen, sonst in einem anderen Browser
        @JavascriptInterface
        fun openUrl(url: String) {
            val uri = Uri.parse(url)
            if (uri.scheme != "https" && uri.scheme != "http") return
            runOnUiThread {
                val view = Intent(Intent.ACTION_VIEW, uri)
                startSafely(Intent(view).setPackage("com.amazon.cloud9")) || startSafely(view)
            }
        }

        @JavascriptInterface
        fun openSettings() {
            runOnUiThread { startSafely(Intent(Settings.ACTION_SETTINGS)) }
        }

        @JavascriptInterface
        fun openNetworkSettings() {
            runOnUiThread {
                startSafely(Intent(Settings.ACTION_WIFI_SETTINGS)) || startSafely(Intent(Settings.ACTION_SETTINGS))
            }
        }

        @JavascriptInterface
        fun getNetworkType(): String {
            val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return "none"
                return when {
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                    else -> "none"
                }
            }
            @Suppress("DEPRECATION")
            return when (cm.activeNetworkInfo?.type) {
                ConnectivityManager.TYPE_ETHERNET -> "ethernet"
                ConnectivityManager.TYPE_WIFI -> "wifi"
                else -> "none"
            }
        }

        // Smart-Home-Anfragen laufen über die App, weil Shelly und Govee keine Browser-Anfragen (CORS) erlauben
        @JavascriptInterface
        fun http(callbackId: String, method: String, url: String, headersJson: String, body: String) {
            Thread {
                val result = JSONObject.quote(request(method, url, headersJson, body))
                runOnUiThread {
                    webView.evaluateJavascript("window.__bridgeHttpDone(${JSONObject.quote(callbackId)}, $result)", null)
                }
            }.start()
        }

        private fun request(method: String, url: String, headersJson: String, body: String): String {
            val uri = Uri.parse(url)
            if (!isAllowedHost(uri.host ?: "")) return ""
            return try {
                val conn = (java.net.URL(url).openConnection() as java.net.HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = 4000
                    readTimeout = 6000
                    val headers = JSONObject(headersJson.ifEmpty { "{}" })
                    headers.keys().forEach { setRequestProperty(it, headers.getString(it)) }
                    if (body.isNotEmpty()) {
                        doOutput = true
                        outputStream.use { it.write(body.toByteArray()) }
                    }
                }
                val stream = if (conn.responseCode < 400) conn.inputStream else conn.errorStream
                stream?.bufferedReader()?.use { it.readText() } ?: ""
            } catch (_: Exception) { "" }
        }

        @JavascriptInterface
        fun getInstalledAppsJson(): String {
            val pm = packageManager
            val seen = HashSet<String>()
            val result = JSONArray()
            val categories = listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)

            for (category in categories) {
                val query = Intent(Intent.ACTION_MAIN).addCategory(category)
                for (info in pm.queryIntentActivities(query, 0)) {
                    val pkg = info.activityInfo.packageName
                    if (pkg == packageName || !seen.add(pkg)) continue
                    val app = info.activityInfo.applicationInfo
                    val image = app.loadBanner(pm) ?: info.activityInfo.loadBanner(pm) ?: app.loadIcon(pm)
                    result.put(JSONObject()
                        .put("label", info.loadLabel(pm).toString())
                        .put("pkg", pkg)
                        .put("image", toBase64(image)))
                }
            }

            val sorted = (0 until result.length()).map { result.getJSONObject(it) }
                .sortedBy { it.getString("label").lowercase() }
            return JSONArray(sorted).toString()
        }
    }

    private fun isAllowedHost(host: String): Boolean {
        if (host == "openapi.api.govee.com") return true
        val p = host.split(".").mapNotNull { it.toIntOrNull() }
        if (p.size != 4) return false
        return p[0] == 10 || (p[0] == 192 && p[1] == 168) || (p[0] == 172 && p[1] in 16..31)
    }

    private fun toBase64(drawable: Drawable): String {
        val w = drawable.intrinsicWidth.takeIf { it > 0 }?.coerceAtMost(320) ?: 160
        val h = drawable.intrinsicHeight.takeIf { it > 0 }?.coerceAtMost(180) ?: 160
        val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, w, h)
        drawable.draw(canvas)
        val out = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    companion object {
        private const val OFFLINE_HTML = """
            <html><body style="background:#000;color:#888;font-family:sans-serif;display:flex;
            align-items:center;justify-content:center;height:100vh;margin:0">
            <div style="text-align:center"><div style="font-size:28px;color:#fff;font-weight:300">Keine Internetverbindung</div>
            <div style="margin-top:12px">Neuer Versuch in 10 Sekunden …</div></div></body></html>
        """
    }
}
