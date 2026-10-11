import { getLocale } from '$lib/paraglide/runtime.js';

/** `true` when the current language uses its singular form for `count` (in French, 0 and 1). */
export function isOne(count: number): boolean {
	return new Intl.PluralRules(getLocale()).select(count) === 'one';
}
