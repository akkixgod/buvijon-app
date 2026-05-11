package expo.modules.screentime

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.text.InputFilter
import android.text.InputType
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class AppBlockerService : Service() {
  companion object {
    private const val CHANNEL_ID = "app_blocker_channel"
    private const val NOTIFICATION_ID = 1001
    private const val POLL_INTERVAL_MS = 1000L

    const val ACTION_RELOAD_CONFIGS = "expo.modules.screentime.RELOAD_CONFIGS"
    const val ACTION_FOREGROUND_APP = "expo.modules.screentime.FOREGROUND_APP"
    const val ACTION_PIN_VERIFIED = "expo.modules.screentime.PIN_VERIFIED"
    const val ACTION_ACTIVE_CHILD_CHANGED = "expo.modules.screentime.ACTIVE_CHILD_CHANGED"
    const val ACTION_SET_CHILD_PIN = "expo.modules.screentime.SET_CHILD_PIN"

    const val SERVICE_ACTION_LOGOUT = "LOGOUT"
    const val EXTRA_PACKAGE_NAME = "package_name"
    const val EXTRA_CHILD_ID = "child_id"
    const val EXTRA_CHILD_NAME = "child_name"
    const val EXTRA_CHILD_PIN = "child_pin"
    const val EXTRA_PREVIOUS_CHILD_ID = "previous_child_id"
  }

  private val handler = Handler(Looper.getMainLooper())
  private var windowManager: WindowManager? = null
  private var overlayView: LinearLayout? = null
  private var pinInput: EditText? = null
  private var messageView: TextView? = null
  private var overlayMode: OverlayMode? = null
  private var isPolling = false
  private var foregroundPackage: String? = null
  private var lastLaunchPackage: String? = null

  private enum class OverlayMode { PIN, HARD_BLOCK }

  private val pollRunnable = object : Runnable {
    override fun run() {
      checkForegroundApp(getForegroundPackage())
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_FOREGROUND_APP -> {
        if (!BlockerConfigStore.hasAnyBlockedApps(this)) {
          hideOverlay()
          stopSelf()
          return START_NOT_STICKY
        }
        ensureForeground()
        checkForegroundApp(intent.getStringExtra(EXTRA_PACKAGE_NAME))
      }
      ACTION_RELOAD_CONFIGS, "START" -> {
        ensureForeground()
        startPollingIfNeeded()
      }
      SERVICE_ACTION_LOGOUT -> {
        val previous = ChildSessionStore.getActiveChildId(this)
        ChildSessionStore.setActiveChildId(this, null)
        if (previous != null) emitActiveChildChanged(previous, null)
        ensureForeground()
        startPollingIfNeeded()
      }
      ACTION_SET_CHILD_PIN -> {
        // Kept for backwards compatibility. Config sync is the source of truth.
        ensureForeground()
        startPollingIfNeeded()
      }
      else -> {
        if (BlockerConfigStore.hasAnyBlockedApps(this)) {
          ensureForeground()
          startPollingIfNeeded()
        } else {
          stopSelf()
        }
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    stopPolling()
    hideOverlay()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun ensureForeground() {
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, buildNotification())
  }

  private fun startPollingIfNeeded() {
    if (!BlockerConfigStore.hasAnyBlockedApps(this)) {
      stopPolling()
      hideOverlay()
      stopSelf()
      return
    }
    if (isPolling) return
    isPolling = true
    handler.post(pollRunnable)
  }

  private fun stopPolling() {
    handler.removeCallbacks(pollRunnable)
    isPolling = false
  }

  private fun checkForegroundApp(packageName: String?) {
    if (!BlockerConfigStore.hasAnyBlockedApps(this)) {
      hideOverlay()
      stopSelf()
      return
    }
    if (packageName.isNullOrBlank() || packageName == this.packageName) return
    foregroundPackage = packageName

    if (!BlockerConfigStore.isPackageBlocked(this, packageName)) {
      lastLaunchPackage = null
      hideOverlay()
      return
    }

    val activeChildId = ChildSessionStore.getActiveChildId(this)
    if (activeChildId == null) {
      showPinOverlay()
      return
    }

    val config = BlockerConfigStore.findByChildId(this, activeChildId)
    if (config == null) {
      val previous = ChildSessionStore.getActiveChildId(this)
      ChildSessionStore.setActiveChildId(this, null)
      if (previous != null) emitActiveChildChanged(previous, null)
      showPinOverlay()
      return
    }

    if (lastLaunchPackage != packageName) {
      ChildSessionStore.incrementLaunch(this, activeChildId, packageName)
      lastLaunchPackage = packageName
    }

    ChildSessionStore.incrementUsage(this, activeChildId, packageName, POLL_INTERVAL_MS)
    val total = ChildSessionStore.getDailyTotalMinutes(this, activeChildId)
    if (total >= config.dailyLimitMinutes) {
      showHardBlockOverlay(config)
    } else {
      hideOverlay()
    }
  }

  private fun getForegroundPackage(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return foregroundPackage
    val endTime = System.currentTimeMillis()
    val startTime = endTime - 5000
    val events = usm.queryEvents(startTime, endTime) ?: return foregroundPackage
    val event = UsageEvents.Event()
    var lastPkg = foregroundPackage
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
        lastPkg = event.packageName
      }
    }
    return lastPkg
  }

  private fun showPinOverlay() {
    if (overlayMode == OverlayMode.PIN && overlayView != null) return
    if (!Settings.canDrawOverlays(this)) return
    hideOverlay()

    val layout = baseLayout()
    addTitle(layout, "Введите PIN-код")
    addSubtitle(layout, "Введите PIN ребёнка, чтобы продолжить и считать экранное время.")

    pinInput = EditText(this).apply {
      hint = "0000"
      inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
      textSize = 30f
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#111827"))
      setHintTextColor(Color.parseColor("#9CA3AF"))
      filters = arrayOf(InputFilter.LengthFilter(4))
      setPadding(dp(24), dp(14), dp(24), dp(14))
      background = null
      addTextChangedListener(object : TextWatcher {
        override fun afterTextChanged(s: android.text.Editable?) {
          if ((s?.length ?: 0) == 4) verifyPin()
        }
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      })
    }
    layout.addView(pinInput)

    messageView = TextView(this).apply {
      text = ""
      textSize = 14f
      setTextColor(Color.parseColor("#DC2626"))
      gravity = Gravity.CENTER
      setPadding(0, dp(12), 0, 0)
    }
    layout.addView(messageView)
    addInfo(layout, "PIN нужен только для определения ребёнка. Родитель может изменить его в Buvijon.")
    attachOverlay(layout, OverlayMode.PIN)
    pinInput?.requestFocus()
  }

  private fun showHardBlockOverlay(config: BlockerChildConfig) {
    if (overlayMode == OverlayMode.HARD_BLOCK && overlayView != null) return
    if (!Settings.canDrawOverlays(this)) return
    hideOverlay()

    val layout = baseLayout()
    addTitle(layout, "Лимит на сегодня исчерпан")
    val name = config.childName.ifBlank { "Ребёнок" }
    addSubtitle(layout, "$name уже использовал дневной лимит для заблокированных приложений.")
    addInfo(layout, "Вернитесь назад или откройте другое приложение. Разблокировать этот экран может только изменение настроек родителем.")
    attachOverlay(layout, OverlayMode.HARD_BLOCK)
  }

  private fun baseLayout(): LinearLayout {
    return LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F9FAFB"))
      setPadding(dp(32), dp(48), dp(32), dp(48))

      addView(TextView(this@AppBlockerService).apply {
        text = "Buvijon"
        textSize = 18f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(Color.parseColor("#7C3AED"))
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, dp(20))
      })
    }
  }

  private fun addTitle(layout: LinearLayout, textValue: String) {
    layout.addView(TextView(this).apply {
      text = textValue
      textSize = 24f
      setTextColor(Color.parseColor("#111827"))
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(10))
    })
  }

  private fun addSubtitle(layout: LinearLayout, textValue: String) {
    layout.addView(TextView(this).apply {
      text = textValue
      textSize = 16f
      setTextColor(Color.parseColor("#4B5563"))
      gravity = Gravity.CENTER
      setLineSpacing(dp(3).toFloat(), 1f)
      setPadding(0, 0, 0, dp(22))
    })
  }

  private fun addInfo(layout: LinearLayout, textValue: String) {
    layout.addView(TextView(this).apply {
      text = textValue
      textSize = 13f
      setTextColor(Color.parseColor("#6B7280"))
      gravity = Gravity.CENTER
      setLineSpacing(dp(4).toFloat(), 1f)
      setPadding(0, dp(18), 0, 0)
    })
  }

  private fun attachOverlay(layout: LinearLayout, mode: OverlayMode) {
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    )
    try {
      windowManager?.addView(layout, params)
      overlayView = layout
      overlayMode = mode
    } catch (_: Exception) {
      overlayView = null
      overlayMode = null
    }
  }

  private fun hideOverlay() {
    val view = overlayView ?: return
    try {
      windowManager?.removeView(view)
    } catch (_: Exception) {}
    overlayView = null
    overlayMode = null
    pinInput = null
    messageView = null
  }

  private fun verifyPin() {
    val enteredPin = pinInput?.text?.toString() ?: return
    val config = BlockerConfigStore.findByPin(this, enteredPin)
    if (config == null) {
      messageView?.text = "Неверный PIN-код. Попробуйте снова."
      pinInput?.text?.clear()
      vibrateError()
      return
    }

    val previous = ChildSessionStore.getActiveChildId(this)
    ChildSessionStore.setActiveChildId(this, config.childId)
    if (previous != config.childId) emitActiveChildChanged(previous, config.childId)

    sendBroadcast(Intent(ACTION_PIN_VERIFIED).apply {
      `package` = packageName
      putExtra(EXTRA_CHILD_ID, config.childId)
      putExtra(EXTRA_CHILD_NAME, config.childName)
    })
    hideOverlay()
    vibrateSuccess()
    checkForegroundApp(foregroundPackage)
  }

  private fun emitActiveChildChanged(previous: String?, next: String?) {
    sendBroadcast(Intent(ACTION_ACTIVE_CHILD_CHANGED).apply {
      `package` = packageName
      if (previous != null) putExtra(EXTRA_PREVIOUS_CHILD_ID, previous)
      if (next != null) putExtra(EXTRA_CHILD_ID, next)
    })
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Buvijon app blocking",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Buvijon monitors selected apps to enforce child screen-time limits."
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Buvijon")
      .setContentText("App blocking is active")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .build()

  private fun vibrateSuccess() {
    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    vibrator?.vibrate(80)
  }

  private fun vibrateError() {
    val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator?.vibrate(VibrationEffect.createOneShot(180, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
      @Suppress("DEPRECATION")
      vibrator?.vibrate(180)
    }
  }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()
}
