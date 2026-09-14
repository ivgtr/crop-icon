import { en, type MessageKey, type Messages } from './locales/en.js';
import { ja } from './locales/ja.js';

export type Locale = 'en' | 'ja';
export type MessageValues = Readonly<Record<string, string | number>>;
export const messages: Record<Locale, Messages> = { en, ja };
export const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'ja';
export const isMessageKey = (value: string): value is MessageKey => Object.hasOwn(en, value);

export function translate(locale: Locale, key: MessageKey, values: MessageValues = {}): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder);
}
