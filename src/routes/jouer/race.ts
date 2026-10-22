import { slowGhostRun } from '$lib/engine/ghost/race';
import type { GhostRun } from '$lib/engine/ghost/types';
import { isLessonPassed } from '$lib/engine/progression/progress';
import type { ProgressionRules } from '$lib/engine/progression/types';
import type { Profile } from '$lib/state/types';

/**
 * The ghost a child may race on this lesson, already slowed down, or `null`: the race is offered
 * only to replay a passed lesson whose pace was kept (ADR-022).
 */
export function raceGhostFor(
	profile: Profile,
	rules: ProgressionRules,
	lessonId: string,
	paceFactor: number
): GhostRun | null {
	const run = Object.hasOwn(profile.ghosts, lessonId) ? profile.ghosts[lessonId] : undefined;
	if (run === undefined || !isLessonPassed(rules, profile.progress, lessonId)) return null;
	return slowGhostRun(run, paceFactor);
}

/** The ghost greets the child a different way from one play of the lesson to the next. */
export function ghostGreetingFor(profile: Profile, lessonId: string): number {
	return Object.hasOwn(profile.progress.lessons, lessonId)
		? (profile.progress.lessons[lessonId]?.attempts ?? 0)
		: 0;
}
