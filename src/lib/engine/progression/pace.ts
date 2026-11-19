import type { LessonDefinition, ProgressionRules } from './types';

/** The paces that can be read: finite and above zero. */
function known(paces: readonly number[]): number[] {
	return paces.filter((pace) => Number.isFinite(pace) && pace > 0);
}

/** The middle value, or the mean of the two in the middle; 0 for none. */
export function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	const upper = sorted[middle] ?? 0;
	return sorted.length % 2 === 1 ? upper : ((sorted[middle - 1] ?? upper) + upper) / 2;
}

/**
 * The pace of the child, in correct characters per minute: the median of the latest plays the rules
 * look at. Nothing without rules for it, or with fewer plays than they ask: a beginner has no pace.
 */
export function medianPace(
	rules: ProgressionRules,
	paces: readonly number[] | undefined
): number | undefined {
	const { paceRecentPlays, paceMinPlays } = rules;
	if (paces === undefined || paceRecentPlays === undefined || paceMinPlays === undefined) {
		return undefined;
	}
	const recent = known(paces).slice(-paceRecentPlays);
	return recent.length < paceMinPlays ? undefined : median(recent);
}

/**
 * Graphemes an exercise of this lesson aims at for this child (ADR-075, choice 4): what the median
 * pace types in `rules.targetMinutes`, never under the length of the lesson, never above
 * `rules.maxTargetLength`. The length of the lesson without a known pace: nothing is ever asked
 * faster, and a child who slows down gets a shorter exercise the next time.
 */
export function pacedTargetLength(
	rules: ProgressionRules,
	lesson: LessonDefinition,
	paces: readonly number[] | undefined
): number {
	const { targetMinutes, maxTargetLength } = rules;
	const pace = medianPace(rules, paces);
	if (pace === undefined || targetMinutes === undefined || maxTargetLength === undefined) {
		return lesson.targetLength;
	}
	const aimed = Math.round(pace * targetMinutes);
	return Math.max(lesson.targetLength, Math.min(aimed, maxTargetLength));
}
