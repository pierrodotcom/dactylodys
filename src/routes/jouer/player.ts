import type { LayoutPlatform } from '$lib/keyboard/types';
import { normalizeName } from '$lib/state/profile';

export type NameCheck =
	| { readonly ok: true; readonly name: string }
	| { readonly ok: false; readonly reason: 'empty' | 'invalid' };

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/;

/** Tells the child what is wrong with a nickname, without creating a profile: same rule as `createProfile`. */
export function checkPlayerName(raw: string): NameCheck {
	if (raw.normalize('NFC').trim() === '') return { ok: false, reason: 'empty' };
	const name = normalizeName(raw);
	return name === null ? { ok: false, reason: 'invalid' } : { ok: true, name };
}

export function platformFromUserAgent(userAgent: string): LayoutPlatform {
	return APPLE_PLATFORM_PATTERN.test(userAgent) ? 'mac' : 'pc';
}
