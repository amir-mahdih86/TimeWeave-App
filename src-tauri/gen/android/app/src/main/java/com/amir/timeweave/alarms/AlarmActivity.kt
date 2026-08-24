package com.amir.timeweave.alarms

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.app.KeyguardManager

class AlarmActivity : Activity() {
  companion object {
    const val EXTRA_ID = "timeweave_alarm_id"
    const val EXTRA_TITLE = "timeweave_alarm_title"
    const val EXTRA_BODY = "timeweave_alarm_body"
    const val EXTRA_FULL_ALARM = "timeweave_alarm_full"
    const val EXTRA_ONLY_WHEN_LOCKED = "timeweave_alarm_only_locked"
    const val EXTRA_SNOOZE_MINUTES = "timeweave_alarm_snooze_min"
  }

  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null

  private lateinit var titleView: TextView
  private lateinit var bodyView: TextView

  private fun currentId(): String = intent?.getStringExtra(EXTRA_ID) ?: ""

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // If alarms should only interrupt while the screen is off/locked, degrade
    // to the (already posted) heads-up notification when the device is in use.
    val onlyWhenLocked = intent.getBooleanExtra(EXTRA_ONLY_WHEN_LOCKED, true)
    android.util.Log.i("TimeWeaveAlarm", "AlarmActivity onCreate: onlyWhenLocked=$onlyWhenLocked screenOn=${isScreenOn()}")
    if (onlyWhenLocked && isScreenOn()) {
      finishAndRemoveTask()
      return
    }

    window.addFlags(
      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
        or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      (getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)
        ?.requestDismissKeyguard(this, null)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }

    buildUi()
    startRinging()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    refreshTexts()
    if (mediaPlayer?.isPlaying != true) startRinging()
  }

  private fun isScreenOn(): Boolean {
    val pm = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager ?: return false
    return pm.isInteractive
  }

  private fun buildUi() {
    val density = resources.displayMetrics.density
    fun dp(v: Int): Int = (v * density).toInt()

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setBackgroundColor(0xFF101018.toInt())
      setPadding(dp(24), dp(64), dp(24), dp(32))
    }

    val appLabel = TextView(this).apply {
      text = "TimeWeave"
      textSize = 14f
      setTextColor(0xFF8A8AA3.toInt())
      letterSpacing = 0.15f
      gravity = Gravity.CENTER
    }
    root.addView(
      appLabel,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    )

    titleView = TextView(this).apply {
      textSize = 30f
      setTextColor(0xFFFFFFFF.toInt())
      android.graphics.Typeface.defaultFromStyle(android.graphics.Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(0, dp(48), 0, dp(8))
    }
    root.addView(
      titleView,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    )

    bodyView = TextView(this).apply {
      textSize = 17f
      setTextColor(0xFFB9B9CC.toInt())
      gravity = Gravity.CENTER
      setPadding(0, dp(4), 0, dp(16))
      movementMethod = android.text.method.ScrollingMovementMethod.getInstance()
    }
    root.addView(
      bodyView,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    )

    root.addView(
      View(this),
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f)
    )

    val buttonsRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
    }

    val snoozeMinutes = intent.getIntExtra(EXTRA_SNOOZE_MINUTES, 5)
    val snoozeButton = Button(this).apply {
      text = "Snooze $snoozeMinutes min"
      textSize = 16f
      setTextColor(0xFFE5E1F5.toInt())
      background = roundRect(0x22FFFFFF, 0x33FFFFFF, dp(28))
      setPadding(dp(28), dp(6), dp(28), dp(6))
      setOnClickListener { onSnooze(snoozeMinutes) }
    }
    buttonsRow.addView(
      snoozeButton,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(56)).apply { marginEnd = dp(12) }
    )

    val dismissButton = Button(this).apply {
      text = "Dismiss"
      textSize = 16f
      setTextColor(0xFF17171F.toInt())
      android.graphics.Typeface.defaultFromStyle(android.graphics.Typeface.BOLD)
      background = roundRect(0xFFC4B5FD.toInt(), 0xFFC4B5FD.toInt(), dp(28))
      setPadding(dp(36), dp(6), dp(36), dp(6))
      setOnClickListener { onDismiss() }
    }
    buttonsRow.addView(
      dismissButton,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(56))
    )

    root.addView(buttonsRow)
    setContentView(root)
    refreshTexts()
  }

  private fun roundRect(fillColor: Int, strokeColor: Int, radiusPx: Int): android.graphics.drawable.Drawable {
    return android.graphics.drawable.GradientDrawable().apply {
      shape = android.graphics.drawable.GradientDrawable.RECTANGLE
      cornerRadius = radiusPx.toFloat()
      setColor(fillColor)
      setStroke(2, strokeColor)
    }
  }

  private fun refreshTexts() {
    titleView.text = intent.getStringExtra(EXTRA_TITLE)?.ifBlank { "Task" } ?: "Task"
    val body = intent.getStringExtra(EXTRA_BODY)?.takeIf { it.isNotBlank() }
    bodyView.visibility = if (body.isNullOrBlank()) View.GONE else View.VISIBLE
    bodyView.text = body ?: ""
  }

  private fun startRinging() {
    try {
      val uri: Uri? =
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

      mediaPlayer = MediaPlayer().apply {
        setDataSource(this@AlarmActivity, uri!!)
        setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        )
        isLooping = true
        prepare()
        start()
      }
    } catch (_: Exception) {
      // No alarm sound available; vibration still runs.
    }

    try {
      @Suppress("DEPRECATION")
      val vib = getSystemService(VIBRATOR_SERVICE) as? Vibrator
      vibrator = vib
      vib?.let {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          it.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 500), 0))
        } else {
          @Suppress("DEPRECATION")
          it.vibrate(longArrayOf(0, 600, 500), 0)
        }
      }
    } catch (_: Exception) {
    }
  }

  private fun stopRinging() {
    try {
      mediaPlayer?.let { if (it.isPlaying) it.stop(); it.release() }
    } catch (_: Exception) {
    }
    mediaPlayer = null
    try {
      vibrator?.cancel()
    } catch (_: Exception) {
    }
    vibrator = null
  }

  private fun onDismiss() {
    stopRinging()
    finishAndRemoveTask()
  }

  private fun onSnooze(minutes: Int) {
    val id = currentId()
    if (id.isNotBlank()) {
      // The store entry was removed when the alarm fired, so rebuild the
      // item from the intent extras and reschedule it.
      AlarmScheduler.schedule(
        applicationContext,
        AlarmItem(
          id = id,
          title = intent.getStringExtra(EXTRA_TITLE) ?: "",
          body = intent.getStringExtra(EXTRA_BODY) ?: "",
          fireAt = System.currentTimeMillis() + minutes * 60_000L,
          fullAlarm = true,
          onlyWhenLocked = intent.getBooleanExtra(EXTRA_ONLY_WHEN_LOCKED, true),
          snoozeMinutes = minutes
        )
      )
    }
    stopRinging()
    finishAndRemoveTask()
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    // Volume keys silence the ringtone but keep the screen visible.
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      stopRinging()
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onDestroy() {
    stopRinging()
    super.onDestroy()
  }
}
