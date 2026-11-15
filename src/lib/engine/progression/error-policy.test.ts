import { describe, expect, it } from 'vitest';
import { lessonIds } from './definition';
import { errorPolicyFor, isErasingNew } from './error-policy';
import { loadShippedProgressions } from './test-support';
import type { ProgressState } from './types';

const [shipped] = loadShippedProgressions();
if (!shipped) throw new Error('no shipped progression');
const { progression } = shipped;
const worlds = progression.worlds;
const erasingWorlds = worlds.filter((world) => world.errorPolicy === 'backspace');
const erasingLessons = erasingWorlds.flatMap((world) => world.lessons.map((lesson) => lesson.id));
const waitingLessons = lessonIds(progression).filter((id) => !erasingLessons.includes(id));

function played(...ids: string[]): ProgressState {
	const lessons = Object.fromEntries(
		ids.map((id) => [id, { bestAccuracy: 60, stars: 0 as const, attempts: 1, lastPlayedAt: 0 }])
	);
	return { lessons, chars: {} };
}

describe('errorPolicyFor', () => {
	it('lets the last world alone ask for Backspace in the shipped progression', () => {
		expect(erasingWorlds.map((world) => world.id)).toEqual([worlds.at(-1)?.id]);
	});

	it('follows the world of the lesson when the adult lets the world decide', () => {
		for (const id of erasingLessons)
			expect(errorPolicyFor('world', progression, id)).toBe('backspace');
		for (const id of waitingLessons) expect(errorPolicyFor('world', progression, id)).toBe('retry');
	});

	it('follows the adult in every world when the adult chose', () => {
		for (const id of lessonIds(progression)) {
			expect(errorPolicyFor('backspace', progression, id)).toBe('backspace');
			expect(errorPolicyFor('retry', progression, id)).toBe('retry');
		}
	});

	it('waits for the right key outside the lessons unless the adult chose Backspace', () => {
		expect(errorPolicyFor('world', progression)).toBe('retry');
		expect(errorPolicyFor('world', progression, 'fr.lesson.unknown')).toBe('retry');
		expect(errorPolicyFor('backspace', progression)).toBe('backspace');
		expect(errorPolicyFor('retry', progression)).toBe('retry');
	});
});

describe('isErasingNew', () => {
	const first = erasingLessons[0] as string;
	const second = erasingLessons[1] as string;
	const before = waitingLessons.at(-1) as string;

	it('says so before the first play finished in a world that erases', () => {
		expect(isErasingNew('world', progression, played(), first)).toBe(true);
		expect(isErasingNew('world', progression, played(before), second)).toBe(true);
	});

	it('says nothing once a play was finished in that world, passed or not', () => {
		expect(isErasingNew('world', progression, played(first), first)).toBe(false);
		expect(isErasingNew('world', progression, played(first), second)).toBe(false);
	});

	it('says nothing in a world that waits for the right key', () => {
		expect(isErasingNew('world', progression, played(), before)).toBe(false);
	});

	it('says nothing when the adult chose for every world', () => {
		expect(isErasingNew('backspace', progression, played(), first)).toBe(false);
		expect(isErasingNew('retry', progression, played(), first)).toBe(false);
	});
});
