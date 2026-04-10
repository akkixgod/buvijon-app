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
import android.os.*
import android.text.Editable
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
    private const val POLL_INTERVAL_MS = 1500L
    private const val GRACE_PERIOD_MS = 60_000L // 1 minute grace after correct PIN

    // Actions
    const val ACTION_SET_CHILD_PIN = "expo.modules.screentime.SET_CHILD_PIN"
    const val ACTION_PIN_VERIFIED = "expo.modules.screentime.PIN_VERIFIED"

    // Extras
    const val EXTRA_CHILD_ID = "child_id"
    const val EXTRA_CHILD_NAME = "child_name"
    const val EXTRA_CHILD_PIN = "child_pin"

    // Static storage for child info (preserved across service restarts)
    private val childPinMap = mutableMapOf<String, String>()
    private var currentChildId: String? = null
    private var pinVerifiedAt: Long = 0
  }

  private var blockedPackages = listOf<String>()
  private var childName = ""
  private val handler = Handler(Looper.getMainLooper())
  private var overlayView: LinearLayout? = null
  private var windowManager: WindowManager? = null
  private var isOverlayShown = false
  private var pinInput: EditText? = null
  private var messageView: TextView? = null

  private val pollRunnable = object : Runnable {
    override fun run() {
      checkForegroundApp()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
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
          currentChildId = null // Reset current child when starting blocker
          pinVerifiedAt = 0
        }

        startForeground(NOTIFICATION_ID, buildNotification())
        handler.post(pollRunnable)
      }
      else -> {
        stopSelf()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(pollRunnable)
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

    // Check if within grace period after correct PIN
    if (System.currentTimeMillis() - pinVerifiedAt < GRACE_PERIOD_MS) {
      hideOverlay()
      return
    }

    if (blockedPackages.contains(foregroundPkg)) {
      if (!isOverlayShown) {
        showOverlay()
      }
    } else {
      hideOverlay()
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

    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F9FAFB"))
      setPadding(dp(32), dp(48), dp(32), dp(48))
    }

    // Emoji icon
    val emojiView = TextView(this).apply {
      text = "\uD83C\uDF3A" // 🌺
      textSize = 64f
      gravity = Gravity.CENTER
    }
    layout.addView(emojiView)

    // Title
    val titleView = TextView(this).apply {
      text = "Введите PIN-код"
      textSize = 24f
      setTextColor(Color.parseColor("#111827"))
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, dp(16), 0, dp(8))
    }
    layout.addView(titleView)

    // Subtitle
    val subtitleView = TextView(this).apply {
      text = if (childName.isNotEmpty()) {
        "$childName, введите ваш PIN-код"
      } else {
        "Введите ваш PIN-код"
      }
      textSize = 16f
      setTextColor(Color.parseColor("#6B7280"))
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(24))
    }
    layout.addView(subtitleView)

    // PIN input
    pinInput = EditText(this).apply {
      hint = "****"
      inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
      textSize = 32f
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#111827"))
      setHintTextColor(Color.parseColor("#9CA3AF"))
      maxLines = 1
      // Limit to 4 characters
      filters = arrayOf(android.text.InputFilter.LengthFilter(4))
      setPadding(dp(24), dp(16), dp(24), dp(16))
      // Remove bottom line
      background = null
      setOnFocusChangeListener { _, hasFocus ->
        if (hasFocus) {
          setBackgroundColor(Color.parseColor("#F3F4F6"))
        } else {
          setBackgroundColor(Color.TRANSPARENT)
        }
      }
      // Auto-verify when 4 digits entered
      addTextChangedListener(object : android.text.TextWatcher {
        override fun afterTextChanged(s: android.text.Editable?) {
          val entered = s?.toString() ?: ""
          if (entered.length == 4) {
            verifyPin()
          }
        }
        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
      })
    }
    val pinContainer = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(dp(16), 0, dp(16), 0)
      addView(pinInput)
    }
    layout.addView(pinContainer)

    // Message view for errors
    messageView = TextView(this).apply {
      text = ""
      textSize = 14f
      setTextColor(Color.parseColor("#EF4444"))
      gravity = Gravity.CENTER
      setPadding(0, dp(12), 0, 0)
    }
    layout.addView(messageView)

    // Info text
    val infoView = TextView(this).apply {
      text = "PIN-код был установлен родителем.\nОбратитесь к родителю если забыли код."
      textSize = 13f
      setTextColor(Color.parseColor("#9CA3AF"))
      gravity = Gravity.CENTER
      setLineSpacing(dp(4).toFloat(), 1f)
      setPadding(0, dp(16), 0, 0)
    }
    layout.addView(infoView)

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
      pinInput?.requestFocus()
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
    pinInput = null
    messageView = null
  }

  private fun verifyPin() {
    val enteredPin = pinInput?.text?.toString() ?: ""
    if (enteredPin.length == 4) {
      val foundChildId = childPinMap.entries.find { it.value == enteredPin }?.key
      if (foundChildId != null) {
        // Correct PIN
        currentChildId = foundChildId
        pinVerifiedAt = System.currentTimeMillis()

        // Send broadcast to React Native
        val intent = Intent(ACTION_PIN_VERIFIED).apply {
          putExtra(EXTRA_CHILD_ID, foundChildId)
          putExtra(EXTRA_CHILD_NAME, childName)
        }
        sendBroadcast(intent)

        hideOverlay()

        // Vibrate feedback
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        vibrator?.vibrate(100)
      } else {
        // Wrong PIN
        messageView?.text = "Неверный PIN-код. Попробуйте снова."
        pinInput?.text?.clear()
        pinInput?.requestFocus()

        // Vibrate error
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          vibrator?.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.EFFECT_DOUBLE_CLICK))
        } else {
          vibrator?.vibrate(200)
        }
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
