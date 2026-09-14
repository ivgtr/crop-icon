import { isLocale, isMessageKey, translate, type Locale } from '../i18n.js';

const storageKey = 'crop-icon:language';

export function readLocale(): Locale {
  try {
    const saved = localStorage.getItem(storageKey);
    return isLocale(saved) ? saved : 'en';
  } catch {
    // Storage can be disabled; the editor still starts in English.
    return 'en';
  }
}

export function saveLocale(locale: Locale): void {
  try { localStorage.setItem(storageKey, locale); }
  catch { /* Switching language must also work without storage access. */ }
}

export function localizeDocument(locale: Locale): void {
  document.documentElement.lang = locale;
  for (const attribute of ['text', 'aria-label', 'alt', 'placeholder', 'content'] as const) {
    const marker = attribute === 'text' ? 'data-i18n' : `data-i18n-${attribute}`;
    for (const element of document.querySelectorAll(`[${marker}]`)) {
      const key = element.getAttribute(marker);
      if (!key || !isMessageKey(key)) throw new Error(`Unknown message key: ${key}`);
      const value = translate(locale, key);
      if (attribute === 'text') element.textContent = value;
      else element.setAttribute(attribute, value);
    }
  }
}
