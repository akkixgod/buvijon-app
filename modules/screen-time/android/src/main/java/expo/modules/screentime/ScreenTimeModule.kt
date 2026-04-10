package expo.modules.screentime

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
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
      val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
        ?: return@Function emptyList<Map<String, Any>>()

      val stats = usm.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime.toLong(),
        endTime.toLong()
      ) ?: return@Function emptyList<Map<String, Any>>()

      val pm = context.packageManager
      val result = mutableListOf<Map<String, Any>>()

      // Aggregate stats by package name
      val aggregated = mutableMapOf<String, AggregatedStats>()
      for (stat in stats) {
        val pkg = stat.packageName
        val totalTime = stat.totalTimeInForeground // milliseconds
        if (totalTime < 60_000) continue // Skip apps used less than 1 minute

        val existing = aggregated[pkg]
        if (existing != null) {
          existing.totalTimeMs += totalTime
          existing.lastUsed = maxOf(existing.lastUsed, stat.lastTimeUsed)
        } else {
          aggregated[pkg] = AggregatedStats(
            totalTimeMs = totalTime,
            lastUsed = stat.lastTimeUsed
          )
        }
      }

      for ((pkg, agg) in aggregated) {
        val appName = try {
          val appInfo = pm.getApplicationInfo(pkg, 0)
          pm.getApplicationLabel(appInfo).toString()
        } catch (e: PackageManager.NameNotFoundException) {
          pkg.substringAfterLast(".")
        }

        // Filter out system apps without a launcher icon
        val isLaunchable = pm.getLaunchIntentForPackage(pkg) != null
        if (!isLaunchable) continue

        val totalMinutes = (agg.totalTimeMs / 60_000).toInt()

        // Estimate launch count using UsageEvents
        val launchCount = getLaunchCount(context, pkg, startTime.toLong(), endTime.toLong())

        result.add(mapOf(
          "packageName" to pkg,
          "appName" to appName,
          "totalMinutes" to totalMinutes,
          "lastUsed" to agg.lastUsed,
          "launchCount" to launchCount
        ))
      }

      // Sort by totalMinutes descending
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

    // Start the app blocker foreground service
    Function("startAppBlocker") { blockedPackages: List<String>, childName: String, childId: String?, childPin: String? ->
      val context = appContext.reactContext ?: return@Function false
      try {
        val intent = Intent(context, AppBlockerService::class.java).apply {
          action = "START"
          putStringArrayListExtra("blocked_packages", ArrayList(blockedPackages))
          putExtra("child_name", childName)
          if (childId != null && childPin != null) {
            putExtra("child_id", childId)
            putExtra("child_pin", childPin)
          }
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
        true
      } catch (e: Exception) {
        false
      }
    }

    // Register listener for PIN verified event
    AsyncFunction("listenPinVerified") {
      val module = this@ScreenTimeModule
      if (pinBroadcastReceiver == null) {
        pinBroadcastReceiver = object : BroadcastReceiver() {
          override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AppBlockerService.ACTION_PIN_VERIFIED) {
              val childId = intent.getStringExtra(AppBlockerService.EXTRA_CHILD_ID)
              val childName = intent.getStringExtra(AppBlockerService.EXTRA_CHILD_NAME)
              module.sendEvent("PIN_VERIFIED", mapOf(
                "childId" to childId as Any,
                "childName" to childName as Any
              ))
            }
          }
        }

        val context = appContext.reactContext ?: return@AsyncFunction null
        val filter = IntentFilter(AppBlockerService.ACTION_PIN_VERIFIED)
        context.registerReceiver(pinBroadcastReceiver, filter)
      }
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
      val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
        ?: return@Function 0

      val cal = Calendar.getInstance()
      val endTime = cal.timeInMillis
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val startTime = cal.timeInMillis

      val stats = usm.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime,
        endTime
      ) ?: return@Function 0

      var totalMs: Long = 0
      val pm = context.packageManager
      for (stat in stats) {
        val isLaunchable = try {
          pm.getLaunchIntentForPackage(stat.packageName) != null
        } catch (e: Exception) { false }
        if (isLaunchable) {
          totalMs += stat.totalTimeInForeground
        }
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

  private data class AggregatedStats(
    var totalTimeMs: Long,
    var lastUsed: Long
  )
}
