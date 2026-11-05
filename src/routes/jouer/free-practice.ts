import type { FreeExerciseRules } from '$lib/engine/free-practice/exercise';
import { isTypable, type AdultWordRules } from '$lib/engine/free-practice/words';
import { applyCharResults } from '$lib/engine/progression/progress';
import type { ProgressionDefinition, WorldDefinition } from '$lib/engine/progression/types';
import type { RewardCatalogue } from '$lib/engine/rewards';
import type { SessionMetrics } from '$lib/engine/types';
import type { CharIndex } from '$lib/keyboard/types';
import { withPracticeDay } from '$lib/state/journal';
import { localDay, withGamePlayed, withProgress } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { earnRewards, type EarnedRewards } from './companion';
import { focusLessonId, worldOfLesson } from './map';

/** The words of the adult (ADR-054): how many, how long, and how much is typed in one exercise. */
export type FreePracticeRules = AdultWordRules & FreeExerciseRules;

export const FREE_PRACTICE_RULES: FreePracticeRules = {
	maxWords: 50,
	maxWordLength: 20,
	targetLength: 40
};

/**
 * The words of the adult that the keyboard of the child types now: the layout may have changed
 * since they were given. Empty: the map offers no free practice.
 */
export function freeWordsFor(profile: Profile, index: CharIndex): readonly string[] {
	return profile.adultWords.filter((word) => isTypable(index, word));
}

/** The world whose games are offered for the free practice: the one of the lesson the map proposes. */
export function freePracticeWorld(
	progression: ProgressionDefinition,
	profile: Profile
): WorldDefinition | undefined {
	const focus = focusLessonId(progression, profile.progress, profile.openedWorldIds);
	return focus === null ? undefined : worldOfLesson(progression, focus);
}

export interface FinishedFreePractice {
	readonly metrics: SessionMetrics;
	readonly gameId: string;
	readonly finishedAt: number;
	readonly utcOffsetMinutes: number;
}

/**
 * The profile after a free practice: the keystrokes count in the results of the keys, as in a
 * lesson, so that the adult sees them; no lesson is played (no stars, nothing opens, no ghost) and
 * the play is not a session of the journal, but its day is counted. A key tamed there may earn
 * a reward, as everywhere else: rewards follow mastery.
 */
export function recordFreePractice(
	profile: Profile,
	progression: ProgressionDefinition,
	catalogue: RewardCatalogue | undefined,
	play: FinishedFreePractice
): EarnedRewards {
	const progress = applyCharResults(profile.progress, play.metrics, progression.rules);
	const earned = earnRewards(withProgress(profile, progress), catalogue, progression);
	const next = withPracticeDay(
		withGamePlayed(earned.profile, play.gameId),
		localDay(play.finishedAt, play.utcOffsetMinutes)
	);
	return { profile: next, announced: earned.announced };
}
