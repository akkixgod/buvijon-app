package expo.modules.screentime

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class BlockerChildConfig(
  val childId: String,
  val childName: String,
  val childPin: String,
  val dailyLimitMinutes: Int,
  val blockedPackages: List<String>
)

object BlockerConfigStore {
  private const val PREFS = "buvijon_blocker_config"
  private const val KEY_CONFIGS = "children_configs"

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun saveConfigs(context: Context, configs: List<BlockerChildConfig>) {
    val arr = JSONArray()
    configs.forEach { c ->
      arr.put(JSONObject().apply {
        put("childId", c.childId)
        put("childName", c.childName)
        put("childPin", c.childPin)
        put("dailyLimitMinutes", c.dailyLimitMinutes)
        put("blockedPackages", JSONArray(c.blockedPackages))
      })
    }
    prefs(context).edit().putString(KEY_CONFIGS, arr.toString()).apply()
  }

  fun getConfigs(context: Context): List<BlockerChildConfig> {
    val raw = prefs(context).getString(KEY_CONFIGS, null) ?: return emptyList()
    return try {
      val arr = JSONArray(raw)
      buildList {
        for (i in 0 until arr.length()) {
          val obj = arr.optJSONObject(i) ?: continue
          val pkgs = obj.optJSONArray("blockedPackages") ?: JSONArray()
          val blocked = buildList {
            for (j in 0 until pkgs.length()) {
              val pkg = pkgs.optString(j)
              if (pkg.isNotBlank()) add(pkg)
            }
          }
          val childId = obj.optString("childId")
          val pin = obj.optString("childPin")
          if (childId.isBlank() || pin.isBlank() || blocked.isEmpty()) continue
          add(BlockerChildConfig(
            childId = childId,
            childName = obj.optString("childName"),
            childPin = pin,
            dailyLimitMinutes = obj.optInt("dailyLimitMinutes", 60).coerceAtLeast(1),
            blockedPackages = blocked
          ))
        }
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun findByPin(context: Context, pin: String): BlockerChildConfig? =
    getConfigs(context).firstOrNull { it.childPin == pin }

  fun findByChildId(context: Context, childId: String): BlockerChildConfig? =
    getConfigs(context).firstOrNull { it.childId == childId }

  fun isPackageBlocked(context: Context, packageName: String): Boolean =
    getConfigs(context).any { packageName in it.blockedPackages }

  fun hasAnyBlockedApps(context: Context): Boolean =
    getConfigs(context).any { it.blockedPackages.isNotEmpty() }
}
