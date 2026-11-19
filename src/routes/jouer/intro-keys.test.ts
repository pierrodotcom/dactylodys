import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	findLesson,
	freshChars,
	lessonIds,
	parseProgression
} from '$lib/engine/progression/definition';
import type { LessonDefinition } from '$lib/engine/progression/types';
import { parseFingeringProfile } from '$lib/keyboard/fingering';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import azertyMac from '../../../layouts/fr-fr-azerty-mac.json';
import azertyPc from '../../../layouts/fr-fr-azerty-pc.json';
import tenFingers from '../../../layouts/fingering/ten-fingers-iso.json';
import { headingCount, introKeys, introLines, introShown, introSteps } from './intro-keys';

const progression = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);
const fingering = parseFingeringProfile(tenFingers);
const layouts = [
	['PC', buildCharIndex(parseLayout(azertyPc))],
	['Mac', buildCharIndex(parseLayout(azertyMac))]
] as const;

function lessonOf(id: string): LessonDefinition {
	return findLesson(progression, id) as LessonDefinition;
}

describe('introKeys', () => {
	it.each(layouts)('shows one key for each new character of a lesson (%s)', (_name, charIndex) => {
		const lesson = lessonOf('fr.lesson.oeufs-f-j');
		const keys = introKeys(lesson, freshChars(progression, lesson.id), charIndex, fingering);
		expect(keys.map((key) => key.char)).toEqual(['f', 'j']);
		expect(keys.map((key) => key.press)).toEqual([
			{ code: 'KeyF', level: 'base' },
			{ code: 'KeyJ', level: 'base' }
		]);
		expect(keys.map((key) => key.codes)).toEqual([['KeyF'], ['KeyJ']]);
	});

	it.each(layouts)(
		'shows the capital gesture once for each hand in the lesson of capitals (%s)',
		(_name, charIndex) => {
			const lesson = lessonOf('fr.lesson.grandes-majuscules');
			expect(lesson.newChars).toEqual([]);
			const keys = introKeys(lesson, freshChars(progression, lesson.id), charIndex, fingering);
			// The first letters learned: F under the left hand, J under the right one.
			expect(keys.map((key) => key.char)).toEqual(['F', 'J']);
			expect(keys.map((key) => key.press)).toEqual([
				{ code: 'KeyF', level: 'shift' },
				{ code: 'KeyJ', level: 'shift' }
			]);
			// Shift is held by the other hand, and lit with the letter.
			expect(keys.map((key) => key.codes)).toEqual([
				['KeyF', 'ShiftRight'],
				['KeyJ', 'ShiftLeft']
			]);
		}
	);

	it('shows a key in every lesson that brings one, and the gesture only where capitals come', () => {
		const [, charIndex] = layouts[0];
		for (const id of lessonIds(progression)) {
			const lesson = lessonOf(id);
			const keys = introKeys(lesson, freshChars(progression, id), charIndex, fingering);
			const capitals = lesson.unlocks.includes('uppercase') ? 2 : 0;
			expect(keys, id).toHaveLength(lesson.newChars.length + capitals);
		}
	});

	it('shows nothing for a character the layout cannot produce', () => {
		const lesson = { ...lessonOf('fr.lesson.oeufs-f-j'), newChars: ['f', '€€'] };
		const [, charIndex] = layouts[0];
		expect(introKeys(lesson, ['f'], charIndex, fingering).map((key) => key.char)).toEqual(['f']);
	});
});

