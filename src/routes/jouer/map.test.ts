import { describe, expect, it } from 'vitest';
import { applyLessonResult, emptyProgress } from '$lib/engine/progression/progress';
import { lessonIds } from '$lib/engine/progression/definition';
import { loadShippedProgressions } from '$lib/engine/progression/test-support';
import type {
	LessonDefinition,
	ProgressionDefinition,
	ProgressState,
	StarCount
} from '$lib/engine/progression/types';
import type { SessionMetrics } from '$lib/engine/types';
import {
	focusLessonId,
	layoutMap,
	lessonStars,
	lessonStatus,
	nextLessonId,
	worldOfLesson
} from './map';

const [{ progression }] = loadShippedProgressions() as [
	ReturnType<typeof loadShippedProgressions>[number]
];
const IDS = lessonIds(progression);

function metrics(accuracy: number): SessionMetrics {
	return {
		elapsedMs: 1000,
		totalKeystrokes: 100,
		correctKeystrokes: accuracy,
		errorCount: 100 - accuracy,
		accuracy,
		correctCharsPerMinute: 0,
		wordsPerMinute: 0,
		perChar: {}
	};
}

function played(progress: ProgressState, lessonId: string, accuracy: number, stars: StarCount) {
	return applyLessonResult(progress, {
		lessonId,
		metrics: metrics(accuracy),
		evaluation: { stars, unlocksNext: accuracy >= progression.rules.unlockAccuracy },
		completedAt: 1
	});
}

describe('lessonStatus', () => {
	it('opens the first lesson and closes the others for a new player', () => {
		const statuses = IDS.map((id) => lessonStatus(progression, emptyProgress(), id));

		expect(statuses[0]).toBe('current');
		expect(statuses.slice(1).every((status) => status === 'locked')).toBe(true);
	});

	it('marks a passed lesson as done and opens the next one', () => {
		const progress = played(emptyProgress(), IDS[0] as string, 100, 3);

		expect(lessonStatus(progression, progress, IDS[0] as string)).toBe('done');
		expect(lessonStatus(progression, progress, IDS[1] as string)).toBe('current');
		expect(lessonStatus(progression, progress, IDS[2] as string)).toBe('locked');
	});

	it('keeps a lesson open, not done, when it was played below the unlock accuracy', () => {
		const progress = played(emptyProgress(), IDS[0] as string, 40, 0);

		expect(lessonStatus(progression, progress, IDS[0] as string)).toBe('current');
		expect(lessonStatus(progression, progress, IDS[1] as string)).toBe('locked');
	});

	it('treats the exact unlock accuracy as passed', () => {
		const progress = played(emptyProgress(), IDS[0] as string, progression.rules.unlockAccuracy, 1);

		expect(lessonStatus(progression, progress, IDS[0] as string)).toBe('done');
	});
});

describe('lessonStars', () => {
	it('returns the best stars of a lesson, zero when never played', () => {
		const progress = played(emptyProgress(), IDS[0] as string, 100, 3);

		expect(lessonStars(progress, IDS[0] as string)).toBe(3);
		expect(lessonStars(progress, IDS[1] as string)).toBe(0);
	});
});

describe('nextLessonId', () => {
	it('returns the lesson that follows, null after the last one or for an unknown lesson', () => {
		expect(nextLessonId(progression, IDS[0] as string)).toBe(IDS[1]);
		expect(nextLessonId(progression, IDS[IDS.length - 1] as string)).toBeNull();
		expect(nextLessonId(progression, 'fr.lesson.unknown')).toBeNull();
	});
});

function lessonOf(id: string): LessonDefinition {
	return {
		id,
		title: `Title of ${id}`,
		intro: 'Intro.',
		newChars: ['f'],
		words: [],
		mix: { drills: 1, words: 0, phrases: 0 },
		unlocks: [],
		groupCount: 3,
		targetLength: 10,
		groupLength: [2, 3]
	};
}

