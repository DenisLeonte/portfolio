import en from './en.json';
import ro from './ro.json';
import it from './it.json';

export const SUPPORTED_LANGS = ['en', 'ro', 'it'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export const LANG_LABELS: Record<Lang, string> = {
  en: 'EN',
  ro: 'RO',
  it: 'IT',
};

export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  ro: 'Română',
  it: 'Italiano',
};

const translations: Record<Lang, typeof en> = { en, ro, it };

/**
 * Get a nested translation value by dot-separated key.
 * e.g. t('nav.about', 'ro') => 'Despre'
 */
export function t(key: string, lang: Lang = DEFAULT_LANG): string {
  const parts = key.split('.');
  let result: unknown = translations[lang];
  for (const part of parts) {
    if (result && typeof result === 'object' && part in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[part];
    } else {
      // Fallback to English
      result = translations[DEFAULT_LANG];
      for (const p of parts) {
        if (result && typeof result === 'object' && p in (result as Record<string, unknown>)) {
          result = (result as Record<string, unknown>)[p];
        } else {
          return key; // key not found
        }
      }
      return String(result);
    }
  }
  return String(result);
}

/**
 * Get a translation value that might be an array (e.g. typingPhrases).
 */
export function tArray(key: string, lang: Lang = DEFAULT_LANG): string[] {
  const parts = key.split('.');
  let result: unknown = translations[lang];
  for (const part of parts) {
    if (result && typeof result === 'object' && part in (result as Record<string, unknown>)) {
      result = (result as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }
  return Array.isArray(result) ? result.map(String) : [];
}

/**
 * Get the full translation object for a language.
 */
export function getTranslations(lang: Lang = DEFAULT_LANG) {
  return translations[lang];
}

/**
 * Detect language from browser navigator.language, falling back to 'en'.
 */
export function detectLanguage(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (SUPPORTED_LANGS.includes(browserLang as Lang)) {
    return browserLang as Lang;
  }
  return DEFAULT_LANG;
}
