import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONS, REACTIONS } from './dialogue/texts';
import { DISH_TEMPLATES, QUIPS } from './recipe/texts';
import { OBJECT_ARTS } from './river/shapes';
import { OBJECT_NAMES, QUIPS as RIVER_QUIPS } from './river/texts';
import { GREETINGS } from './rocket/texts';
import { QUIPS as TRAIN_QUIPS } from './train/texts';

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;

function numbered(prefix: string): string[] {
	return Object.keys(messages).filter((key) => new RegExp(`^${prefix}\\d+$`).test(key));
}

describe.each([
	['game_rocket_greeting_', GREETINGS.length],
	['game_recipe_quip_', QUIPS.length],
	['game_recipe_dish_', DISH_TEMPLATES.length],
	['game_dialogue_question_', QUESTIONS.length],
	['game_dialogue_quip_', REACTIONS.length],
	['game_river_quip_', RIVER_QUIPS.length],
	['game_river_object_', OBJECT_NAMES.length],
	['game_train_quip_', TRAIN_QUIPS.length]
])('the messages %s…', (prefix, listed) => {
	it('are all in the list the game goes through, in order', () => {
		const keys = numbered(prefix);

		expect(keys).toEqual(
			Array.from({ length: keys.length }, (_, index) => `${prefix}${index + 1}`)
		);
		expect(listed).toBe(keys.length);
	});
});

describe('the lists of lines', () => {
	it('say something each', () => {
		const dialogue = [...QUESTIONS, ...REACTIONS.map((reaction) => reaction.line)];
		for (const line of [...GREETINGS, ...QUIPS, ...dialogue]) expect(line().trim()).not.toBe('');
	});

	it('give a different line to each step', () => {
		expect(new Set(GREETINGS.map((line) => line())).size).toBe(GREETINGS.length);
		expect(new Set(QUIPS.map((line) => line())).size).toBe(QUIPS.length);
		expect(new Set(QUESTIONS.map((line) => line())).size).toBe(QUESTIONS.length);
		expect(new Set(REACTIONS.map((reaction) => reaction.line())).size).toBe(REACTIONS.length);
	});

	it('gives Floup about thirty questions and fifteen reactions, each face in turn', () => {
		expect(QUESTIONS.length).toBeGreaterThanOrEqual(30);
		expect(REACTIONS.length).toBeGreaterThanOrEqual(15);
		expect(new Set(REACTIONS.map((reaction) => reaction.face))).toEqual(
			new Set(['delighted', 'puzzled', 'laughing'])
		);
	});

	it('asks questions, and keeps a question mark on the line of the question', () => {
		for (const question of QUESTIONS) expect(question()).toMatch(/\u00a0\?$/u);
	});

	it('names every object of the river, one name for each drawing, all different', () => {
		expect(OBJECT_ARTS.length).toBeGreaterThanOrEqual(12);
		expect(OBJECT_NAMES).toHaveLength(OBJECT_ARTS.length);
		expect(new Set(OBJECT_NAMES.map((name) => name())).size).toBe(OBJECT_NAMES.length);
		expect(new Set(RIVER_QUIPS.map((line) => line())).size).toBe(RIVER_QUIPS.length);
		for (const line of [...OBJECT_NAMES, ...RIVER_QUIPS]) expect(line().trim()).not.toBe('');
	});

	it('name a dish from the first and the last group in every template', () => {
		for (const template of DISH_TEMPLATES) {
			const name = template({ first: 'AAA', last: 'ZZZ' });

			expect(name).toContain('AAA');
			expect(name).toContain('ZZZ');
		}
		for (const key of numbered('game_recipe_dish_')) {
			expect(messages[key]).toContain('{first}');
			expect(messages[key]).toContain('{last}');
		}
	});
});

describe('the variants for the older children', () => {
	const OLDER = '_older';
	const variants = Object.keys(messages).filter((key) => key.endsWith(OLDER));
	const lists: readonly (readonly [string, readonly ((band?: '8-9' | '10-12') => string)[]])[] = [
		['game_rocket_greeting_', GREETINGS],
		['game_train_quip_', TRAIN_QUIPS],
		['game_river_quip_', RIVER_QUIPS]
	];

	it('are few, each the variant of a sentence that exists, and say something else', () => {
		expect(variants.length).toBeGreaterThan(0);
		expect(variants.length).toBeLessThanOrEqual(10);
		for (const key of variants) {
			const base = key.slice(0, -OLDER.length);
			expect(messages[base]).toBeDefined();
			expect(messages[key]?.trim()).not.toBe('');
			expect(messages[key]).not.toBe(messages[base]);
		}
	});

	it.each(lists)(
		'are said to the 10-12 year olds in %s…, the usual line to the others',
		(prefix, list) => {
			list.forEach((line, index) => {
				const base = messages[`${prefix}${index + 1}`];
				const older = messages[`${prefix}${index + 1}${OLDER}`] ?? base;
				expect(line()).toBe(base);
				expect(line('8-9')).toBe(base);
				expect(line('10-12')).toBe(older);
			});
		}
	);

	it('are all reached by a list of a game', () => {
		const reached = lists.flatMap(([prefix, list]) =>
			list.map((_, index) => `${prefix}${index + 1}${OLDER}`)
		);
		for (const key of variants) expect(reached).toContain(key);
	});
});
