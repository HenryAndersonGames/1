package app.hardlimiter

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.audiofx.DynamicsProcessing
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Звуковой движок.
 *
 * GLOBAL   — эффект DynamicsProcessing на глобальном выходе (сессия 0). Системная
 *            громкость ставится на ближайший шаг, а доля шага (точность 1/100)
 *            и жёсткий лимитер делаются цифрово внутри эффекта.
 * SESSIONS — глобальный эффект недоступен на этом устройстве: громкость идёт
 *            системными шагами, а лимитер вешается на сессии плееров, которые
 *            сообщают о себе (Spotify, VLC, Poweramp и др.).
 */
class AudioEngine(private val ctx: Context) {

    enum class Mode { GLOBAL, SESSIONS }

    var mode = Mode.SESSIONS; private set
    var hasControl = true; private set
    var onStatusChanged: (() -> Unit)? = null

    private val am = ctx.getSystemService(AudioManager::class.java)
    private val handler = Handler(Looper.getMainLooper())
    private var global: DynamicsProcessing? = null
    private val sessions = HashMap<Int, DynamicsProcessing>()

    private val deviceCallback = object : AudioDeviceCallback() {
        // У наушников и динамика своя системная громкость — переприменяем.
        override fun onAudioDevicesAdded(added: Array<out AudioDeviceInfo>?) { tableDevice = -1; apply() }
        override fun onAudioDevicesRemoved(removed: Array<out AudioDeviceInfo>?) { tableDevice = -1; apply() }
    }

    fun start() {
        global = try {
            create(0)
        } catch (t: Throwable) {
            Log.w(TAG, "Глобальный эффект недоступен: $t")
            null
        }
        mode = if (global != null) Mode.GLOBAL else Mode.SESSIONS
        am.registerAudioDeviceCallback(deviceCallback, handler)
        apply()
        onStatusChanged?.invoke()
    }

    fun release() {
        am.unregisterAudioDeviceCallback(deviceCallback)
        // Не оставляем систему на максимуме без нашего эффекта — возвращаем обычную громкость.
        setSystemSteps(LimiterState.volume)
        runCatching { global?.release() }
        global = null
        sessions.values.forEach { runCatching { it.release() } }
        sessions.clear()
    }

    fun onSessionOpened(sessionId: Int) {
        if (mode == Mode.GLOBAL || sessionId <= 0 || sessions.containsKey(sessionId)) return
        try {
            sessions[sessionId] = create(sessionId)
            apply()
        } catch (t: Throwable) {
            Log.w(TAG, "Не удалось подключиться к сессии $sessionId: $t")
        }
    }

    fun onSessionClosed(sessionId: Int) {
        sessions.remove(sessionId)?.let { runCatching { it.release() } }
    }

    val attachedSessions: Int get() = sessions.size

    /** Применить текущее состояние LimiterState к звуку. */
    fun apply() {
        val gain = LimiterState.gainDb()
        val thr = LimiterState.thresholdDb()
        when (mode) {
            Mode.GLOBAL -> {
                val g = global ?: return
                // Гибрид: системная громкость — ближайший шаг НЕ НИЖЕ нужного уровня,
                // цифрово добавляем только остаток (меньше одного шага).
                // Так динамик работает на обычном уровне, а не на максимуме, где
                // прошивка включает защиту/срез баса и звук портится.
                val (idx, fine) = splitGain(gain)
                val cur = am.getStreamVolume(STREAM)
                if (idx > cur) {
                    // Громче: сначала цифровое ослабление, потом шаг — без щелчка
                    configure(g, fine, thr)
                    setIndex(idx)
                } else {
                    setIndex(idx)
                    configure(g, fine, thr)
                }
            }
            Mode.SESSIONS -> {
                setSystemSteps(LimiterState.volume)
                // Эффект сессии стоит ДО системной громкости, поэтому порог
                // пересчитываем относительно текущего уровня.
                val relThr = min(0f, thr - min(0f, gain))
                sessions.values.forEach { configure(it, 0f, relThr) }
            }
        }
    }

