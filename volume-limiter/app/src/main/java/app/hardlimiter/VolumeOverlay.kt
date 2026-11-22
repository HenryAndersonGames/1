package app.hardlimiter

import android.content.Context
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.FrameLayout
import kotlin.math.roundToInt

/**
 * Всплывающая панель громкости поверх всех окон (TYPE_ACCESSIBILITY_OVERLAY —
 * отдельное разрешение не нужно). Прячется через пару секунд бездействия
 * или по касанию вне панели.
 */
class VolumeOverlay(private val ctx: Context) {

    private val wm = ctx.getSystemService(WindowManager::class.java)
    private val handler = Handler(Looper.getMainLooper())
    private val dp = ctx.resources.displayMetrics.density
    private var attached = false

    private val bar = VolumeBarView(ctx).apply {
        listener = object : VolumeBarView.Listener {
            override fun onVolumeDragged(value: Int) = LimiterState.setVolume(value)
            override fun onCeilingDragged(value: Int) = LimiterState.setCeiling(value)
            override fun onUserInteraction() = scheduleHide()
        }
    }

    private val root = object : FrameLayout(ctx) {
        override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
            if (ev.actionMasked == MotionEvent.ACTION_OUTSIDE) {
                hide(); return true
            }
            return super.dispatchTouchEvent(ev)
        }
    }.apply {
        addView(bar, FrameLayout.LayoutParams((76 * dp).roundToInt(), (300 * dp).roundToInt()))
        elevation = 8 * dp
    }

    private val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT
    ).apply {
        gravity = Gravity.END or Gravity.CENTER_VERTICAL
        x = (14 * dp).roundToInt()
    }

    private val hideRunnable = Runnable { hide() }

    fun show() {
        refresh()
        if (!attached) {
            runCatching { wm.addView(root, params) }.onSuccess {
                attached = true
                root.alpha = 0f
                root.translationX = 40 * dp
                root.animate().alpha(1f).translationX(0f).setDuration(150).start()
            }
        }
        scheduleHide()
    }

    fun refresh() {
        bar.volume = LimiterState.volume
        bar.ceiling = LimiterState.ceiling
    }

    fun hide() {
        handler.removeCallbacks(hideRunnable)
        if (!attached) return
        root.animate().alpha(0f).translationX(40 * dp).setDuration(150).withEndAction {
            if (attached) {
                runCatching { wm.removeView(root) }
                attached = false
            }
        }.start()
    }

    private fun scheduleHide() {
        handler.removeCallbacks(hideRunnable)
        handler.postDelayed(hideRunnable, HIDE_DELAY_MS)
    }

    companion object {
        private const val HIDE_DELAY_MS = 2500L
    }
}
