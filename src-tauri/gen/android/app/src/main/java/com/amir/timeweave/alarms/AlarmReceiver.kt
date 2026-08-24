package com.amir.timeweave.alarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
  companion object {
    const val EXTRA_ID = "timeweave_alarm_id"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra(EXTRA_ID) ?: return
    val item = AlarmStore.all(context).firstOrNull { it.id == id }

    if (item != null && !item.fullAlarm) {
      AlarmNotifier.postReminder(
        context,
        item.id,
        item.title,
        item.body.ifBlank { "Task starting now" }
      )
    } else {
      AlarmNotifier.postAlarm(
        context,
        id,
        item?.title ?: "",
        item?.body ?: ""
      )
    }

    // Delivered — drop from the store so sync never re-schedules this
    // occurrence (snooze re-adds it with a new time).
    AlarmStore.remove(context, id)
  }
}
