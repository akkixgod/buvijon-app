package expo.modules.screentime

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

class ScreenTimeModule : Module() {
  private var pinBroadcastReceiver: BroadcastReceiver? = null

  // Send event to React Native
  private fun emit(eventName: String, payload: Map<String, Any>) {
    sendEvent(eventName, payload)
  }

  override fun definition() = ModuleDefinition {
    Name("ScreenTime")

    // Check if we have the USAGE_ACCESS permission
    Function("hasPermission") {
      val context = appContext.reactContext ?: return@Function false
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName
        )
      }
      mode == AppOpsManager.MODE_ALLOWED
    }

    // Open system Settings so user can grant USAGE_ACCESS
    Function("requestPermission") {
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    // Get app usage stats for today (or a custom range)
    // Returns: Array of { packageName, appName, totalMinutes, lastUsed, launchCount }
    Function("getUsageStats") { startTime: Double, endTime: Double ->
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
      val pm = context.packageManager
      val totalTimes = calculateAccurateStats(context, startTime.toLong(), endTime.toLong())
      val result = mutableListOf<Map<String, Any>>()

      for ((pkg, totalMs) in totalTimes) {
        if (totalMs < 60_000) continue // Skip apps used less than 1 minute
        val isLaunchable = try { pm.getLaunchIntentForPackage(pkg) != null } catch (e: Exception) { false }
        if (!isLaunchable) continue

        val appName = try {
          pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
          pkg.substringAfterLast(".")
        }

        val launchCount = getLaunchCount(context, pkg, startTime.toLong(), endTime.toLong())

        result.add(mapOf(
          "packageName" to pkg,
          "appName" to appName,
          "totalMinutes" to (totalMs / 60_000).toInt(),
          "lastUsed" to 0L,
          "launchCount" to launchCount
        ))
      }

      result.sortByDescending { it["totalMinutes"] as Int }
      result
    }

    // Get list of installed user-visible apps
    Function("getInstalledApps") {
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val activities = pm.queryIntentActivities(intent, 0)
      val result = mutableListOf<Map<String, Any>>()
      val seen = mutableSetOf<String>()

      for (info in activities) {
        val pkg = info.activityInfo.packageName
        if (pkg == context.packageName || !seen.add(pkg)) continue
        val appName = info.loadLabel(pm).toString()
        result.add(mapOf("packageName" to pkg, "appName" to appName))
      }
      result.sortBy { it["appName"] as String }
      result
    }

    // Check if we have overlay (draw-over-apps) permission
    Function("hasOverlayPermission") {
      val context = appContext.reactContext ?: return@Function false
      Settings.canDrawOverlays(context)
    }

    // Open settings to grant overlay permission
    Function("requestOverlayPermission") {
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}")
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("hasAccessibilityPermission") {
      val context = appContext.reactContext ?: return@Function false
      isAccessibilityServiceEnabled(context)
    }

    Function("requestAccessibilityPermission") {
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("hasBatteryOptimizationBypass") {
      val context = appContext.reactContext ?: return@Function false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return@Function true
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestBatteryOptimizationSettings") {
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("syncBlockerConfigs") { configs: List<Map<String, Any?>> ->
      val context = appContext.reactContext ?: return@Function false
      try {
        val parsed = configs.mapNotNull { raw ->
          val childId = raw["childId"] as? String ?: return@mapNotNull null
          val childName = raw["childName"] as? String ?: ""
          val childPin = raw["childPin"] as? String ?: return@mapNotNull null
          val dailyLimit = (raw["dailyLimitMinutes"] as? Number)?.toInt() ?: 60
          val blocked = (raw["blockedPackages"] as? List<*>)?.mapNotNull { it as? String } ?: emptyList()
          if (childId.isBlank() || childPin.isBlank() || blocked.isEmpty()) return@mapNotNull null
          BlockerChildConfig(childId, childName, childPin, dailyLimit, blocked)
        }
        BlockerConfigStore.saveConfigs(context, parsed)
        val intent = Intent(context, AppBlockerService::class.java).apply {
          action = AppBlockerService.ACTION_RELOAD_CONFIGS
        }
        if (parsed.isNotEmpty()) {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
          } else {
            context.startService(intent)
          }
        } else {
          context.stopService(Intent(context, AppBlockerService::class.java))
        }
        true
      } catch (e: Exception) {
        false
      }
    }

    // Start the app blocker foreground service
    Function("startAppBlocker") { blockedPackages: List<String>, childName: String, childId: String?, childPin: String? ->
      val context = appContext.reactContext ?: return@Function false
      try {
        if (childId != null && childPin != null) {
          BlockerConfigStore.saveConfigs(context, listOf(
            BlockerChildConfig(childId, childName, childPin, Int.MAX_VALUE / 60, blockedPackages)
          ))
        }
        val intent = Intent(context, AppBlockerService::class.java).apply {
          action = AppBlockerService.ACTION_RELOAD_CONFIGS
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        true
      } catch (e: Exception) {
        false
      }
    }

    // Set child PIN (sends broadcast to service)
    Function("setChildPin") { childId: String, pin: String ->
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(AppBlockerService.ACTION_SET_CHILD_PIN).apply {
          putExtra(AppBlockerService.EXTRA_CHILD_ID, childId)
          putExtra(AppBlockerService.EXTRA_CHILD_PIN, pin)
        }
        context.sendBroadcast(intent)
        BlockerConfigStore.getConfigs(context).takeIf { it.isNotEmpty() }?.let { configs ->
          BlockerConfigStore.saveConfigs(context, configs.map {
            if (it.childId == childId) it.copy(childPin = pin) else it
          })
        }
        true
      } catch (e: Exception) {
        false
      }
    }

    // Register listener for PIN verified event AND active-child-changed event
    AsyncFunction("listenPinVerified") {
      val module = this@ScreenTimeModule
      if (pinBroadcastReceiver == null) {
        pinBroadcastReceiver = object : BroadcastReceiver() {
          override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
              AppBlockerService.ACTION_PIN_VERIFIED -> {
                val childId = intent.getStringExtra(AppBlockerService.EXTRA_CHILD_ID)
                val childName = intent.getStringExtra(AppBlockerService.EXTRA_CHILD_NAME)
                module.sendEvent("PIN_VERIFIED", mapOf(
                  "childId" to (childId ?: ""),
                  "childName" to (childName ?: "")
                ))
              }
              AppBlockerService.ACTION_ACTIVE_CHILD_CHANGED -> {
                val previous = intent.getStringExtra(AppBlockerService.EXTRA_PREVIOUS_CHILD_ID)
                val next = intent.getStringExtra(AppBlockerService.EXTRA_CHILD_ID)
                module.sendEvent("ACTIVE_CHILD_CHANGED", mapOf(
                  "previousChildId" to (previous ?: ""),
                  "newChildId" to (next ?: "")
                ))
              }
            }
          }
        }

        val context = appContext.reactContext ?: return@AsyncFunction null
        val filter = IntentFilter().apply {
          addAction(AppBlockerService.ACTION_PIN_VERIFIED)
          addAction(AppBlockerService.ACTION_ACTIVE_CHILD_CHANGED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          context.registerReceiver(pinBroadcastReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
          @Suppress("UnspecifiedRegisterReceiverFlag")
          context.registerReceiver(pinBroadcastReceiver, filter)
        }
      }
    }

    // Get the currently active child (set by PIN entry, persisted in SharedPreferences)
    Function("getActiveChildId") {
      val context = appContext.reactContext ?: return@Function null
      ChildSessionStore.getActiveChildId(context)
    }

    // Clear the active child + signal the blocker service to start asking PIN again
    Function("logoutChild") {
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(context, AppBlockerService::class.java).apply {
          action = AppBlockerService.SERVICE_ACTION_LOGOUT
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
        true
      } catch (e: Exception) {
        // If service isn't running, just clear the persisted active child directly.
        ChildSessionStore.setActiveChildId(context, null)
        false
      }
    }

    // Per-child usage stats — same shape as getUsageStats but filtered by childId.
    // Source: ChildSessionStore (only counts time inside blocked apps while the
    // child's PIN was active).
    Function("getUsageStatsForChild") { childId: String, startTime: Double, endTime: Double ->
      val context = appContext.reactContext ?: return@Function emptyList<Map<String, Any>>()
      val pm = context.packageManager
      val totalTimes = ChildSessionStore.getUsageForChild(context, childId, startTime.toLong(), endTime.toLong())
      val launchCounts = ChildSessionStore.getLaunchesForChild(context, childId, startTime.toLong(), endTime.toLong())
      val result = mutableListOf<Map<String, Any>>()

      for ((pkg, totalMs) in totalTimes) {
        if (totalMs < 60_000) continue
        val appName = try {
          pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
          pkg.substringAfterLast(".")
        }
        result.add(mapOf(
          "packageName" to pkg,
          "appName" to appName,
          "totalMinutes" to (totalMs / 60_000).toInt(),
          "lastUsed" to 0L,
          "launchCount" to (launchCounts[pkg] ?: 0)
        ))
      }
      result.sortByDescending { it["totalMinutes"] as Int }
      result
    }

    // Unregister PIN verified listener
    Function("unlistenPinVerified") {
      pinBroadcastReceiver?.let { receiver ->
        try {
          appContext.reactContext?.unregisterReceiver(receiver)
        } catch (e: Exception) {
          // Already unregistered
        }
      }
      pinBroadcastReceiver = null
    }

    // Stop the app blocker service
    Function("stopAppBlocker") {
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(context, AppBlockerService::class.java)
        context.stopService(intent)
        true
      } catch (e: Exception) {
        false
      }
    }

    // Get today's total screen time across all apps (in minutes)
    Function("getTotalScreenTime") {
      val context = appContext.reactContext ?: return@Function 0
      val cal = Calendar.getInstance()
      val endTime = cal.timeInMillis
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val startTime = cal.timeInMillis

      val pm = context.packageManager
      val totalTimes = calculateAccurateStats(context, startTime, endTime)
      var totalMs = 0L
      for ((pkg, ms) in totalTimes) {
        val isLaunchable = try { pm.getLaunchIntentForPackage(pkg) != null } catch (e: Exception) { false }
        if (isLaunchable) totalMs += ms
      }
      (totalMs / 60_000).toInt()
    }

    // Cleanup on module destroy
    OnDestroy {
      pinBroadcastReceiver?.let { receiver ->
        try {
          appContext.reactContext?.unregisterReceiver(receiver)
        } catch (e: Exception) {
          // Already unregistered
        }
      }
      pinBroadcastReceiver = null
    }
  }

  /**
   * Calculates accurate foreground time per package using UsageEvents.
   * More accurate than queryUsageStats(INTERVAL_DAILY) which caches lazily
   * and doesn't include the current active session in real time.
   */
  private fun calculateAccurateStats(context: Context, startTime: Long, endTime: Long): Map<String, Long> {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return emptyMap()

    data class ActivityKey(val pkg: String, val cls: String)
    val resumeTimes = mutableMapOf<ActivityKey, Long>()
    val totalTimes = mutableMapOf<String, Long>()

    val events = usm.queryEvents(startTime, endTime)
    val event = android.app.usage.UsageEvents.Event()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val pkg = event.packageName
      val cls = event.className ?: pkg
      val key = ActivityKey(pkg, cls)
      when (event.eventType) {
        android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED ->
          resumeTimes[key] = event.timeStamp
        android.app.usage.UsageEvents.Event.ACTIVITY_PAUSED,
        android.app.usage.UsageEvents.Event.ACTIVITY_STOPPED -> {
          val start = resumeTimes.remove(key)
          if (start != null)
            totalTimes[pkg] = (totalTimes[pkg] ?: 0L) + (event.timeStamp - start)
        }
      }
    }

    // Apps still in foreground at endTime
    for ((key, start) in resumeTimes)
      totalTimes[key.pkg] = (totalTimes[key.pkg] ?: 0L) + (endTime - start)

    return totalTimes
  }

  private fun getLaunchCount(context: Context, packageName: String, startTime: Long, endTime: Long): Int {
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
      ?: return 0

    try {
      val events = usm.queryEvents(startTime, endTime)
      var count = 0
      val event = android.app.usage.UsageEvents.Event()
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        if (event.packageName == packageName) {
          // ACTIVITY_RESUMED = 1 (app came to foreground)
          if (event.eventType == android.app.usage.UsageEvents.Event.ACTIVITY_RESUMED) {
            count++
          }
        }
      }
      return count
    } catch (e: Exception) {
      return 0
    }
  }

  private fun isAccessibilityServiceEnabled(context: Context): Boolean {
    val expected = ComponentName(context, AppBlockerAccessibilityService::class.java).flattenToString()
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabled)
    while (splitter.hasNext()) {
      if (splitter.next().equals(expected, ignoreCase = true)) return true
    }
    return false
  }

}
