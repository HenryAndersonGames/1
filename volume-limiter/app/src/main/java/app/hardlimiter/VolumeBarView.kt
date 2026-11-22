package app.hardlimiter

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Вертикальная полоса громкости в стиле системной панели:
 * голубая заливка — громкость, оранжевая линия — верхний порог лимитера.
 * Линию можно тянуть пальцем; касание в остальной части полосы меняет громкость.
 */
class VolumeBarView @JvmOverloads constructor(
    ctx: Context, attrs: AttributeSet? = null
) : View(ctx, attrs) {

    interface Listener {
        fun onVolumeDragged(value: Int)
        fun onCeilingDragged(value: Int)
        fun onUserInteraction() {}
    }

    var listener: Listener? = null

    var volume = 50
        set(v) { field = v.coerceIn(0, 100); invalidate() }
    var ceiling = 80
        set(v) { field = v.coerceIn(0, 100); invalidate() }

    private val dp = resources.displayMetrics.density
    private val sp = resources.displayMetrics.scaledDensity

    private val panelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xF0202227.toInt() }
    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33FFFFFF }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF4FC3F7.toInt() }
    private val clippedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x88FF7043.toInt() }
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFB300.toInt(); strokeWidth = 3 * dp; strokeCap = Paint.Cap.ROUND
    }
    private val knobPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFB300.toInt() }
    private val valuePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt(); textSize = 18 * sp
        textAlign = Paint.Align.CENTER; typeface = Typeface.DEFAULT_BOLD
    }
    private val ceilTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFB300.toInt(); textSize = 13 * sp
        textAlign = Paint.Align.CENTER; typeface = Typeface.DEFAULT_BOLD
    }
    private val smallPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF9AA0A6.toInt(); textSize = 10 * sp; textAlign = Paint.Align.CENTER
    }

    private val panel = RectF()
    private val track = RectF()
    private val trackPath = Path()
    private val tmp = RectF()

    private enum class Drag { NONE, VOLUME, CEILING }
    private var drag = Drag.NONE

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val w = resolveSize((76 * dp).roundToInt(), widthMeasureSpec)
        val h = resolveSize((300 * dp).roundToInt(), heightMeasureSpec)
        setMeasuredDimension(w, h)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        panel.set(0f, 0f, w.toFloat(), h.toFloat())
        val half = 16 * dp
        track.set(w / 2f - half, 46 * dp, w / 2f + half, h - 52 * dp)
        trackPath.reset()
        trackPath.addRoundRect(track, half, half, Path.Direction.CW)
    }

    private fun valueToY(v: Int) = track.bottom - track.height() * v / 100f
    private fun yToValue(y: Float) = ((track.bottom - y) / track.height() * 100f).roundToInt().coerceIn(0, 100)

    override fun onDraw(canvas: Canvas) {
        val r = 26 * dp
        canvas.drawRoundRect(panel, r, r, panelPaint)

        // Дорожка и заливка
        canvas.drawPath(trackPath, trackPaint)
        val volY = valueToY(volume)
        val ceilY = valueToY(ceiling)
        canvas.save()
        canvas.clipPath(trackPath)
        tmp.set(track.left, volY, track.right, track.bottom)
        canvas.drawRect(tmp, fillPaint)
        if (ceiling < volume) {
            // Часть громкости выше порога — то, что срезает лимитер
            tmp.set(track.left, volY, track.right, ceilY)
            canvas.drawRect(tmp, clippedPaint)
        }
        canvas.restore()

        // Линия порога с "ушками" для пальца
        val ext = 10 * dp
        canvas.drawLine(track.left - ext, ceilY, track.right + ext, ceilY, linePaint)
        canvas.drawCircle(track.left - ext, ceilY, 5 * dp, knobPaint)
        canvas.drawCircle(track.right + ext, ceilY, 5 * dp, knobPaint)

        // Подписи
        val cx = panel.centerX()
        canvas.drawText(volume.toString(), cx, 30 * dp, valuePaint)
        canvas.drawText("лимит", cx, panel.bottom - 34 * dp, smallPaint)
        canvas.drawText(ceiling.toString(), cx, panel.bottom - 16 * dp, ceilTextPaint)
    }

    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                parent?.requestDisallowInterceptTouchEvent(true)
                val nearLine = abs(e.y - valueToY(ceiling)) < 24 * dp
                drag = if (nearLine) Drag.CEILING else Drag.VOLUME
                handleDrag(e.y)
            }
            MotionEvent.ACTION_MOVE -> handleDrag(e.y)
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                drag = Drag.NONE
                parent?.requestDisallowInterceptTouchEvent(false)
            }
            MotionEvent.ACTION_OUTSIDE -> return false
        }
        listener?.onUserInteraction()
        return true
    }

    private fun handleDrag(y: Float) {
        val v = yToValue(y)
        when (drag) {
            Drag.VOLUME -> if (v != volume) {
                volume = v
                listener?.onVolumeDragged(v)
            }
            Drag.CEILING -> if (v != ceiling) {
                ceiling = v
                if (v % 5 == 0) performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                listener?.onCeilingDragged(v)
            }
            Drag.NONE -> Unit
        }
    }
}