describe('introShown', () => {
	const [, charIndex] = layouts[0];

	function shownFor(id: string) {
		return introShown(lessonOf(id), freshChars(progression, id), charIndex, fingering);
	}

	it('shows the keys a lesson brings as new, and counts them for the heading', () => {
		const first = shownFor('fr.lesson.oeufs-f-j');
		expect(first?.kind).toBe('new');
		expect(first && headingCount(lessonOf('fr.lesson.oeufs-f-j'), first)).toBe(2);
		const enter = shownFor('fr.lesson.liste-pique-nique');
		expect(enter?.kind).toBe('new');
		expect(enter?.keys.map((key) => key.press.code)).toEqual(['Enter']);
		expect(enter && headingCount(lessonOf('fr.lesson.liste-pique-nique'), enter)).toBe(1);
	});

	it('shows what the data says a lesson without a new key works: the capitals, Backspace', () => {
		const capitals = shownFor('fr.lesson.grandes-majuscules');
		expect(capitals?.kind).toBe('practice');
		expect(capitals?.keys.map((key) => key.char)).toEqual(['F', 'J']);
		const repairs = shownFor('fr.lesson.reparer-message');
		expect(repairs?.kind).toBe('practice');
		expect(repairs?.keys.map((key) => key.press)).toEqual([{ code: 'Backspace', level: 'base' }]);
		expect(repairs && headingCount(lessonOf('fr.lesson.reparer-message'), repairs)).toBe(1);
	});

	it('leaves the keyboard out of a lesson whose data names no key', () => {
		for (const id of lessonIds(progression)) {
			const lesson = lessonOf(id);
			const named =
				lesson.newChars.length > 0 ||
				lesson.unlocks.includes('uppercase') ||
				lesson.repair !== undefined;
			expect(shownFor(id) === null, id).toBe(!named);
		}
	});

	it('never calls new a key that a lesson does not bring', () => {
		for (const id of lessonIds(progression)) {
			const shown = shownFor(id);
			if (shown?.kind === 'new') expect(lessonOf(id).newChars.length, id).toBeGreaterThan(0);
		}
	});
});

describe('introSteps', () => {
	it('gives each short sentence the key the hand shows, in the order they are said', () => {
		const [, charIndex] = layouts[0];
		const lesson: LessonDefinition = {
			...lessonOf('fr.lesson.oeufs-f-j'),
			steps: [
				{ char: 'j', text: 'J, à droite.' },
				{ char: 'f', text: 'F, à gauche.' }
			]
		};
		const shown = introShown(lesson, freshChars(progression, lesson.id), charIndex, fingering);
		expect(introSteps(lesson, shown?.keys ?? [])).toEqual([
			{ char: 'j', text: 'J, à droite.', press: { code: 'KeyJ', level: 'base' } },
			{ char: 'f', text: 'F, à gauche.', press: { code: 'KeyF', level: 'base' } }
		]);
	});

	it('says a sentence whose key is not shown with the hand at rest', () => {
		const lesson: LessonDefinition = {
			...lessonOf('fr.lesson.oeufs-f-j'),
			steps: [{ char: 'f', text: 'F, à gauche.' }]
		};
		expect(introSteps(lesson, [])).toEqual([{ char: 'f', text: 'F, à gauche.', press: null }]);
		expect(introSteps(lessonOf('fr.lesson.message-t-rex'), [])).toEqual([]);
	});

	it.each(layouts)(
		'finds the key of every short sentence of the shipped lessons among those shown (%s)',
		(_name, charIndex) => {
			const stepped = lessonIds(progression)
				.map(lessonOf)
				.filter((lesson) => (lesson.steps?.length ?? 0) > 0);
			expect(stepped.length).toBeGreaterThan(0);
			for (const lesson of stepped) {
				const shown = introShown(lesson, freshChars(progression, lesson.id), charIndex, fingering);
				for (const step of introSteps(lesson, shown?.keys ?? [])) {
					expect(step.press, `${lesson.id}: ${step.text}`).not.toBeNull();
				}
			}
		}
	);
});

describe('introLines', () => {
	const [, charIndex] = layouts[0];

	function linesFor(id: string) {
		const keys = introKeys(lessonOf(id), freshChars(progression, id), charIndex, fingering);
		return introLines(keys, fingering);
	}

	it('says the digits of one hand on one line, Shift held', () => {
		expect(linesFor('fr.lesson.score-du-match')).toEqual([
			{ kind: 'hand', hand: 'left', level: 'shift', chars: ['1', '2', '3', '4', '5'] }
		]);
		expect(linesFor('fr.lesson.train-huit-heures')).toEqual([
			{ kind: 'hand', hand: 'right', level: 'shift', chars: ['6', '7', '8', '9', '0'] }
		]);
	});

	it('keeps one line for each key and its finger otherwise', () => {
		expect(linesFor('fr.lesson.oeufs-f-j').map((line) => line.kind)).toEqual(['key', 'key']);
		// Comma, period and semicolon: three keys of the right hand, not all with Shift.
		expect(linesFor('fr.lesson.virgule-point').map((line) => line.kind)).toEqual([
			'key',
			'key',
			'key'
		]);
	});
});
