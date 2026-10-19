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
	companionSpot,
	focusLessonId,
	isOpenOnMap,
	layoutMap,
	lessonStars,
	lessonStatus,
	mapMoveForKey,
	moveOnMap,
	nextLessonId,
	showsKeysHint,
	worldOfLesson,
	type LessonStatus,
	type WorldMapLayout
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
	return applyLessonResult(
		progress,
		{
			lessonId,
			metrics: metrics(accuracy),
			evaluation: { stars, unlocksNext: accuracy >= progression.rules.unlockAccuracy },
			completedAt: 1
		},
		progression.rules
	);
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
		themeBoost: 0,
		newCharMinCount: 0,
		recentCharWindow: 30
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
			applyLessonResult(
				progress,
				{
					lessonId: id,
					metrics: metrics(100),
					evaluation: { stars: 3, unlocksNext: true },
					completedAt: 1
				},
				MANY_WORLDS.rules
			),
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

describe('mapMoveForKey', () => {
	it('moves forward with Right and Down, back with Left and Up, to the ends with Home and End', () => {
		expect(
			['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].map(mapMoveForKey)
		).toEqual(['next', 'next', 'previous', 'previous', 'first', 'last']);
	});

	it('ignores the other keys, Enter and Space included', () => {
		expect(['Enter', ' ', 'Tab', 'a', 'toString', 'PageDown'].map(mapMoveForKey)).toEqual(
			Array(6).fill(null)
		);
	});
});

/** A map whose open lessons are given by status, to try a locked lesson between two open ones. */
function mapOf(statuses: readonly (readonly LessonStatus[])[]): WorldMapLayout {
	let number = 0;
	return {
		focusId: null,
		worlds: statuses.map((world, worldIndex) => ({
			id: `w${worldIndex}`,
			title: `World ${worldIndex}`,
			current: false,
			lessons: world.map((status) => {
				number += 1;
				return { id: `l${number}`, title: `Lesson ${number}`, number, status, stars: 0, side: 0 };
			})
		}))
	};
}

describe('moveOnMap', () => {
	const layout = layoutMap(MANY_WORLDS, passed(3));

	it('goes to the next and the previous open lesson, from one world to the next', () => {
		expect(moveOnMap(layout, 'xx.lesson.1a', 'next')).toBe('xx.lesson.1b');
		expect(moveOnMap(layout, 'xx.lesson.1b', 'next')).toBe('xx.lesson.2a');
		expect(moveOnMap(layout, 'xx.lesson.2a', 'previous')).toBe('xx.lesson.1b');
	});

	it('stays at the ends of the open path, without going round', () => {
		expect(moveOnMap(layout, 'xx.lesson.2b', 'next')).toBeNull();
		expect(moveOnMap(layout, 'xx.lesson.1a', 'previous')).toBeNull();
	});

	it('goes to the first and the last open lesson', () => {
		expect(moveOnMap(layout, 'xx.lesson.2a', 'first')).toBe('xx.lesson.1a');
		expect(moveOnMap(layout, 'xx.lesson.1a', 'last')).toBe('xx.lesson.2b');
		expect(moveOnMap(layout, null, 'last')).toBe('xx.lesson.2b');
	});

	it('steps over locked lessons, inside a world and across worlds', () => {
		const gapped = mapOf([['done', 'locked'], ['locked', 'current', 'locked'], ['current']]);

		expect(moveOnMap(gapped, 'l1', 'next')).toBe('l4');
		expect(moveOnMap(gapped, 'l4', 'next')).toBe('l6');
		expect(moveOnMap(gapped, 'l6', 'previous')).toBe('l4');
		expect(moveOnMap(gapped, 'l4', 'previous')).toBe('l1');
		expect(moveOnMap(gapped, 'l1', 'last')).toBe('l6');
	});

	it('does not move from an unknown lesson, and finds nothing on a map without open lesson', () => {
		expect(moveOnMap(layout, 'xx.lesson.unknown', 'next')).toBeNull();
		const closed = mapOf([['locked', 'locked']]);
		expect(moveOnMap(closed, 'l1', 'next')).toBeNull();
		expect(moveOnMap(closed, null, 'first')).toBeNull();
		expect(moveOnMap(closed, null, 'last')).toBeNull();
	});

	it('always leads to an open lesson of the map', () => {
		const moves = ['next', 'previous', 'first', 'last'] as const;
		for (let count = 0; count <= MANY_IDS.length; count++) {
			const map = layoutMap(MANY_WORLDS, passed(count));
			for (const from of MANY_IDS) {
				for (const move of moves) {
					const target = moveOnMap(map, from, move);
					if (target !== null) expect(isOpenOnMap(map, target)).toBe(true);
				}
			}
		}
	});
});

describe('isOpenOnMap', () => {
	it('tells an open lesson from a locked or unknown one', () => {
		const layout = layoutMap(MANY_WORLDS, passed(1));

		expect(isOpenOnMap(layout, 'xx.lesson.1b')).toBe(true);
		expect(isOpenOnMap(layout, 'xx.lesson.2a')).toBe(false);
		expect(isOpenOnMap(layout, 'xx.lesson.unknown')).toBe(false);
	});
});

describe('showsKeysHint', () => {
	it('hides the hint while a single lesson is open: the arrows would move nothing', () => {
		expect(showsKeysHint(layoutMap(MANY_WORLDS, emptyProgress()))).toBe(false);
		expect(showsKeysHint(mapOf([]))).toBe(false);
	});

	it('shows the hint from two open lessons on, in any world', () => {
		expect(showsKeysHint(layoutMap(MANY_WORLDS, passed(1)))).toBe(true);
		expect(showsKeysHint(mapOf([['current'], ['locked', 'done']]))).toBe(true);
	});
});

describe('companionSpot', () => {
	const trail = { left: 100, top: 1000, width: 600, height: 2000 };
	const room = { left: 120, top: 1200, width: 560, height: 400 };
	const companion = { width: 40, height: 50 };

	it('stands in the middle of the free room after a lesson on the first side', () => {
		const lesson = { left: 120, top: 1300, width: 480, height: 70 };

		expect(companionSpot(trail, room, lesson, companion, 0)).toEqual({ x: 520, y: 310 });
	});

	it('stands in the middle of the free room before a lesson on the second side', () => {
		const lesson = { left: 200, top: 1300, width: 480, height: 70 };

		expect(companionSpot(trail, room, lesson, companion, 1)).toEqual({ x: 40, y: 310 });
	});
});

describe('worldOfLesson', () => {
	it('finds the world a lesson belongs to', () => {
		expect(worldOfLesson(MANY_WORLDS, 'xx.lesson.2b')?.id).toBe('xx.world.2');
		expect(worldOfLesson(MANY_WORLDS, 'xx.lesson.unknown')).toBeUndefined();
	});
});
