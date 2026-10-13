import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { emptyProgress } from '../progression/progress';
import type { ProgressState } from '../progression/types';
import { storyAfterLesson, storyBeforeLesson } from './moments';
import { FAILING, LESSON_IDS, PASSING, PROGRESSION, STORY, play } from './test-support';
import type { StoryDefinition, StoryMoment, StoryWorld } from './types';

const WORLD_ONE = STORY.worlds[0] as StoryWorld;
const A = 'fr.lesson.a';
const B = 'fr.lesson.b';
const C = 'fr.lesson.c';

const OPENING_ONE: StoryMoment = { kind: 'opening', text: 'Open one.' };
const OPENING_TWO: StoryMoment = { kind: 'opening', text: 'Open two.' };
const LINE_A: StoryMoment = { kind: 'line', text: 'Line a.' };
const LINE_B: StoryMoment = { kind: 'line', text: 'Line b.' };
const LINE_C: StoryMoment = { kind: 'line', text: 'Line c.' };
const ENDING_ONE: StoryMoment = { kind: 'ending', text: 'End one.' };
const ENDING_TWO: StoryMoment = { kind: 'ending', text: 'End two.' };

function before(progress: ProgressState, lessonId: string) {
	return storyBeforeLesson(STORY, PROGRESSION, progress, lessonId);
}

function after(previous: ProgressState, next: ProgressState, lessonId: string) {
	return storyAfterLesson(STORY, PROGRESSION, previous, next, lessonId);
}

function progressAfter(...plays: [string, number][]): ProgressState {
	return plays.reduce((progress, [id, accuracy]) => play(progress, id, accuracy), emptyProgress());
}

describe('storyBeforeLesson', () => {
	it('opens the world on a new profile', () => {
		expect(before(emptyProgress(), A)).toEqual([OPENING_ONE]);
	});

	it('opens the world for any of its lessons while none has been played', () => {
		expect(before(emptyProgress(), B)).toEqual([OPENING_ONE]);
	});

	it('opens the second world as soon as the child enters it', () => {
		expect(before(progressAfter([A, PASSING], [B, PASSING]), C)).toEqual([OPENING_TWO]);
	});

	it('tells nothing once a lesson of the world has been played', () => {
		expect(before(progressAfter([A, PASSING]), B)).toEqual([]);
	});

	it('tells nothing once a lesson of the world has been played and failed', () => {
		expect(before(progressAfter([A, FAILING]), A)).toEqual([]);
		expect(before(progressAfter([A, FAILING]), B)).toEqual([]);
	});

	it('is not affected by plays in other worlds', () => {
		expect(before(progressAfter([C, PASSING]), A)).toEqual([OPENING_ONE]);
	});

	it('tells nothing for an unknown lesson', () => {
		expect(before(emptyProgress(), 'fr.lesson.zzz')).toEqual([]);
	});

	it('tells nothing for a lesson that is not an own property name', () => {
		expect(before(emptyProgress(), 'constructor')).toEqual([]);
		expect(before(emptyProgress(), '__proto__')).toEqual([]);
	});

	it('tells nothing for a world that the story does not tell', () => {
		const partial: StoryDefinition = { ...STORY, worlds: [WORLD_ONE] };
		expect(storyBeforeLesson(partial, PROGRESSION, emptyProgress(), C)).toEqual([]);
	});
});

describe('storyAfterLesson', () => {
	it('tells the line of a lesson passed for the first time', () => {
		const next = progressAfter([A, PASSING]);
		expect(after(emptyProgress(), next, A)).toEqual([LINE_A]);
	});

	it('tells nothing for a lesson that was failed', () => {
		const next = progressAfter([A, FAILING]);
		expect(after(emptyProgress(), next, A)).toEqual([]);
	});

	it('tells the line once the failed lesson is finally passed', () => {
		const failed = progressAfter([A, FAILING]);
		expect(after(failed, play(failed, A, PASSING), A)).toEqual([LINE_A]);
	});

	it('tells nothing when a passed lesson is replayed', () => {
		const passed = progressAfter([A, PASSING]);
		expect(after(passed, play(passed, A, PASSING), A)).toEqual([]);
		expect(after(passed, play(passed, A, FAILING), A)).toEqual([]);
	});

	it('tells nothing when the progress did not change', () => {
		const passed = progressAfter([A, PASSING]);
		expect(after(passed, passed, A)).toEqual([]);
	});

	it('tells the ending after the line of the last lesson of the world', () => {
		const previous = progressAfter([A, PASSING]);
		expect(after(previous, play(previous, B, PASSING), B)).toEqual([LINE_B, ENDING_ONE]);
	});

	it('tells the ending when the last lesson passed is not the last in order', () => {
		const previous = progressAfter([B, PASSING]);
		expect(after(previous, play(previous, A, PASSING), A)).toEqual([LINE_A, ENDING_ONE]);
	});

	it('tells the line and the ending of a single-lesson world together', () => {
		const next = progressAfter([C, PASSING]);
		expect(after(emptyProgress(), next, C)).toEqual([LINE_C, ENDING_TWO]);
	});

	it('does not tell the ending while a lesson of the world is only failed', () => {
		const previous = progressAfter([A, PASSING], [B, FAILING]);
		expect(after(previous, play(previous, B, FAILING), B)).toEqual([]);
	});

	it('does not tell the ending again when the world is replayed', () => {
		const done = progressAfter([A, PASSING], [B, PASSING]);
		expect(after(done, play(done, B, PASSING), B)).toEqual([]);
	});

	it('tells nothing for an unknown lesson', () => {
		expect(after(emptyProgress(), progressAfter([A, PASSING]), 'fr.lesson.zzz')).toEqual([]);
		expect(after(emptyProgress(), progressAfter([A, PASSING]), 'constructor')).toEqual([]);
	});

	it('tells nothing for a lesson that the story does not tell', () => {
		const partial: StoryDefinition = {
			...STORY,
			worlds: [{ ...WORLD_ONE, lessons: WORLD_ONE.lessons.slice(0, 1) }]
		};
		const previous = progressAfter([A, PASSING]);
		expect(storyAfterLesson(partial, PROGRESSION, previous, play(previous, B, PASSING), B)).toEqual(
			[]
		);
	});

	it('tells nothing for a world that the story does not tell', () => {
		const partial: StoryDefinition = { ...STORY, worlds: [WORLD_ONE] };
		expect(
			storyAfterLesson(partial, PROGRESSION, emptyProgress(), progressAfter([C, PASSING]), C)
		).toEqual([]);
	});

	it('does not mutate the progress it reads', () => {
		const previous = progressAfter([A, PASSING]);
		const next = play(previous, B, PASSING);
		const snapshot = structuredClone({ previous, next });
		after(previous, next, B);
		before(previous, A);
		expect({ previous, next }).toEqual(snapshot);
	});
});

