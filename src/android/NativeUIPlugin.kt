package dev.rdlabo.cordova.nativeui

import android.webkit.WebView
import dev.rdlabo.capacitor.nativeui.NativeUICall
import dev.rdlabo.capacitor.nativeui.NativeUIController
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.apache.cordova.PluginResult
import org.json.JSONArray
import org.json.JSONObject

class NativeUIPlugin : CordovaPlugin() {
    private var renderer: NativeUIController? = null
    private val listeners = linkedMapOf<String, Pair<String, CallbackContext>>()
    private val events = setOf("activate", "search", "webViewMetricsChange", "overlay", "snapshotInteraction")
    private fun core(): NativeUIController = renderer ?: NativeUIController(
        cordova.activity, webView.view as WebView,
        { event, data ->
            listeners.values.filter { it.first == event }.forEach { (_, callback) ->
                callback.sendPluginResult(PluginResult(PluginResult.Status.OK,
                    JSONObject().put("type", "event").put("data", data)).apply { keepCallback = true })
            }
        }
    ).also { renderer = it; it.load() }

    override fun pluginInitialize() { cordova.activity.runOnUiThread { core() } }
    override fun execute(action: String, args: JSONArray, callback: CallbackContext): Boolean {
        val options = args.optJSONObject(0) ?: JSONObject()
        val supported = setOf("configure", "getWebViewMetrics", "update", "clear", "coveredSnapshot", "completeExtensionAction", "addListener", "removeListener")
        if (action !in supported) return false
        cordova.activity.runOnUiThread {
            try {
                val call = NativeUICall(options, { callback.success(it) }, { message, _ -> callback.error(message) })
                when (action) {
                    "addListener" -> {
                        val id = options.getString("id"); val event = options.getString("eventName")
                        require(event in events && id !in listeners) { "Invalid or duplicate listener" }
                        listeners[id] = event to callback
                        callback.sendPluginResult(PluginResult(PluginResult.Status.OK, JSONObject().put("type", "ready")).apply { keepCallback = true })
                    }
                    "removeListener" -> {
                        listeners.remove(options.getString("id"))?.second?.sendPluginResult(PluginResult(PluginResult.Status.NO_RESULT))
                        callback.success()
                    }
                    "configure" -> core().configure(call)
                    "getWebViewMetrics" -> core().getWebViewMetrics(call)
                    "update" -> core().update(call)
                    "clear" -> core().clear(call)
                    "coveredSnapshot" -> core().coveredSnapshot(call)
                    "completeExtensionAction" -> core().completeExtensionAction(call)
                }
            } catch (error: Exception) { callback.error(error.message ?: "Native UI failed") }
        }
        return true
    }
    private fun reset() {
        listeners.values.forEach { it.second.sendPluginResult(PluginResult(PluginResult.Status.NO_RESULT)) }
        listeners.clear()
        renderer?.destroy()
        renderer = null
    }
    override fun onReset() { cordova.activity.runOnUiThread { reset() } }
    override fun onDestroy() { cordova.activity.runOnUiThread { reset() } }
    override fun onPause(multitasking: Boolean) { renderer?.pause() }
    override fun onResume(multitasking: Boolean) { renderer?.resume() }
}
