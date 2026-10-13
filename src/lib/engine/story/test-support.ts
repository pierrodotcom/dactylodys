import type { SessionMetrics } from '../types';
import { parseProgression } from '../progression/definition';
import { applyLessonResult, evaluateLesson } from '../progression/progress';
import type {
	LessonResult,
	ProgressionDefinition,
	ProgressionRules,
	ProgressState
} from '../progression/types';
import { deepFreeze } from '../progression/test-support';
import { parseStory } from './definition';
import type { StoryDefinition } from './types';

export const RULES: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 0,
	recentCharWindow: 30
};

export const PASSING = 90;
export const FAILING = 50;

function lesson(id: string, newChars: string[]) {
	return {
		id,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 1, words: 0, phrases: 0 },
		unlocks: [],
		groupCount: 5,
		targetLength: 20,
		groupLength: [2, 4]
	};
}

export const PROGRESSION: ProgressionDefinition = deepFreeze(
	parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.test',
		locale: 'fr-FR',
		layoutIds: ['fr-fr-azerty-pc'],
		rules: RULES,
		worlds: [
			{
				id: 'fr.world.one',
				title: 'One',
				themeId: 'dinos',
				gameIds: ['hatching'],
				lessons: [lesson('fr.lesson.a', ['f', 'j']), lesson('fr.lesson.b', ['d', 'k'])]
			},
			{
				id: 'fr.world.two',
				title: 'Two',
				themeId: 'dinos',
				gameIds: ['hatching'],
				lessons: [lesson('fr.lesson.c', ['s', 'l'])]
			}
		]
	})
);

export const STORY_DATA = {
	schemaVersion: 1,
	id: 'fr.story.test',
	locale: 'fr-FR',
	progressionId: 'fr.progression.test',
	worlds: [
		{
			worldId: 'fr.world.one',
			opening: 'Open one.',
			ending: 'End one.',
			lessons: [
				{ lessonId: 'fr.lesson.a', line: 'Line a.' },
				{ lessonId: 'fr.lesson.b', line: 'Line b.' }
			]
		},
		{
			worldId: 'fr.world.two',
			opening: 'Open two.',
			ending: 'End two.',
			lessons: [{ lessonId: 'fr.lesson.c', line: 'Line c.' }]
		}
	]
};

export const STORY: StoryDefinition = deepFreeze(parseStory(structuredClone(STORY_DATA)));

export const LESSON_IDS = ['fr.lesson.a', 'fr.lesson.b', 'fr.lesson.c'] as const;

function metricsWith(accuracy: number): SessionMetrics {
	return {
		elapsedMs: 60_000,
		totalKeystrokes: 100,
		correctKeystrokes: accuracy,
		errorCount: 100 - accuracy,
		accuracy,
		correctCharsPerMinute: 100,
		wordsPerMinute: 20,
		perChar: {}
	};
}

/** The progress after one play of the lesson. */
export function play(progress: ProgressState, lessonId: string, accuracy: number): ProgressState {
	const metrics = metricsWith(accuracy);
	const result: LessonResult = {
		lessonId,
		metrics,
		evaluation: evaluateLesson(RULES, metrics),
		completedAt: 1000
	};
	return applyLessonResult(progress, result, RULES);
}