/** Three worlds of two lessons each, the second world offering no game list. */
const MANY_WORLDS: ProgressionDefinition = {
	schemaVersion: 1,
	id: 'xx.progression.many',
	locale: 'xx',
	layoutIds: [],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 97],
		newCharWeight: 0.6,
		weakCharBoost: 0,
		themeBoost: 0
	},
	worlds: [1, 2, 3].map((index) => ({
		id: `xx.world.${index}`,
		title: `World ${index}`,
		themeId: `theme-${index}`,
		gameIds: ['hatching'],
		lessons: [lessonOf(`xx.lesson.${index}a`), lessonOf(`xx.lesson.${index}b`)]
	}))
};

const MANY_IDS = lessonIds(MANY_WORLDS);

function passed(count: number): ProgressState {
	return MANY_IDS.slice(0, count).reduce(
		(progress, id) =>
			applyLessonResult(progress, {
				lessonId: id,
				metrics: metrics(100),
				evaluation: { stars: 3, unlocksNext: true },
				completedAt: 1
			}),
		emptyProgress()
	);
}

describe('layoutMap', () => {
	it('shows every world one after the other, with all their lessons, closed ones too', () => {
		const layout = layoutMap(MANY_WORLDS, emptyProgress());

		expect(layout.worlds.map((world) => world.title)).toEqual(['World 1', 'World 2', 'World 3']);
		expect(layout.worlds.map((world) => world.lessons.length)).toEqual([2, 2, 2]);
		expect(layout.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.status))).toEqual([
			'current',
			'locked',
			'locked',
			'locked',
			'locked',
			'locked'
		]);
	});

	it('numbers the lessons along the whole path, not world by world', () => {
		const layout = layoutMap(MANY_WORLDS, emptyProgress());

		expect(layout.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.number))).toEqual([
			1, 2, 3, 4, 5, 6
		]);
	});

	it('alternates the side of the lessons along the whole path', () => {
		const layout = layoutMap(MANY_WORLDS, emptyProgress());

		expect(layout.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.side))).toEqual([
			0, 1, 0, 1, 0, 1
		]);
	});

	it('marks the first world as current for a new player', () => {
		const layout = layoutMap(MANY_WORLDS, emptyProgress());

		expect(layout.worlds.map((world) => world.current)).toEqual([true, false, false]);
		expect(layout.focusId).toBe('xx.lesson.1a');
	});

	it('marks the world of the most advanced open lesson as current', () => {
		const layout = layoutMap(MANY_WORLDS, passed(3));

		expect(layout.worlds.map((world) => world.current)).toEqual([false, true, false]);
		expect(layout.focusId).toBe('xx.lesson.2b');
	});

	it('moves to the next world as soon as its first lesson opens', () => {
		const layout = layoutMap(MANY_WORLDS, passed(2));

		expect(layout.worlds.map((world) => world.current)).toEqual([false, true, false]);
		expect(layout.focusId).toBe('xx.lesson.2a');
	});

	it('keeps the last lesson in focus when everything is passed', () => {
		const layout = layoutMap(MANY_WORLDS, passed(MANY_IDS.length));

		expect(layout.focusId).toBe('xx.lesson.3b');
		expect(layout.worlds.map((world) => world.current)).toEqual([false, false, true]);
		expect(layout.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.status))).toEqual(
			Array(6).fill('done')
		);
	});

	it('gives the stars of every lesson, in any world', () => {
		const layout = layoutMap(MANY_WORLDS, passed(3));

		expect(layout.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.stars))).toEqual([
			3, 3, 3, 0, 0, 0
		]);
	});

	it('handles a progression without world', () => {
		const layout = layoutMap({ ...MANY_WORLDS, worlds: [] }, emptyProgress());

		expect(layout).toEqual({ worlds: [], focusId: null });
	});
});

describe('focusLessonId', () => {
	it('is the last open lesson', () => {
		expect(focusLessonId(MANY_WORLDS, passed(4))).toBe('xx.lesson.3a');
	});
});

describe('worldOfLesson', () => {
	it('finds the world a lesson belongs to', () => {
		expect(worldOfLesson(MANY_WORLDS, 'xx.lesson.2b')?.id).toBe('xx.world.2');
		expect(worldOfLesson(MANY_WORLDS, 'xx.lesson.unknown')).toBeUndefined();
	});
});
