package expo.modules.screentime

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Build
import android.view.accessibility.AccessibilityEvent

class AppBlockerAccessibilityService : AccessibilityService() {
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val packageName = event.packageName?.toString() ?: return
    if (packageName == this.packageName) return

    val intent = Intent(this, AppBlockerService::class.java).apply {
      action = AppBlockerService.ACTION_FOREGROUND_APP
      putExtra(AppBlockerService.EXTRA_PACKAGE_NAME, packageName)
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(intent)
      } else {
        startService(intent)
      }
    } catch (_: Exception) {}
  }

  override fun onInterrupt() {}
}
