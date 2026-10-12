import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DISH_TEMPLATES, QUIPS } from './recipe/texts';
import { GREETINGS } from './rocket/texts';

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;

function numbered(prefix: string): string[] {
	return Object.keys(messages).filter((key) => new RegExp(`^${prefix}\\d+$`).test(key));
}

describe.each([
	['game_rocket_greeting_', GREETINGS.length],
	['game_recipe_quip_', QUIPS.length],
	['game_recipe_dish_', DISH_TEMPLATES.length]
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
		for (const line of [...GREETINGS, ...QUIPS]) expect(line().trim()).not.toBe('');
	});

	it('give a different line to each step', () => {
		expect(new Set(GREETINGS.map((line) => line())).size).toBe(GREETINGS.length);
		expect(new Set(QUIPS.map((line) => line())).size).toBe(QUIPS.length);
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
