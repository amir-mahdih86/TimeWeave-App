package com.amir.timeweave.alarms

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object AlarmBridge {
  private const val NOTIFICATION_PERMISSION_REQUEST = 9001

  @JvmStatic
  fun initChannels(context: Context) {
    AlarmNotifier.createChannels(context)
  }

  @JvmStatic
  fun scheduleAlarm(
    context: Context,
    id: String,
    title: String,
    body: String,
    fireAt: Long,
    fullAlarm: Boolean,
    onlyWhenLocked: Boolean,
    snoozeMinutes: Int
  ) {
    AlarmScheduler.schedule(
      context,
      AlarmItem(id, title, body, fireAt, fullAlarm, onlyWhenLocked, snoozeMinutes)
    )
  }

  @JvmStatic
  fun cancelAlarm(context: Context, id: String) {
    AlarmScheduler.cancel(context, id)
  }

  @JvmStatic
  fun scheduledAlarmIds(context: Context): String = AlarmScheduler.ids(context)

  @JvmStatic
  fun notificationPermissionGranted(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.POST_NOTIFICATIONS
    ) == PackageManager.PERMISSION_GRANTED
  }

  @JvmStatic
  fun requestNotificationPermission(activity: Activity): Boolean {
    if (notificationPermissionGranted(activity)) return true
    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.POST_NOTIFICATIONS),
      NOTIFICATION_PERMISSION_REQUEST
    )
    return false
  }

  @JvmStatic
  fun exactAlarmsPermitted(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
  }

  @JvmStatic
  fun openExactAlarmSettings(activity: Activity) {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        .setData(Uri.parse("package:${activity.packageName}"))
    } else {
      Intent(Settings.ACTION_SETTINGS)
    }
    activity.startActivity(intent)
  }

  @JvmStatic
  fun canDrawOverlays(context: Context): Boolean =
    Settings.canDrawOverlays(context)

  @JvmStatic
  fun requestOverlayPermission(activity: Activity) {
    try {
      activity.startActivity(
        Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${activity.packageName}")
        )
      )
    } catch (_: Exception) {
      try {
        activity.startActivity(Intent(Settings.ACTION_SETTINGS))
      } catch (_: Exception) {
      }
    }
  }

  @JvmStatic
  fun isIgnoringBatteryOptimizations(context: Context): Boolean {
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return pm.isIgnoringBatteryOptimizations(context.packageName)
  }

  @JvmStatic
  fun requestIgnoreBatteryOptimizations(activity: Activity): Boolean {
    if (isIgnoringBatteryOptimizations(activity)) return true
    try {
      @Suppress("DEPRECATION")
      activity.startActivity(
        Intent(
          Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          Uri.parse("package:${activity.packageName}")
        )
      )
    } catch (_: Exception) {
      try {
        activity.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      } catch (_: Exception) {
      }
    }
    return false
  }
}
