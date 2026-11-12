import { AGE_BANDS } from '$lib/engine/progression/banks';
import type { LayoutPlatform } from '$lib/keyboard/types';
import { normalizeName } from '$lib/state/profile';
import type { AgeBand } from '$lib/state/types';

/** The answer of a child who does not know their age group (or would rather not say). */
export const UNKNOWN_AGE = 'unknown';

/** What the child answers to "You are…" when the player is created. */
export type AgeAnswer = AgeBand | typeof UNKNOWN_AGE;

/** The age group the child chose, `null` when they do not know: the profile keeps its own. */
export function ageBandOfAnswer(answer: string): AgeBand | null {
	return AGE_BANDS.find((band) => band === answer) ?? null;
}

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
