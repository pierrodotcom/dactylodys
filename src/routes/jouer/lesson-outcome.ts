import { toGhostRun } from '$lib/engine/ghost/ghost';
import { applyLessonResult, evaluateLesson } from '$lib/engine/progression/progress';
import type { LessonEvaluation, ProgressionRules } from '$lib/engine/progression/types';
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
	const progress = applyLessonResult(profile.progress, {
		lessonId,
		metrics: outcome.metrics,
		evaluation,
		completedAt
	});
	const played = withProgress(profile, progress);
	const run = evaluation.unlocksNext ? toGhostRun(outcome.pace, completedAt) : null;
	return { profile: run ? withGhost(played, lessonId, run) : played, evaluation };
}
