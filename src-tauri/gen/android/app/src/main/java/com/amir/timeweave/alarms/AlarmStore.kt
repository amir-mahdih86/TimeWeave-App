package com.amir.timeweave.alarms

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class AlarmItem(
  val id: String,
  val title: String,
  val body: String,
  val fireAt: Long,
  val fullAlarm: Boolean,
  val onlyWhenLocked: Boolean = true,
  val snoozeMinutes: Int = 5
)

object AlarmStore {
  private const val PREFS = "timeweave_alarms"
  private const val KEY = "alarms"

  fun all(context: Context): List<AlarmItem> {
    val raw = prefs(context).getString(KEY, null) ?: return emptyList()
    return try {
      val arr = JSONArray(raw)
      (0 until arr.length()).mapNotNull { i ->
        val o = arr.getJSONObject(i)
        AlarmItem(
          id = o.getString("id"),
          title = o.optString("title", ""),
          body = o.optString("body", ""),
          fireAt = o.getLong("fireAt"),
          fullAlarm = o.optBoolean("fullAlarm", false),
          onlyWhenLocked = o.optBoolean("onlyWhenLocked", true),
          snoozeMinutes = o.optInt("snoozeMinutes", 5)
        )
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun upsert(context: Context, item: AlarmItem) {
    save(context, all(context).filterNot { it.id == item.id } + item)
  }

  fun remove(context: Context, id: String) {
    save(context, all(context).filterNot { it.id == id })
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun save(context: Context, list: List<AlarmItem>) {
    val arr = JSONArray()
    list.forEach { item ->
      arr.put(
        JSONObject().apply {
          put("id", item.id)
          put("title", item.title)
          put("body", item.body)
          put("fireAt", item.fireAt)
          put("fullAlarm", item.fullAlarm)
          put("onlyWhenLocked", item.onlyWhenLocked)
          put("snoozeMinutes", item.snoozeMinutes)
        }
      )
    }
    prefs(context).edit().putString(KEY, arr.toString()).apply()
  }
}
