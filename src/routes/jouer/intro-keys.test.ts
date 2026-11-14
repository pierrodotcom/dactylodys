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
import { introKeys } from './intro-keys';

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
