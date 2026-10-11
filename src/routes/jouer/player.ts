import { createProfile } from '$lib/state/profile';
import type { LayoutPlatform } from '$lib/keyboard/types';

export type NameCheck =
	| { readonly ok: true; readonly name: string }
	| { readonly ok: false; readonly reason: 'empty' | 'invalid' };

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/;

/** The profile contract owns the rules of a nickname; this only tells the child what went wrong. */
export function checkPlayerName(raw: string): NameCheck {
	if (raw.trim() === '') return { ok: false, reason: 'empty' };
	try {
		const probe = createProfile({ id: 'probe', name: raw, now: 0, platform: 'pc' });
		return { ok: true, name: probe.name };
	} catch {
		return { ok: false, reason: 'invalid' };
	}
}

export function platformFromUserAgent(userAgent: string): LayoutPlatform {
	return APPLE_PLATFORM_PATTERN.test(userAgent) ? 'mac' : 'pc';
}
