package app.hardlimiter

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity(), LimiterState.Listener {

    private lateinit var status: TextView
    private lateinit var bar: VolumeBarView
    private lateinit var swEnabled: Switch
    private lateinit var boost: SeekBar
    private lateinit var boostLabel: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        LimiterState.init(this)
        setContentView(R.layout.activity_main)

        status = findViewById(R.id.status)
        bar = findViewById(R.id.bar)
        swEnabled = findViewById(R.id.swEnabled)
        boost = findViewById(R.id.boost)
        boostLabel = findViewById(R.id.boostLabel)

        findViewById<Button>(R.id.btnA11y).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        findViewById<Button>(R.id.btnShow).setOnClickListener {
            val s = LimiterService.instance
            if (s == null) {
                Toast.makeText(this, "Сначала включите службу в спец. возможностях", Toast.LENGTH_LONG).show()
            } else {
                s.showPanel()
            }
        }
        swEnabled.setOnCheckedChangeListener { _, checked -> LimiterState.setEnabled(checked) }

        bar.listener = object : VolumeBarView.Listener {
            override fun onVolumeDragged(value: Int) = LimiterState.setVolume(value)
            override fun onCeilingDragged(value: Int) = LimiterState.setCeiling(value)
        }

        boost.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(sb: SeekBar, p: Int, fromUser: Boolean) {
                if (fromUser) LimiterState.setBoost(p)
            }
            override fun onStartTrackingTouch(sb: SeekBar) = Unit
            override fun onStopTrackingTouch(sb: SeekBar) = Unit
        })
    }

    override fun onResume() {
        super.onResume()
        LimiterState.addListener(this)
        LimiterService.instance?.engine?.onStatusChanged = { runOnUiThread { render() } }
        render()
    }

    override fun onPause() {
        LimiterState.removeListener(this)
        LimiterService.instance?.engine?.onStatusChanged = null
        super.onPause()
    }

    override fun onLimiterStateChanged() = render()

    private fun render() {
        bar.volume = LimiterState.volume
        bar.ceiling = LimiterState.ceiling
        swEnabled.isChecked = LimiterState.enabled
        boost.progress = LimiterState.boostDb
        boostLabel.text = getString(R.string.boost_label, LimiterState.boostDb)

        val s = LimiterService.instance
        status.text = buildString {
            if (s == null) {
                append("⚠ Служба выключена.\nОткройте «Спец. возможности» → «Хард Лимитер» и включите её.")
            } else {
                append("✓ Служба работает\n")
                when (s.engine.mode) {
                    AudioEngine.Mode.GLOBAL ->
                        append("Режим: глобальный — шаг 1/100 и лимитер для всего звука")
                    AudioEngine.Mode.SESSIONS ->
                        append("Режим: по плеерам — глобальный эффект недоступен на этом телефоне. ")
                            .append("Громкость — системными шагами, лимитер — в плеерах, ")
                            .append("которые его поддерживают (подключено: ${s.engine.attachedSessions})")
                }
                if (!s.engine.hasControl) append("\n⚠ Другое приложение-эквалайзер перехватило аудиоэффект")
            }
            append("\n\nГромкость %d · усиление %.1f дБ · порог %.1f дБ".format(
                LimiterState.volume, LimiterState.gainDb(), LimiterState.thresholdDb()))
        }
    }
}
