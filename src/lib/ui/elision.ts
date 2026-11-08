import { m } from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime.js';

/** `true` when the word before `name` drops its vowel in the current language ("d'Ali", not "de Ali"). */
export function isElidedBefore(name: string): boolean {
	const initial = name.trimStart().normalize('NFC').charAt(0).toLocaleLowerCase(getLocale());
	return initial !== '' && m.ui_elision_initials().includes(initial);
}
