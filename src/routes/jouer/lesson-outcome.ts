import { toGhostRun } from '$lib/engine/ghost/ghost';
import type { RaceWinner } from '$lib/engine/ghost/race';
import { applyLessonResult, evaluateLesson } from '$lib/engine/progression/progress';
import { parseResultRules, type ResultRules } from '$lib/engine/progression/result-rules';
import type { LessonEvaluation, ProgressionRules, StarCount } from '$lib/engine/progression/types';
import type { SessionMetrics } from '$lib/engine/types';
import type { GameOutcome } from '$lib/games/types';
import { withGhost, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import resultRulesData from '../../../content/common/result-rules.json';

/** One more play to tame new keys, help for a child who stumbles: data, never constants. */
export const RESULT_RULES: ResultRules = parseResultRules(resultRulesData);

/**
 * One moment of the result, alone on the screen (audit E-04): a reward won, the question of the
 * name of the companion, then the stars and what comes next.
 */
export type ResultStep =
	| { readonly kind: 'reward'; readonly index: number }
	| { readonly kind: 'name' }
	| { readonly kind: 'result' };

/**
 * The moments of the result, in order: each reward won (`rewardCount`, in the order announced),
 * the question of the name when the companion asks for it, then the result. No step is added when
 * there is nothing to show: a play that won nothing goes straight to its stars.
 */
export function resultSteps(rewardCount: number, askName: boolean): readonly ResultStep[] {
	const rewards = Array.from({ length: Math.max(0, rewardCount) }, (_, index) => ({
		kind: 'reward' as const,
		index
	}));
	return [...rewards, ...(askName ? [{ kind: 'name' as const }] : []), { kind: 'result' }];
}

/** What the result knows of the play, to choose its buttons and its sentence. */
export interface PlayFacts {
	/** The play reached the accuracy that opens the next lesson. */
	readonly passed: boolean;
	/** Under that accuracy, by no more than the margin of the rules (`isCloseToPassing`). */
	readonly close: boolean;
	readonly hasOpenNext: boolean;
	readonly suggestBreak: boolean;
	/** New keys of the lesson still to tame (`keysToTame`). */
	readonly tameKeys: readonly string[];
	/** The last lesson of all is passed. */
	readonly worldDone: boolean;
	readonly race: RaceWinner | null;
	/** Stopped just short of the next star. */
	readonly almost: boolean;
	/** Not one mistake. */
	readonly perfect: boolean;
}

/** A button of the result; the way back to the map is at the top of every step. */
export type ResultAction = 'next' | 'replay' | 'break';

export interface ResultPlan {
	/** The button that stands out, first in its row; the others are light. */
	readonly primary: ResultAction;
	/**
	 * New keys named on the replay, which then stands out (« Encore une partie pour apprivoiser V et
	 * B ? »): the same lesson, with another game. Empty: the replay is « Rejouer ».
	 */
	readonly tame: readonly string[];
	/** What the result says of a play under the threshold while the next lesson stays closed. */
	readonly retry: 'close' | 'far' | null;
}

/**
 * The buttons of the result and the one that stands out. A break proposed comes first. One more
 * play is proposed to tame new keys only after a play that opened the next lesson, which stays
 * there, light (ADR-075, choice 3): nothing is ever locked.
 */
export function resultPlan(facts: PlayFacts): ResultPlan {
	const tame = facts.passed && !facts.suggestBreak ? facts.tameKeys : [];
	const primary: ResultAction = facts.suggestBreak
		? 'break'
		: tame.length === 0 && facts.hasOpenNext
			? 'next'
			: 'replay';
	const retry = facts.passed || facts.hasOpenNext ? null : facts.close ? 'close' : 'far';
	return { primary, tame, retry };
}

/**
 * The buttons of the result, the one that stands out first: the next lesson whenever it is open,
 * the replay always, the break when it is proposed.
 */
export function resultActions(
	plan: ResultPlan,
	facts: Pick<PlayFacts, 'hasOpenNext' | 'suggestBreak'>
): readonly ResultAction[] {
	const offered: ResultAction[] = [
		...(facts.suggestBreak ? ['break' as const] : []),
		...(facts.hasOpenNext ? ['next' as const] : []),
		'replay'
	];
	return [plan.primary, ...offered.filter((action) => action !== plan.primary)];
}

/** The one sentence of the result, under the stars. */
export type ResultSentence =
	| 'retry-close'
	| 'retry-far'
	| 'world-done'
	| 'race-child'
	| 'race-ghost'
	| 'almost'
	| 'perfect'
	| 'note';

/**
 * One sentence, the one that says the most about this play: how close a play under the threshold
 * came, the end of the last world, the race, the star nearly won, a play without a mistake, else
 * the note of the stars.
 */
export function resultSentence(plan: ResultPlan, facts: PlayFacts): ResultSentence {
	if (plan.retry !== null) return plan.retry === 'close' ? 'retry-close' : 'retry-far';
	if (facts.worldDone) return 'world-done';
	if (facts.race !== null) return facts.race === 'child' ? 'race-child' : 'race-ghost';
	if (facts.almost) return 'almost';
	return facts.perfect ? 'perfect' : 'note';
}

export interface RecordedOutcome {
	readonly profile: Profile;
	readonly evaluation: LessonEvaluation;
}

/**
 * The profile after one play of a lesson. The pace is kept only when the lesson is passed: the
 * ghost a child races is always one of their own successes.
 */
export function recordLessonOutcome(
	profile: Profile,
	rules: ProgressionRules,
	lessonId: string,
	outcome: GameOutcome,
	completedAt: number
): RecordedOutcome {
	const evaluation = evaluateLesson(rules, outcome.metrics);
	const progress = applyLessonResult(
		profile.progress,
		{ lessonId, metrics: outcome.metrics, evaluation, completedAt },
		rules
	);
	const played = withProgress(profile, progress);
	const run = evaluation.unlocksNext ? toGhostRun(outcome.pace, completedAt) : null;
	return { profile: run ? withGhost(played, lessonId, run) : played, evaluation };
}

/**
 * The stars of a play whose recording failed, to show its result all the same: none when even
 * they cannot be told.
 */
export function starsOrNone(rules: ProgressionRules, metrics: SessionMetrics): StarCount {
	try {
		return evaluateLesson(rules, metrics).stars;
	} catch {
		return 0;
	}
}
