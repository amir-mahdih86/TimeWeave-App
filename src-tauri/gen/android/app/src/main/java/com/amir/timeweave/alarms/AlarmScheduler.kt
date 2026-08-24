package com.amir.timeweave.alarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

object AlarmScheduler {
  fun requestCode(id: String): Int = id.hashCode()

  fun pendingIntent(context: Context, item: AlarmItem): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      action = "com.amir.timeweave.ALARM_FIRE"
      putExtra(AlarmReceiver.EXTRA_ID, item.id)
    }
    return PendingIntent.getBroadcast(
      context,
      requestCode(item.id),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun schedule(context: Context, item: AlarmItem) {
    if (item.fireAt <= System.currentTimeMillis()) {
      AlarmStore.remove(context, item.id)
      return
    }
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val pi = pendingIntent(context, item)
    am.cancel(pi)
    try {
      am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.fireAt, pi)
    } catch (_: SecurityException) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.fireAt, pi)
    }
    AlarmStore.upsert(context, item)
  }

  fun cancel(context: Context, id: String) {
    val existing = AlarmStore.all(context).firstOrNull { it.id == id }
      ?: AlarmItem(id, "", "", Long.MAX_VALUE, false)
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.cancel(pendingIntent(context, existing))
    AlarmStore.remove(context, id)
  }

  fun snooze(context: Context, id: String, minutes: Int): Boolean {
    val item = AlarmStore.all(context).firstOrNull { it.id == id } ?: return false
    schedule(
      context,
      item.copy(fireAt = System.currentTimeMillis() + minutes * 60_000L)
    )
    return true
  }

  fun rescheduleAll(context: Context) {
    val now = System.currentTimeMillis()
    AlarmStore.all(context).forEach { item ->
      if (item.fireAt > now) schedule(context, item) else AlarmStore.remove(context, item.id)
    }
  }

  fun ids(context: Context): String =
    AlarmStore.all(context).joinToString("|") { "${it.id}@${it.fireAt}" }
}