const playArbitrary = fc.record({
	lessonId: fc.constantFrom(...LESSON_IDS),
	accuracy: fc.oneof(fc.constantFrom(FAILING, PASSING), fc.integer({ min: 0, max: 100 }))
});
const sessionArbitrary = fc.array(playArbitrary, { maxLength: 40 });

interface Step {
	readonly lessonId: string;
	readonly opening: readonly StoryMoment[];
	readonly told: readonly StoryMoment[];
	readonly previous: ProgressState;
	readonly next: ProgressState;
}

function replay(session: readonly { lessonId: string; accuracy: number }[]): Step[] {
	const steps: Step[] = [];
	let progress = emptyProgress();
	for (const { lessonId, accuracy } of session) {
		const opening = before(progress, lessonId);
		const next = play(progress, lessonId, accuracy);
		steps.push({
			lessonId,
			opening,
			told: after(progress, next, lessonId),
			previous: progress,
			next
		});
		progress = next;
	}
	return steps;
}

function count(moments: readonly StoryMoment[], moment: StoryMoment): number {
	return moments.filter((m) => m.kind === moment.kind && m.text === moment.text).length;
}

describe('story moments over a whole play history', () => {
	it('tells each lesson line and each world ending at most once', () => {
		fc.assert(
			fc.property(sessionArbitrary, (session) => {
				const told = replay(session).flatMap((step) => step.told);
				for (const moment of [LINE_A, LINE_B, LINE_C, ENDING_ONE, ENDING_TWO]) {
					expect(count(told, moment)).toBeLessThanOrEqual(1);
				}
			})
		);
	});

	it('tells a line exactly when its lesson ends up passed, and an ending when its world does', () => {
		fc.assert(
			fc.property(sessionArbitrary, (session) => {
				const steps = replay(session);
				const told = steps.flatMap((step) => step.told);
				const last = steps.at(-1)?.next ?? emptyProgress();
				const passed = (id: string) => (last.lessons[id]?.bestAccuracy ?? 0) >= 80;
				expect(count(told, LINE_A)).toBe(passed(A) ? 1 : 0);
				expect(count(told, LINE_B)).toBe(passed(B) ? 1 : 0);
				expect(count(told, LINE_C)).toBe(passed(C) ? 1 : 0);
				expect(count(told, ENDING_ONE)).toBe(passed(A) && passed(B) ? 1 : 0);
				expect(count(told, ENDING_TWO)).toBe(passed(C) ? 1 : 0);
			})
		);
	});

	it('never tells an ending before every line of its world has been told', () => {
		fc.assert(
			fc.property(sessionArbitrary, (session) => {
				const told: StoryMoment[] = [];
				for (const step of replay(session)) {
					for (const moment of step.told) {
						if (moment.kind === 'ending') {
							const lines = moment.text === ENDING_ONE.text ? [LINE_A, LINE_B] : [LINE_C];
							const soFar = [...told, ...step.told.filter((m) => m.kind === 'line')];
							for (const line of lines) expect(count(soFar, line)).toBe(1);
						}
					}
					told.push(...step.told);
				}
			})
		);
	});

	it('puts the line before the ending in one call', () => {
		fc.assert(
			fc.property(sessionArbitrary, (session) => {
				for (const { told } of replay(session)) {
					const kinds = told.map((moment) => moment.kind);
					expect(kinds.filter((kind) => kind === 'line').length).toBeLessThanOrEqual(1);
					if (kinds.includes('ending')) expect(kinds).toEqual(['line', 'ending']);
				}
			})
		);
	});

	it('tells the opening of a world only before its first play, and exactly then', () => {
		fc.assert(
			fc.property(sessionArbitrary, (session) => {
				const playedWorlds = new Set<string>();
				const worldOf = (id: string) => (id === C ? 'two' : 'one');
				for (const step of replay(session)) {
					const world = worldOf(step.lessonId);
					const expected = playedWorlds.has(world)
						? []
						: [world === 'one' ? OPENING_ONE : OPENING_TWO];
					expect(step.opening).toEqual(expected);
					playedWorlds.add(world);
				}
			})
		);
	});

	it('is deterministic', () => {
		fc.assert(
			fc.property(sessionArbitrary, (session) => {
				expect(replay(session)).toEqual(replay(session));
			})
		);
	});
});
