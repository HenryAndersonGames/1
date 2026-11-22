package app.hardlimiter

import android.content.Context
import android.content.SharedPreferences
import java.util.concurrent.CopyOnWriteArraySet
import kotlin.math.min

/**
 * Общее состояние: громкость 0..100, порог лимитера 0..100 (на той же шкале),
 * запас усиления и флаг перехвата кнопок. Сохраняется в SharedPreferences.
 * Все вызовы — из главного потока.
 */
object LimiterState {

    /** Диапазон шкалы в дБ: 100 → 0 дБ (+запас), 1 → −59.4 дБ, 0 → тишина. */
    const val RANGE_DB = 60f
    const val MUTE_DB = -120f

    fun interface Listener { fun onLimiterStateChanged() }

    private var prefs: SharedPreferences? = null
    private val listeners = CopyOnWriteArraySet<Listener>()

    var volume = 40; private set
    var ceiling = 85; private set
    var boostDb = 0; private set
    var enabled = true; private set

    fun init(ctx: Context) {
        if (prefs != null) return
        val p = ctx.applicationContext.getSharedPreferences("limiter", Context.MODE_PRIVATE)
        prefs = p
        volume = p.getInt("volume", volume)
        ceiling = p.getInt("ceiling", ceiling)
        boostDb = p.getInt("boost", boostDb)
        enabled = p.getBoolean("enabled", enabled)
    }

    fun setVolume(v: Int) {
        val nv = v.coerceIn(0, 100)
        if (nv == volume) return
        volume = nv
        save()
    }

    fun setCeiling(c: Int) {
        val nc = c.coerceIn(0, 100)
        if (nc == ceiling) return
        ceiling = nc
        save()
    }

    fun setBoost(db: Int) {
        val nb = db.coerceIn(0, 18)
        if (nb == boostDb) return
        boostDb = nb
        save()
    }

    fun setEnabled(e: Boolean) {
        if (e == enabled) return
        enabled = e
        save()
    }

    /** Значение шкалы → дБ. */
    fun levelToDb(level: Int): Float =
        if (level <= 0) MUTE_DB else RANGE_DB * (level / 100f - 1f) + boostDb

    /** Усиление на входе лимитера. */
    fun gainDb(): Float = levelToDb(volume)

    /** Порог жёсткого лимитера в dBFS. Никогда не выше 0 дБ — защита от клиппинга. */
    fun thresholdDb(): Float = min(0f, levelToDb(ceiling))

    fun addListener(l: Listener) { listeners.add(l) }
    fun removeListener(l: Listener) { listeners.remove(l) }

    private fun save() {
        prefs?.edit()
            ?.putInt("volume", volume)
            ?.putInt("ceiling", ceiling)
            ?.putInt("boost", boostDb)
            ?.putBoolean("enabled", enabled)
            ?.apply()
        listeners.forEach { it.onLimiterStateChanged() }
    }
}
