package expo.modules.screentime

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Persists per-child screen-time attribution.
 *
 * Two responsibilities:
 *  (a) which child is currently "active" — set when a child enters the correct PIN
 *      on the overlay and cleared on explicit logout. Survives service restarts.
 *  (b) accumulated foreground time in blocked apps, keyed by
 *      "usage:{childId}:{packageName}:{YYYY-MM-DD}" -> milliseconds (Long).
 *
 * Date keys use the device's local timezone so they line up with how the rest of
 * the module computes "today" (Calendar in ScreenTimeModule.getTotalScreenTime).
 */
object ChildSessionStore {
  private const val PREFS = "buvijon_child_sessions"
  private const val KEY_ACTIVE_CHILD = "active_child_id"
  private const val USAGE_PREFIX = "usage:"
  private const val LAUNCH_PREFIX = "launch:"

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun getActiveChildId(context: Context): String? =
    prefs(context).getString(KEY_ACTIVE_CHILD, null)

  fun setActiveChildId(context: Context, childId: String?) {
    prefs(context).edit().apply {
      if (childId == null) remove(KEY_ACTIVE_CHILD) else putString(KEY_ACTIVE_CHILD, childId)
    }.apply()
  }

  fun incrementUsage(context: Context, childId: String, packageName: String, deltaMs: Long) {
    if (deltaMs <= 0) return
    val key = usageKey(childId, packageName, todayKey())
    val p = prefs(context)
    val current = p.getLong(key, 0L)
    p.edit().putLong(key, current + deltaMs).apply()
  }

  fun incrementLaunch(context: Context, childId: String, packageName: String) {
    val key = launchKey(childId, packageName, todayKey())
    val p = prefs(context)
    val current = p.getInt(key, 0)
    p.edit().putInt(key, current + 1).apply()
  }

  /**
   * Returns total ms per package for [childId] within [fromMs, toMs].
   *
   * Daily granularity: any day fully inside the window contributes its whole bucket.
   * Same-day partial windows (the common "since midnight today" case) still work
   * because we only have one bucket per day — partial-day proration is not attempted,
   * which is fine for our use case (parents look at "today" / "this week" totals).
   */
  fun getUsageForChild(context: Context, childId: String, fromMs: Long, toMs: Long): Map<String, Long> {
    val p = prefs(context)
    val days = dateKeysBetween(fromMs, toMs)
    val result = HashMap<String, Long>()
    val all = p.all
    for ((k, v) in all) {
      if (!k.startsWith(USAGE_PREFIX) || v !is Long) continue
      // usage:{childId}:{pkg}:{date}
      val rest = k.removePrefix(USAGE_PREFIX)
      val firstColon = rest.indexOf(':')
      if (firstColon < 0) continue
      val cId = rest.substring(0, firstColon)
      if (cId != childId) continue
      val afterChild = rest.substring(firstColon + 1)
      val lastColon = afterChild.lastIndexOf(':')
      if (lastColon < 0) continue
      val pkg = afterChild.substring(0, lastColon)
      val date = afterChild.substring(lastColon + 1)
      if (date !in days) continue
      result[pkg] = (result[pkg] ?: 0L) + v
    }
    return result
  }

  fun getLaunchesForChild(context: Context, childId: String, fromMs: Long, toMs: Long): Map<String, Int> {
    val p = prefs(context)
    val days = dateKeysBetween(fromMs, toMs)
    val result = HashMap<String, Int>()
    val prefix = "$LAUNCH_PREFIX$childId:"
    for ((k, v) in p.all) {
      if (!k.startsWith(prefix) || v !is Int) continue
      // launch:{childId}:{pkg}:{date}
      val afterChild = k.removePrefix(prefix)
      val lastColon = afterChild.lastIndexOf(':')
      if (lastColon < 0) continue
      val pkg = afterChild.substring(0, lastColon)
      val date = afterChild.substring(lastColon + 1)
      if (date !in days) continue
      result[pkg] = (result[pkg] ?: 0) + v
    }
    return result
  }

  fun getDailyTotalMinutes(context: Context, childId: String, dateKey: String = todayKey()): Int {
    val p = prefs(context)
    val prefix = "$USAGE_PREFIX$childId:"
    val suffix = ":$dateKey"
    var totalMs = 0L
    for ((k, v) in p.all) {
      if (v is Long && k.startsWith(prefix) && k.endsWith(suffix)) {
        totalMs += v
      }
    }
    return (totalMs / 60_000L).toInt()
  }

  private fun usageKey(childId: String, pkg: String, dateKey: String) =
    "$USAGE_PREFIX$childId:$pkg:$dateKey"

  private fun launchKey(childId: String, pkg: String, dateKey: String) =
    "$LAUNCH_PREFIX$childId:$pkg:$dateKey"

  private fun todayKey(): String = dateFormat().format(Date())

  private fun dateFormat(): SimpleDateFormat =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
      timeZone = TimeZone.getDefault()
    }

  private fun dateKeysBetween(fromMs: Long, toMs: Long): Set<String> {
    val fmt = dateFormat()
    val cal = Calendar.getInstance()
    cal.timeInMillis = fromMs
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    val out = HashSet<String>()
    while (cal.timeInMillis <= toMs) {
      out.add(fmt.format(cal.time))
      cal.add(Calendar.DAY_OF_YEAR, 1)
    }
    return out
  }
}
