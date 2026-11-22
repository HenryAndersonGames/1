package app.hardlimiter

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.media.audiofx.AudioEffect
import android.os.Build
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent

/**
 * Служба спец. возможностей: перехватывает кнопки громкости и вместо системной
 * панели показывает свою — с шагом 1/100 и порогом лимитера.
 */
class LimiterService : AccessibilityService(), LimiterState.Listener {

    companion object {
        @Volatile
        var instance: LimiterService? = null
            private set
    }

    lateinit var engine: AudioEngine
        private set
    private lateinit var overlay: VolumeOverlay
    private lateinit var am: AudioManager

    private val sessionReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            val id = i.getIntExtra(AudioEffect.EXTRA_AUDIO_SESSION, -1)
            when (i.action) {
                AudioEffect.ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION -> engine.onSessionOpened(id)
                AudioEffect.ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION -> engine.onSessionClosed(id)
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        LimiterState.init(this)
        am = getSystemService(AudioManager::class.java)
        overlay = VolumeOverlay(this)
        engine = AudioEngine(this)
        engine.start()

        val filter = IntentFilter().apply {
            addAction(AudioEffect.ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION)
            addAction(AudioEffect.ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(sessionReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(sessionReceiver, filter)
        }

        LimiterState.addListener(this)
        instance = this
    }

    override fun onKeyEvent(event: KeyEvent): Boolean {
        val code = event.keyCode
        if (code != KeyEvent.KEYCODE_VOLUME_UP && code != KeyEvent.KEYCODE_VOLUME_DOWN) return false
        if (!LimiterState.enabled) return false
        // Звонок, видеосвязь, входящий вызов — отдаём кнопки системе.
        when (am.mode) {
            AudioManager.MODE_IN_CALL,
            AudioManager.MODE_IN_COMMUNICATION,
            AudioManager.MODE_RINGTONE -> return false
        }
        if (event.action == KeyEvent.ACTION_DOWN) {
            // Удержание кнопки даёт автоповтор — громкость плавно едет по 1.
            val step = if (code == KeyEvent.KEYCODE_VOLUME_UP) 1 else -1
            LimiterState.setVolume(LimiterState.volume + step)
            overlay.show()
        }
        return true // системная панель громкости не появляется
    }

    override fun onLimiterStateChanged() {
        engine.apply()
        overlay.refresh()
    }

    fun showPanel() = overlay.show()

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
    override fun onInterrupt() = Unit

    override fun onUnbind(intent: Intent?): Boolean {
        shutdown()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        shutdown()
        super.onDestroy()
    }

    private var stopped = false
    private fun shutdown() {
        if (stopped || instance == null) return
        stopped = true
        instance = null
        LimiterState.removeListener(this)
        runCatching { unregisterReceiver(sessionReceiver) }
        overlay.hide()
        engine.release()
    }
}
