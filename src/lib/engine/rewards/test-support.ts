import { parseProgression } from '../progression/definition';
import { applyLessonResult, evaluateLesson } from '../progression/progress';
import type { ProgressionDefinition, ProgressionRules, ProgressState } from '../progression/types';
import type { CharStats, SessionMetrics } from '../types';

export const RULES: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 0,
	recentCharWindow: 30
};

export const LESSON_A = 'fr.lesson.a';
export const LESSON_B = 'fr.lesson.b';
export const LESSON_C = 'fr.lesson.c';
export const WORLD_ONE = 'fr.world.one';
export const WORLD_TWO = 'fr.world.two';
export const LESSON_IDS = [LESSON_A, LESSON_B, LESSON_C] as const;

function lesson(id: string, newChars: string[], unlocks: string[] = []) {
	return {
		id,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 1, words: 0, phrases: 0 },
		unlocks,
		groupCount: 5,
		targetLength: 20,
		groupLength: [2, 4]
	};
}

export const PROGRESSION: ProgressionDefinition = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.test',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: RULES,
	worlds: [
		{
			id: WORLD_ONE,
			title: 'One',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [lesson(LESSON_A, ['f', 'j']), lesson(LESSON_B, ['d', 'k'])]
		},
		{
			id: WORLD_TWO,
			title: 'Two',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [lesson(LESSON_C, ['s', 'l'], ['uppercase'])]
		}
	]
});

export function rewardData(
	id: string,
	condition: unknown,
	extra: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		id: `fr.reward.${id}`,
		kind: 'trophy',
		title: `Title ${id}`,
		description: `Description ${id}`,
		artId: id,
		condition,
		...extra
	};
}

export function catalogueData(
	rewards: unknown[],
	extra: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		schemaVersion: 1,
		id: 'fr.rewards.test',
		locale: 'fr-FR',
		progressionId: PROGRESSION.id,
		colors: [
			{ id: 'green', title: 'Green' },
			{ id: 'blue', title: 'Blue' }
		],
		nameSuggestions: ['Pipo'],
		rewards,
		...extra
	};
}

export function stats(attempts: number, errors: number): CharStats {
	return { attempts, errors, meanLatencyMs: null };
}

export function playLesson(
	progress: ProgressState,
	lessonId: string,
	accuracy: number,
	perChar: Record<string, CharStats> = {}
): ProgressState {
	const metrics: SessionMetrics = {
		elapsedMs: 60_000,
		totalKeystrokes: 100,
		correctKeystrokes: Math.round(accuracy),
		errorCount: 100 - Math.round(accuracy),
		accuracy,
		correctCharsPerMinute: 100,
		wordsPerMinute: 20,
		perChar
	};
	return applyLessonResult(
		progress,
		{ lessonId, metrics, evaluation: evaluateLesson(RULES, metrics), completedAt: 1000 },
		RULES
	);
}
