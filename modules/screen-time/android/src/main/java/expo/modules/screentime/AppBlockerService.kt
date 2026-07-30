package expo.modules.screentime

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class AppBlockerService : Service() {

  companion object {
    private const val CHANNEL_ID = "app_blocker_channel"
    private const val NOTIFICATION_ID = 1001
    private const val POLL_INTERVAL_MS = 1500L

    // Actions
    const val ACTION_SET_CHILD_PIN = "expo.modules.screentime.SET_CHILD_PIN"
    const val ACTION_PIN_VERIFIED = "expo.modules.screentime.PIN_VERIFIED"
    const val ACTION_ACTIVE_CHILD_CHANGED = "expo.modules.screentime.ACTIVE_CHILD_CHANGED"

    // Service actions
    const val SERVICE_ACTION_LOGOUT = "LOGOUT"

    // Extras
    const val EXTRA_CHILD_ID = "child_id"
    const val EXTRA_CHILD_NAME = "child_name"
    const val EXTRA_CHILD_PIN = "child_pin"
    const val EXTRA_PREVIOUS_CHILD_ID = "previous_child_id"

    // Static storage for child info (preserved across service restarts)
    private val childPinMap = mutableMapOf<String, String>()
  }

  private var blockedPackages = listOf<String>()
  private var childName = ""
  private val handler = Handler(Looper.getMainLooper())
  private var overlayView: LinearLayout? = null
  private var windowManager: WindowManager? = null
  private var isOverlayShown = false
  private var isPolling = false
  private var pinValue = StringBuilder()
  private var pinDots: List<TextView> = emptyList()
  private var messageView: TextView? = null

  private val pollRunnable = object : Runnable {
    override fun run() {
      checkForegroundApp()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  private fun startPolling() {
    if (isPolling) return
    isPolling = true
    handler.post(pollRunnable)
  }

  private fun stopPolling() {
    handler.removeCallbacks(pollRunnable)
    isPolling = false
  }

  private fun emitActiveChildChanged(previous: String?, next: String?) {
    val intent = Intent(ACTION_ACTIVE_CHILD_CHANGED).apply {
      `package` = packageName
      if (previous != null) putExtra(EXTRA_PREVIOUS_CHILD_ID, previous)
      if (next != null) putExtra(EXTRA_CHILD_ID, next)
    }
    sendBroadcast(intent)
  }

  // Broadcast receiver for setting child PIN from JS
  private val pinReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == ACTION_SET_CHILD_PIN) {
        val childId = intent.getStringExtra(EXTRA_CHILD_ID)
        val pin = intent.getStringExtra(EXTRA_CHILD_PIN)
        if (childId != null && pin != null) {
          childPinMap[childId] = pin
        }
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    createNotificationChannel()

    // Register broadcast receiver for PIN updates
    val filter = IntentFilter(ACTION_SET_CHILD_PIN)
    registerReceiver(pinReceiver, filter)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      "START" -> {
        blockedPackages = intent.getStringArrayListExtra("blocked_packages") ?: listOf()
        childName = intent.getStringExtra("child_name") ?: ""
        val childId = intent.getStringExtra("child_id")
        val pin = intent.getStringExtra("child_pin")

        if (childId != null && pin != null) {
          childPinMap[childId] = pin
        }

        startForeground(NOTIFICATION_ID, buildNotification())
        startPolling()
      }
      SERVICE_ACTION_LOGOUT -> {
        val previous = ChildSessionStore.getActiveChildId(this)
        if (previous != null) {
          ChildSessionStore.setActiveChildId(this, null)
          emitActiveChildChanged(previous, null)
        }
        // Keep service alive so the next blocked-app launch shows the overlay.
        startPolling()
      }
      else -> {
        stopSelf()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    stopPolling()
    hideOverlay()
    try {
      unregisterReceiver(pinReceiver)
    } catch (e: Exception) {
      // Receiver might not be registered
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun checkForegroundApp() {
    val foregroundPkg = getForegroundPackage() ?: return
    val isBlocked = blockedPackages.contains(foregroundPkg)
    val activeChildId = ChildSessionStore.getActiveChildId(this)

    if (!isBlocked) {
      hideOverlay()
      return
    }

    if (activeChildId != null) {
      // Continuous attribution: count this poll tick toward the active child
      // and let them keep using the app without re-asking the PIN.
      hideOverlay()
      ChildSessionStore.incrementUsage(this, activeChildId, foregroundPkg, POLL_INTERVAL_MS)
    } else if (!isOverlayShown) {
      showOverlay()
    }
  }

  private fun getForegroundPackage(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
    val endTime = System.currentTimeMillis()
    val startTime = endTime - 5000

    val events = usm.queryEvents(startTime, endTime)
    var lastPkg: String? = null
    val event = UsageEvents.Event()

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
        lastPkg = event.packageName
      }
    }
    return lastPkg
  }

  private fun showOverlay() {
    if (isOverlayShown || overlayView != null) return
    if (!android.provider.Settings.canDrawOverlays(this)) return

    val dp = { value: Int ->
      TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()
    }
    pinValue.clear()

    val primary = Color.parseColor("#7C3AED")
    val textPrimary = Color.parseColor("#111111")
    val textMuted = Color.parseColor("#888888")
    val keyBg = Color.parseColor("#F8F6FF")

    fun keyBackground(): GradientDrawable = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(keyBg)
    }

    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setBackgroundColor(Color.WHITE)
      setPadding(dp(24), dp(48), dp(24), dp(24))
    }

    val brandView = TextView(this).apply {
      text = "Buvijon"
      textSize = 18f
      setTextColor(primary)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(12))
    }
    layout.addView(brandView)

    val titleView = TextView(this).apply {
      text = "Kirishni tasdiqlang"
      textSize = 24f
      setTextColor(textPrimary)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(8))
    }
    layout.addView(titleView)

    val subtitleView = TextView(this).apply {
      text = "Ota-ona PIN-kodi yoki biometriya orqali kiring"
      textSize = 15f
      setTextColor(Color.parseColor("#333333"))
      gravity = Gravity.CENTER
      setPadding(dp(8), 0, dp(8), dp(28))
    }
    layout.addView(subtitleView)

    val dotsRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(8))
    }
    val dots = mutableListOf<TextView>()
    repeat(4) { index ->
      val dot = TextView(this).apply {
        text = "○"
        textSize = 22f
        setTextColor(Color.parseColor("#CCCCCC"))
        gravity = Gravity.CENTER
        setPadding(dp(10), 0, dp(10), 0)
      }
      dots.add(dot)
      dotsRow.addView(dot)
      if (index < 3) {
        // spacing via padding already
      }
    }
    pinDots = dots
    layout.addView(dotsRow)

    messageView = TextView(this).apply {
      text = " "
      textSize = 14f
      setTextColor(Color.parseColor("#EF4444"))
      gravity = Gravity.CENTER
      setPadding(0, dp(8), 0, dp(8))
      minHeight = dp(28)
    }
    layout.addView(messageView)

    // Flexible spacer
    layout.addView(View(this), LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f
    ))

    fun refreshDots() {
      pinDots.forEachIndexed { i, tv ->
        if (i < pinValue.length) {
          tv.text = "●"
          tv.setTextColor(primary)
        } else {
          tv.text = "○"
          tv.setTextColor(Color.parseColor("#CCCCCC"))
        }
      }
    }

    fun appendDigit(digit: String) {
      if (pinValue.length >= 4) return
      pinValue.append(digit)
      refreshDots()
      messageView?.text = " "
      if (pinValue.length == 4) verifyPin()
    }

    fun backspace() {
      if (pinValue.isEmpty()) return
      pinValue.deleteCharAt(pinValue.length - 1)
      refreshDots()
    }

    val keySize = dp(72)
    val keyMargin = dp(6)
    val rows = listOf(
      listOf("1", "2", "3"),
      listOf("4", "5", "6"),
      listOf("7", "8", "9"),
      listOf("", "0", "⌫"),
    )
    for (row in rows) {
      val rowLayout = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, dp(8))
      }
      for (label in row) {
        val key = TextView(this).apply {
          text = label
          textSize = if (label == "⌫") 22f else 26f
          setTextColor(textPrimary)
          gravity = Gravity.CENTER
          typeface = Typeface.DEFAULT_BOLD
          background = if (label.isEmpty()) null else keyBackground()
          isClickable = label.isNotEmpty()
          isFocusable = label.isNotEmpty()
          setOnClickListener {
            when (label) {
              "" -> Unit
              "⌫" -> backspace()
              else -> appendDigit(label)
            }
          }
        }
        val lp = LinearLayout.LayoutParams(keySize, keySize).apply {
          setMargins(keyMargin, 0, keyMargin, 0)
        }
        rowLayout.addView(key, lp)
      }
      layout.addView(rowLayout)
    }

    val hintView = TextView(this).apply {
      text = "Ota-ona PIN-kodi — to'liq kirish | Bola PIN-kodi — cheklangan rejim"
      textSize = 13f
      setTextColor(textMuted)
      gravity = Gravity.CENTER
      setLineSpacing(dp(2).toFloat(), 1f)
      setPadding(dp(8), dp(12), dp(8), 0)
    }
    layout.addView(hintView)

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
      isOverlayShown = true
      refreshDots()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  private fun hideOverlay() {
    if (!isOverlayShown || overlayView == null) return
    try {
      windowManager?.removeView(overlayView)
    } catch (e: Exception) {
      e.printStackTrace()
    }
    overlayView = null
    isOverlayShown = false
    pinValue.clear()
    pinDots = emptyList()
    messageView = null
  }

  private fun verifyPin() {
    val enteredPin = pinValue.toString()
    if (enteredPin.length != 4) return

    val foundChildId = childPinMap.entries.find { it.value == enteredPin }?.key
    if (foundChildId != null) {
      val previous = ChildSessionStore.getActiveChildId(this)
      ChildSessionStore.setActiveChildId(this, foundChildId)
      if (previous != foundChildId) {
        emitActiveChildChanged(previous, foundChildId)
      }

      val pinIntent = Intent(ACTION_PIN_VERIFIED).apply {
        `package` = packageName
        putExtra(EXTRA_CHILD_ID, foundChildId)
        putExtra(EXTRA_CHILD_NAME, childName)
      }
      sendBroadcast(pinIntent)

      hideOverlay()

      val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      vibrator?.vibrate(100)
    } else {
      messageView?.text = "Noto'g'ri PIN-kod. Qayta urinib ko'ring."
      pinValue.clear()
      pinDots.forEach { tv ->
        tv.text = "○"
        tv.setTextColor(Color.parseColor("#CCCCCC"))
      }

      val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator?.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.EFFECT_DOUBLE_CLICK))
      } else {
        vibrator?.vibrate(200)
      }
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Контроль приложений",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Buvijon следит за использованием приложений"
      }
      val nm = getSystemService(NotificationManager::class.java)
      nm.createNotificationChannel(channel)
    }
  }

  private fun buildNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Buvijon")
      .setContentText("Контроль приложений активен")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setOngoing(true)
      .build()
  }
}
