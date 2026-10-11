import { toGraphemes } from '$lib/engine/graphemes';
import type { LayoutPlatform } from '$lib/keyboard/types';
import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '$lib/state/profile';

export type NameCheck =
	| { readonly ok: true; readonly name: string }
	| { readonly ok: false; readonly reason: 'empty' | 'invalid' };

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;

/**
 * Tells the child what is wrong with a nickname, without creating a profile. It must agree with
 * `createProfile`, which has the last word.
 */
export function checkPlayerName(raw: string): NameCheck {
	const name = raw.normalize('NFC').trim().normalize('NFC');
	if (name === '') return { ok: false, reason: 'empty' };
	const length = toGraphemes(name).length;
	const valid =
		length >= MIN_NAME_LENGTH && length <= MAX_NAME_LENGTH && !CONTROL_CHARACTER_PATTERN.test(name);
	return valid ? { ok: true, name } : { ok: false, reason: 'invalid' };
}

export function platformFromUserAgent(userAgent: string): LayoutPlatform {
	return APPLE_PLATFORM_PATTERN.test(userAgent) ? 'mac' : 'pc';
}