    private fun create(session: Int): DynamicsProcessing {
        val cfg = DynamicsProcessing.Config.Builder(
            DynamicsProcessing.VARIANT_FAVOR_TIME_RESOLUTION,
            CHANNELS,
            false, 0,   // pre-EQ
            false, 0,   // многополосный компрессор
            false, 0,   // post-EQ
            true        // лимитер
        ).build()
        val dp = DynamicsProcessing(Int.MAX_VALUE, session, cfg)
        dp.setControlStatusListener { _, granted ->
            hasControl = granted
            onStatusChanged?.invoke()
        }
        configure(dp, LimiterState.MUTE_DB, -1f)
        dp.enabled = true
        return dp
    }

    private fun configure(dp: DynamicsProcessing, gainDb: Float, thresholdDb: Float) {
        try {
            dp.setInputGainAllChannelsTo(gainDb)
            dp.setLimiterAllChannelsTo(
                DynamicsProcessing.Limiter(
                    true,          // inUse
                    true,          // enabled
                    0,             // linkGroup — каналы связаны, стерео-картина не плывёт
                    ATTACK_MS,
                    RELEASE_MS,
                    RATIO,
                    thresholdDb,
                    0f             // postGain
                )
            )
        } catch (t: Throwable) {
            Log.w(TAG, "configure: $t")
        }
    }

    /**
     * Разбивает нужное усиление (дБ относительно максимума) на системный шаг
     * и цифровой остаток <= 0 дБ (или > 0 при запасе усиления на максимуме).
     */
    private fun splitGain(gainDb: Float): Pair<Int, Float> {
        if (gainDb <= LimiterState.MUTE_DB) return 0 to LimiterState.MUTE_DB
        val table = stepTable()
        val max = table.size - 1
        for (i in 1..max) {
            if (table[i] >= gainDb) return i to (gainDb - table[i])
        }
        return max to (gainDb - table[max])
    }

    private var tableDevice = -1
    private var tableCache = FloatArray(0)

    /** дБ каждого системного шага относительно максимального (max → 0 дБ). */
    private fun stepTable(): FloatArray {
        val device = currentDeviceType()
        val max = am.getStreamMaxVolume(STREAM)
        if (device == tableDevice && tableCache.size == max + 1) return tableCache
        val raw = FloatArray(max + 1) { i ->
            runCatching { am.getStreamVolumeDb(STREAM, i, device) }.getOrDefault(Float.NaN)
        }
        val top = raw[max]
        var t = FloatArray(max + 1) { i -> raw[i] - top }
        // Таблица битая или "плоская" (например, Bluetooth с абсолютной громкостью) —
        // считаем шаги равномерными по шкале.
        val ok = !top.isNaN() && (1..max).all { !t[it].isNaN() && !t[it].isInfinite() } &&
            t[1] < -10f && (1 until max).all { t[it] <= t[it + 1] }
        if (!ok) t = FloatArray(max + 1) { i -> LimiterState.RANGE_DB * (i.toFloat() / max - 1f) }
        t[0] = Float.NEGATIVE_INFINITY
        tableDevice = device
        tableCache = t
        return t
    }

    private fun currentDeviceType(): Int {
        if (Build.VERSION.SDK_INT >= 33) {
            val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).build()
            am.getDevicesForAttributes(attrs).firstOrNull()?.let { return it.type }
        }
        val outs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).map { it.type }
        val prio = listOf(
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES, AudioDeviceInfo.TYPE_WIRED_HEADSET,
            AudioDeviceInfo.TYPE_USB_HEADSET, AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
        )
        return prio.firstOrNull { it in outs } ?: AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
    }

    private fun setIndex(idx: Int) {
        if (am.getStreamVolume(STREAM) != idx) {
            runCatching { am.setStreamVolume(STREAM, idx, 0) }
        }
    }

    private fun setSystemSteps(level: Int) {
        val max = am.getStreamMaxVolume(STREAM)
        val idx = (level / 100.0 * max).roundToInt().let { if (level > 0) it.coerceAtLeast(1) else 0 }
        if (am.getStreamVolume(STREAM) != idx) {
            runCatching { am.setStreamVolume(STREAM, idx, 0) }
        }
    }

    companion object {
        private const val TAG = "HardLimiter"
        private const val STREAM = AudioManager.STREAM_MUSIC
        private const val CHANNELS = 2
        // Без look-ahead слишком быстрая атака/отпускание рвут бас — берём
        // мягче по времени, но с высоким ratio, чтобы порог оставался жёстким.
        private const val ATTACK_MS = 3f
        private const val RELEASE_MS = 300f
        private const val RATIO = 20f
    }
}
