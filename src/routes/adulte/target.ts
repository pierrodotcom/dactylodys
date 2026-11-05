import type { HandwritingSample, Profile, SessionRecord } from '$lib/state/types';
import { wordsPerMinuteOf } from './evolution';
import { readDigits } from './gate';

/** The speed at the keyboard: the median of the `count` most recent plays, `null` without any. */
export function keyboardSpeed(sessions: readonly SessionRecord[], count: number): number | null {
	if (count < 1) return null;
	const speeds = sessions
		.slice(-count)
		.map(wordsPerMinuteOf)
		.sort((first, second) => first - second);
	if (speeds.length === 0) return null;
	const middle = Math.floor(speeds.length / 2);
	const upper = speeds[middle] ?? 0;
	return speeds.length % 2 === 1 ? upper : ((speeds[middle - 1] ?? upper) + upper) / 2;
}

/** The handwriting speed measured last, `null` before the first measure. */
export function latestHandwriting(samples: readonly HandwritingSample[]): HandwritingSample | null {
	return samples.at(-1) ?? null;
}

/**
 * Where the child stands against the personal target, to beat the handwriting speed:
 * `no-measure` without a handwriting speed, `no-play` without a play, then `below` or `reached`.
 */
export type TargetStatus = 'no-measure' | 'no-play' | 'below' | 'reached';

export function targetStatus(keyboard: number | null, handwriting: number | null): TargetStatus {
	if (handwriting === null) return 'no-measure';
	if (keyboard === null) return 'no-play';
	return keyboard >= handwriting ? 'reached' : 'below';
}

/** The words the adult counted, a whole number within the limits; `null` for anything else. */
export function readHandwritingWords(text: string, min: number, max: number): number | null {
	const words = readDigits(text);
	return words !== null && words >= min && words <= max ? words : null;
}

/** The profile with one more handwriting speed, after the others. */
export function withHandwritingSample(profile: Profile, sample: HandwritingSample): Profile {
	if (!Number.isSafeInteger(sample.measuredAt) || sample.measuredAt < 0) {
		throw new RangeError('measuredAt must be a timestamp');
	}
	if (!Number.isFinite(sample.wordsPerMinute) || sample.wordsPerMinute <= 0) {
		throw new RangeError('wordsPerMinute must be a positive number');
	}
	return { ...profile, handwritingSamples: [...profile.handwritingSamples, sample] };
}
