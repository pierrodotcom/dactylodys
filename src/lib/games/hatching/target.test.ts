import { describe, expect, it } from 'vitest';
import { buildCharIndex, parseLayout } from '../../keyboard/layout';
import azertyPc from '../../../../layouts/fr-fr-azerty-pc.json';
import { targetKeyPress } from './target';

const charIndex = buildCharIndex(parseLayout(azertyPc));

describe('targetKeyPress', () => {
	it('gives the key and the level of a lowercase letter', () => {
		expect(targetKeyPress(charIndex, 'f')).toEqual({ code: 'KeyF', level: 'base' });
		expect(targetKeyPress(charIndex, 'a')).toEqual({ code: 'KeyQ', level: 'base' });
	});

	it('gives the Space key for a space', () => {
		expect(targetKeyPress(charIndex, ' ')).toEqual({ code: 'Space', level: 'base' });
	});

	it('gives the Shift level of a capital letter', () => {
		expect(targetKeyPress(charIndex, 'A')).toEqual({ code: 'KeyQ', level: 'shift' });
	});

	it('gives the dead key to press first for a composed character', () => {
		const press = targetKeyPress(charIndex, 'ê');

		expect(press).not.toBeNull();
		expect(press?.code).not.toBe('KeyE');
	});

	it('gives nothing for a character the layout cannot produce, or when there is no character', () => {
		expect(targetKeyPress(charIndex, '🦕')).toBeNull();
		expect(targetKeyPress(charIndex, undefined)).toBeNull();
	});

	it('uses the first way to type the character when there are several', () => {
		const index = new Map([
			[
				'x',
				[[{ code: 'KeyA', level: 'base' as const }], [{ code: 'KeyB', level: 'base' as const }]]
			]
		]);

		expect(targetKeyPress(index, 'x')).toEqual({ code: 'KeyA', level: 'base' });
	});
});
