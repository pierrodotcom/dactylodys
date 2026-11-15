import { toGhostRun } from '$lib/engine/ghost/ghost';
import { applyLessonResult, evaluateLesson } from '$lib/engine/progression/progress';
import type { LessonEvaluation, ProgressionRules, StarCount } from '$lib/engine/progression/types';
import type { SessionMetrics } from '$lib/engine/types';
import type { GameOutcome } from '$lib/games/types';
import { withGhost, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';

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
