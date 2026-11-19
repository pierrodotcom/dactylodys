import type { CharIndex, KeyCode } from '../../keyboard/types';
import { median } from './pace';
import { recentCharLatency } from './progress';
import type { HandGuideRules, ProgressState } from './types';

/** How long a child takes on a key lately: the mean time before its recent right keystrokes. */
export interface KeyLatency {
	readonly latencyMs: number;
	/** The recent right keystrokes the time is measured on. */
	readonly correct: number;
}

/**
 * The time of each physical key lately (ADR-056): the characters it types last (the letter after a
 * dead key, the key under Shift) gathered, weighted by their recent right keystrokes. A character
 * without a time, or that the layout does not write, is left out.
 */
export function keyLatencies(
	progress: ProgressState,
	charIndex: CharIndex
): ReadonlyMap<KeyCode, KeyLatency> {
	const sums = new Map<KeyCode, { weighted: number; correct: number }>();
	for (const char of Object.keys(progress.chars)) {
		const { latencyMs, correct } = recentCharLatency(progress, char);
		const code = charIndex.get(char)?.[0]?.at(-1)?.code;
		if (latencyMs === null || code === undefined) continue;
		const sum = sums.get(code) ?? { weighted: 0, correct: 0 };
		sums.set(code, {
			weighted: sum.weighted + latencyMs * correct,
			correct: sum.correct + correct
		});
	}
	return new Map(
		[...sums].map(([code, sum]) => [
			code,
			{ latencyMs: sum.weighted / sum.correct, correct: sum.correct }
		])
	);
}

/**
 * How long a game waits, without a key, before it helps a child who hesitates (audit P-07): the
 * hand shows the key expected, a key that faded lights again. `hesitationMs`, or
 * `hesitationFactor` times the median time of the keys this child has measured lately, whichever
 * is longer: a child who types slowly is not helped at every key, and one slow key does not draw
 * the wait up. Until `hesitationMinKeys` keys have `hesitationMinCorrect` right keystrokes each,
 * `hesitationMs`. 0, never, without `hesitationMs`.
 */
export function hesitationDelayMs(
	rules: HandGuideRules | undefined,
	progress: ProgressState,
	charIndex: CharIndex
): number {
	const shortest = rules?.hesitationMs ?? 0;
	if (rules === undefined || shortest <= 0) return 0;
	const { hesitationFactor, hesitationMinKeys, hesitationMinCorrect } = rules;
	if (
		hesitationFactor === undefined ||
		hesitationMinKeys === undefined ||
		hesitationMinCorrect === undefined
	) {
		return shortest;
	}
	const measured = [...keyLatencies(progress, charIndex).values()].filter(
		(key) => key.correct >= hesitationMinCorrect
	);
	if (measured.length < hesitationMinKeys) return shortest;
	return Math.max(shortest, hesitationFactor * median(measured.map((key) => key.latencyMs)));
}
