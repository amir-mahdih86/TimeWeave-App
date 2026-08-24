package com.amir.timeweave.alarms

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.amir.timeweave.MainActivity
import com.amir.timeweave.R

object AlarmNotifier {
  const val CHANNEL_ALARMS = "timeweave_alarms"
  const val CHANNEL_REMINDERS = "timeweave_reminders"

  fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    val alarmChannel = NotificationChannel(
      CHANNEL_ALARMS,
      "Task alarms",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Full-screen alarms for important tasks"
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }

    val reminderChannel = NotificationChannel(
      CHANNEL_REMINDERS,
      "Task reminders",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Heads-up reminders for scheduled tasks"
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }

    manager.createNotificationChannel(alarmChannel)
    manager.createNotificationChannel(reminderChannel)
  }

  fun postAlarm(
    context: Context,
    id: String,
    title: String,
    body: String,
    onlyWhenLocked: Boolean,
    snoozeMinutes: Int
  ) {
    createChannels(context)

    val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(AlarmActivity.EXTRA_ID, id)
      putExtra(AlarmActivity.EXTRA_TITLE, title)
      putExtra(AlarmActivity.EXTRA_BODY, body)
      putExtra(AlarmActivity.EXTRA_FULL_ALARM, true)
      putExtra(AlarmActivity.EXTRA_ONLY_WHEN_LOCKED, onlyWhenLocked)
      putExtra(AlarmActivity.EXTRA_SNOOZE_MINUTES, snoozeMinutes)
    }

    // While the screen is on and unlocked, Android refuses to launch
    // full-screen-intent activities. With the overlay permission we can
    // start the alarm activity directly instead.
    val pm = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
    val screenOn = pm.isInteractive
    android.util.Log.i("TimeWeaveAlarm", "postAlarm: screenOn=$screenOn onlyWhenLocked=$onlyWhenLocked overlay=${android.provider.Settings.canDrawOverlays(context)}")
    if (screenOn && !onlyWhenLocked && android.provider.Settings.canDrawOverlays(context)) {
      try {
        context.startActivity(fullScreenIntent)
        android.util.Log.i("TimeWeaveAlarm", "startActivity OK (screen-on alarm)")
        return
      } catch (e: Exception) {
        android.util.Log.w("TimeWeaveAlarm", "startActivity failed: $e")
        // fall through to the notification path
      }
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      context,
      AlarmScheduler.requestCode(id),
      fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val contentIntent = PendingIntent.getActivity(
      context,
      AlarmScheduler.requestCode(id) + 1_000_000,
      Intent(context, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_ALARMS)
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle(if (title.isBlank()) "TimeWeave" else title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .setTimeoutAfter(10 * 60_000L)
      .setDefaults(0)
      .build()

    try {
      androidx.core.app.NotificationManagerCompat.from(context).notify(id.hashCode(), notification)
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS not granted; fall back to launching the activity directly.
      try {
        context.startActivity(fullScreenIntent)
      } catch (_: Exception) {
      }
    }
  }

  fun postReminder(context: Context, id: String, title: String, body: String) {
    createChannels(context)

    val contentIntent = PendingIntent.getActivity(
      context,
      AlarmScheduler.requestCode(id) + 2_000_000,
      Intent(context, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(context, CHANNEL_REMINDERS)
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle(if (title.isBlank()) "TimeWeave" else title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setAutoCancel(true)
      .setTimeoutAfter(90_000L)
      .setContentIntent(contentIntent)
      .build()

    try {
      androidx.core.app.NotificationManagerCompat.from(context).notify(id.hashCode(), notification)
    } catch (_: SecurityException) {
    }
  }
}
