import { findLesson, isDetour, wayCharsOfWorld } from '../progression/definition';
import { charMastery } from '../progression/mastery';
import { isLessonPassed, recentCharStats } from '../progression/progress';
import type { ProgressionDefinition, ProgressState } from '../progression/types';
import type { RewardCatalogue, RewardCondition, RewardDefinition } from './types';

/**
 * Whether the grand tour is passed with every key its world brings on the way acquired. Never
 * for a lesson that is not a tour, nor without the mastery rules of the progression.
 */
function isTourMastered(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): boolean {
	const tour = findLesson(progression, lessonId)?.tour;
	const mastery = progression.rules.keyboardFade;
	if (tour === undefined || mastery === undefined) return false;
	if (!isLessonPassed(progression.rules, progress, lessonId)) return false;
	const keys = wayCharsOfWorld(progression, tour.worldId);
	return keys.every((char) => charMastery(progress, char, mastery) === 'acquired');
}

function starsOf(progress: ProgressState, lessonId: string): number {
	return Object.hasOwn(progress.lessons, lessonId) ? (progress.lessons[lessonId]?.stars ?? 0) : 0;
}

/**
 * Lessons of a world that are on the way, or `null` when the progression has no such world (or it
 * has none): a detour is never asked for what the world gives.
 */
function lessonsOfWorld(
	progression: ProgressionDefinition,
	worldId: string
): readonly string[] | null {
	const world = progression.worlds.find((candidate) => candidate.id === worldId);
	const lessons = world?.lessons.filter((lesson) => !isDetour(lesson)) ?? [];
	return lessons.length === 0 ? null : lessons.map((lesson) => lesson.id);
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
		case 'tour-mastered':
			return isTourMastered(progression, progress, condition.lessonId);
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

/**
 * Rewards that depend directly on this lesson: what the screen announces before playing it, the
 * reward of a grand tour included.
 */
export function rewardsOfLesson(
	catalogue: RewardCatalogue,
	lessonId: string
): readonly RewardDefinition[] {
	return catalogue.rewards.filter(
		({ condition }) =>
			(condition.kind === 'lesson-passed' ||
				condition.kind === 'lesson-stars' ||
				condition.kind === 'tour-mastered') &&
			condition.lessonId === lessonId
	);
}
