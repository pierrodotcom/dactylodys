import { findLesson } from '../progression/definition';
import { isLessonPassed, recentCharStats } from '../progression/progress';
import type { ProgressionDefinition, ProgressState } from '../progression/types';
import type { RewardCatalogue, RewardCondition, RewardDefinition } from './types';

function starsOf(progress: ProgressState, lessonId: string): number {
	return Object.hasOwn(progress.lessons, lessonId) ? (progress.lessons[lessonId]?.stars ?? 0) : 0;
}

/** Lessons of a world, or `null` when the progression has no such world (or it is empty). */
function lessonsOfWorld(
	progression: ProgressionDefinition,
	worldId: string
): readonly string[] | null {
	const world = progression.worlds.find((candidate) => candidate.id === worldId);
	if (world === undefined || world.lessons.length === 0) return null;
	return world.lessons.map((lesson) => lesson.id);
}

function isMet(
	condition: RewardCondition,
	progression: ProgressionDefinition,
	progress: ProgressState
): boolean {
	switch (condition.kind) {
		case 'lesson-passed':
			return (
				findLesson(progression, condition.lessonId) !== undefined &&
				isLessonPassed(progression.rules, progress, condition.lessonId)
			);
		case 'lesson-stars':
			return (
				findLesson(progression, condition.lessonId) !== undefined &&
				starsOf(progress, condition.lessonId) >= condition.stars
			);
		case 'world-passed': {
			const lessons = lessonsOfWorld(progression, condition.worldId);
			return (
				lessons !== null &&
				lessons.every((lessonId) => isLessonPassed(progression.rules, progress, lessonId))
			);
		}
		case 'world-stars': {
			const lessons = lessonsOfWorld(progression, condition.worldId);
			return (
				lessons !== null &&
				lessons.every((lessonId) => starsOf(progress, lessonId) >= condition.stars)
			);
		}
		case 'chars-mastered':
			return condition.chars.every((char) => {
				const { attempts, errors } = recentCharStats(progress, char);
				return (
					attempts > 0 &&
					attempts >= condition.minAttempts &&
					errors / attempts <= condition.maxErrorRate
				);
			});
	}
}

/** Identifiers of the rewards the progress has earned; a pure function, nothing is stored. */
export function unlockedRewards(
	catalogue: RewardCatalogue,
	progression: ProgressionDefinition,
	progress: ProgressState
): ReadonlySet<string> {
	const unlocked = new Set<string>();
	for (const reward of catalogue.rewards) {
		if (isMet(reward.condition, progression, progress)) unlocked.add(reward.id);
	}
	return unlocked;
}

/** What `after` earns that `before` did not, in the order of the catalogue. */
export function newlyUnlocked(
	catalogue: RewardCatalogue,
	progression: ProgressionDefinition,
	before: ProgressState,
	after: ProgressState
): readonly RewardDefinition[] {
	const earlier = unlockedRewards(catalogue, progression, before);
	const later = unlockedRewards(catalogue, progression, after);
	return catalogue.rewards.filter((reward) => later.has(reward.id) && !earlier.has(reward.id));
}

/** Rewards that depend directly on this lesson: what the screen announces before playing it. */
export function rewardsOfLesson(
	catalogue: RewardCatalogue,
	lessonId: string
): readonly RewardDefinition[] {
	return catalogue.rewards.filter(
		({ condition }) =>
			(condition.kind === 'lesson-passed' || condition.kind === 'lesson-stars') &&
			condition.lessonId === lessonId
	);
}
