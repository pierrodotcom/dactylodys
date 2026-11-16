import type { ExerciseContext, ProgressionRules, WordLevel } from './types';

/**
 * How the game helps a child who stumbles on a lesson (audit P-11): data, never constants in the
 * code. Nothing is locked, nothing is taken away: the next play is only made easier.
 */
export interface SupportRules {
	/**
	 * Plays of a lesson in a row under the accuracy that opens the next one, at least 1, after which
	 * the next play of that lesson is aided.
	 */
	readonly afterFailedPlays: number;
	/**
	 * Points under that accuracy within which the result tells the child it is nearly there; further
	 * away, it proposes to play the lesson again, more gently.
	 */
	readonly closeMargin: number;
	/** Highest level of the words, phrases and texts of an aided play. */
	readonly wordLevel: WordLevel;
}

/** `aided`: the hand shows every key, the simplest words, never longer than the lesson. */
export type SupportLevel = 'none' | 'aided';

/** One finished play of a lesson, in the order played: what the journal keeps (`SessionRecord`). */
export interface LessonPlay {
	readonly lessonId: string;
	/** The play reached the accuracy that opens the next lesson. */
	readonly passed: boolean;
}

/**
 * Whether the next play of the lesson is aided: after `afterFailedPlays` plays of this lesson in a
 * row under the threshold, plays of other lessons in between left aside. The help stops as soon as
 * a play of the lesson succeeds. Read from the plays kept, nothing is stored for it.
 */
export function supportLevel(
	plays: readonly LessonPlay[],
	lessonId: string,
	rules: SupportRules
): SupportLevel {
	let failed = 0;
	for (let index = plays.length - 1; index >= 0; index--) {
		const play = plays[index] as LessonPlay;
		if (play.lessonId !== lessonId) continue;
		if (play.passed) return 'none';
		failed += 1;
		if (failed >= rules.afterFailedPlays) return 'aided';
	}
	return 'none';
}

/**
 * What an aided play draws from: the simplest words, phrases and texts (never harder than the
 * context allowed), and the length of the lesson, whatever the pace of the child: the help wins over
 * an exercise that grows with the pace (ADR-084).
 */
export function aidedContext(context: ExerciseContext, rules: SupportRules): ExerciseContext {
	const maxLevel = Math.min(context.maxLevel ?? rules.wordLevel, rules.wordLevel) as WordLevel;
	return { ...context, maxLevel, paces: undefined };
}

/** Whether a play under the accuracy that opens the next lesson stopped within `closeMargin` of it. */
export function isCloseToPassing(
	progressionRules: ProgressionRules,
	rules: SupportRules,
	accuracy: number
): boolean {
	const gap = progressionRules.unlockAccuracy - accuracy;
	return gap > 0 && gap <= rules.closeMargin;
}
