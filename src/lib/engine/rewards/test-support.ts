import fc from 'fast-check';
import { parseProgression } from '../progression/definition';
import { applyLessonResult, evaluateLesson } from '../progression/progress';
import type {
	ProgressionDefinition,
	ProgressionRules,
	ProgressState,
	StarCount
} from '../progression/types';
import type { CharStats, SessionMetrics } from '../types';
import type { HelpQuestRules } from './types';

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

function helpLesson(
	id: string,
	newChars: string[],
	words: string[] = [],
	groupLength: [number, number] = [2, 4]
) {
	return { ...lesson(id, newChars), words, groupLength };
}

export const HELP_LESSON_HOME = 'fr.lesson.home';
export const HELP_LESSON_SPACE = 'fr.lesson.space';
export const HELP_LESSON_WORDS = 'fr.lesson.words';
export const HELP_LESSON_LATE = 'fr.lesson.late';
export const HELP_LESSON_IDS = [
	HELP_LESSON_HOME,
	HELP_LESSON_SPACE,
	HELP_LESSON_WORDS,
	HELP_LESSON_LATE
] as const;

/** Four lessons with a space and some words: enough to build help quests on any kind of key. */
export const HELP_PROGRESSION: ProgressionDefinition = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.help',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: RULES,
	worlds: [
		{
			id: 'fr.world.first',
			title: 'First',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				helpLesson(HELP_LESSON_HOME, ['f', 'j']),
				helpLesson(HELP_LESSON_SPACE, [' '], [], [3, 4])
			]
		},
		{
			id: 'fr.world.second',
			title: 'Second',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				helpLesson(HELP_LESSON_WORDS, ['d', 'k'], ['fkd', 'jdk', 'dkf', 'kdj', 'fd jk']),
				helpLesson(HELP_LESSON_LATE, ['s', 'l'], ['sdl', 'lks', 'fsj'], [3, 5])
			]
		}
	]
});

export const HELP_RULES: HelpQuestRules = {
	schemaVersion: 1,
	minRecentAttempts: 10,
	maxErrorRate: 0.2,
	targetLength: 20,
	minCharCount: 6
};

export const HELP_CHARS = ['f', 'j', ' ', 'd', 'k', 's', 'l'] as const;

const lessonProgressArb = fc.record({
	bestAccuracy: fc.integer({ min: 0, max: 100 }),
	stars: fc.constantFrom<StarCount>(0, 1, 2, 3),
	attempts: fc.integer({ min: 1, max: 20 }),
	lastPlayedAt: fc.constant(0)
});

const charProgressArb = fc.record({
	attempts: fc.integer({ min: 1, max: 100 }),
	errors: fc.constant(0),
	recent: fc.array(
		fc.integer({ min: 1, max: 30 }).chain((attempts) =>
			fc.record({
				attempts: fc.constant(attempts),
				errors: fc.integer({ min: 0, max: attempts })
			})
		),
		{ maxLength: 4 }
	)
});

/** Any progress over `HELP_PROGRESSION`: lessons played or not, keys easy or hard. */
export const helpProgressArb: fc.Arbitrary<ProgressState> = fc.record({
	lessons: fc
		.dictionary(fc.constantFrom(...HELP_LESSON_IDS), lessonProgressArb)
		.map((lessons) => lessons as ProgressState['lessons']),
	chars: fc.dictionary(fc.constantFrom(...HELP_CHARS), charProgressArb)
});
