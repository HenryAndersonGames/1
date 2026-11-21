import { Game } from './game.js';

function start() {
  try {
    window.game = new Game();
  } catch (e) {
    console.error(e);
    const el = document.getElementById('loading');
    el.classList.remove('hidden');
    el.innerHTML = '<div style="max-width:640px;line-height:1.5">Не удалось запустить графику (WebGL).<br>Обновите драйвер видеокарты или запустите игру с низким качеством.<br><br><small>' + String(e && e.message || e) + '</small></div>';
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 30));
else setTimeout(start, 30);
