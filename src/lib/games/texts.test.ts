import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONS, REACTIONS } from './dialogue/texts';
import { DISH_TEMPLATES, QUIPS } from './recipe/texts';
import { OBJECT_ARTS } from './river/shapes';
import { OBJECT_NAMES, QUIPS as RIVER_QUIPS } from './river/texts';
import { GREETINGS } from './rocket/texts';

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
	['game_river_object_', OBJECT_NAMES.length]
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
