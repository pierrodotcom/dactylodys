import { describe, expect, it } from 'vitest';
import type { NormalizedKeystroke } from '../../keyboard/types';
import { computeMetrics } from '../metrics';
import { applyKeystroke, createSession } from '../session';
import { lessonIds } from './definition';
import { errorPolicyFor, isErasingNew } from './error-policy';
import { loadShippedProgressions } from './test-support';
import type { ErrorPolicyPreference, ProgressState } from './types';

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

describe('the measures, whatever the world decides (ADR-077)', () => {
	const WORD = 'chat';
	const key = (value: string, timestamp: number): NormalizedKeystroke => ({
		kind: 'char',
		char: value,
		code: null,
		timestamp,
		composed: false
	});
	const erase = (timestamp: number): NormalizedKeystroke => ({
		kind: 'backspace',
		char: null,
		code: null,
		timestamp,
		composed: false
	});

	/**
	 * The word typed with one slip in a play of this lesson: where a mistake is erased, a wrong key,
	 * two keys typed over it, three Backspaces, then the word; where the game waits, two wrong keys,
	 * then the word.
	 */
	function typedWithASlip(preference: ErrorPolicyPreference, lessonId: string) {
		const errorPolicy = errorPolicyFor(preference, progression, lessonId);
		const right = [...WORD].map((value, index) => key(value, 1000 + index * 100));
		const slip =
			errorPolicy === 'backspace'
				? [key('x', 100), key('c', 200), key('h', 300), erase(400), erase(500), erase(600)]
				: [key('x', 100), key('y', 200)];
		let state = createSession(WORD, { errorPolicy });
		for (const keystroke of [...slip, ...right]) state = applyKeystroke(state, keystroke).state;
		return computeMetrics(state);
	}

	it('counts one error for one mistake in a world that erases, whatever is typed over it', () => {
		for (const id of erasingLessons) {
			expect(typedWithASlip('world', id)).toMatchObject({
				totalKeystrokes: 5,
				correctKeystrokes: 4,
				errorCount: 1
			});
		}
		expect(typedWithASlip('backspace', waitingLessons[0] as string).errorCount).toBe(1);
	});

	it('counts every wrong key where the game waits for the right one', () => {
		for (const id of waitingLessons) {
			expect(typedWithASlip('world', id)).toMatchObject({
				totalKeystrokes: 6,
				correctKeystrokes: 4,
				errorCount: 2
			});
		}
		expect(typedWithASlip('retry', erasingLessons[0] as string).errorCount).toBe(2);
	});
});
