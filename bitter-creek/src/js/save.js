// Сохранения и настройки (localStorage — в Electron хранится в папке пользователя).
const KEY = 'bittercreek_save_v1';
const SKEY = 'bittercreek_settings_v1';

export function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
export function writeSave(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }
export function readSave() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
export function deleteSave() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }

export const DEFAULT_SETTINGS = { quality: 'medium', volume: 0.8, fullscreen: true, shake: true, grade: true };
export function loadSettings() {
  try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SKEY) || '{}')); }
  catch (e) { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* */ } }
