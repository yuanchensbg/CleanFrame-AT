package com.cleanframe.at

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Der Stick hängt am USB-Strom des TVs und fährt bei jedem Einschalten neu hoch: dann CleanFrame öffnen
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val launch = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { context.startActivity(launch) } catch (_: Exception) { }
    }
}
