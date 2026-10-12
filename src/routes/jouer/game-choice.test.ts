import { describe, expect, it } from 'vitest';
import { NO_CHOSEN_GAMES, gameOptions, rememberGame, selectedGame } from './game-choice';

const MANY = { id: 'w.many', gameIds: ['rocket', 'recipe', 'hatching'] };
const ONE = { id: 'w.one', gameIds: ['recipe'] };
const OLD = { id: 'w.old' };

describe('selectedGame', () => {
	it('preselects the first game of the world', () => {
		expect(selectedGame(MANY, NO_CHOSEN_GAMES)?.id).toBe('rocket');
	});

	it('takes the game chosen last time in this world', () => {
		const choices = rememberGame(NO_CHOSEN_GAMES, MANY.id, 'hatching');

		expect(selectedGame(MANY, choices)?.id).toBe('hatching');
	});

	it('keeps the choices of the worlds apart', () => {
		const choices = rememberGame(NO_CHOSEN_GAMES, MANY.id, 'recipe');

		expect(selectedGame(ONE, choices)?.id).toBe('recipe');
		expect(selectedGame({ id: 'w.other', gameIds: ['rocket', 'hatching'] }, choices)?.id).toBe(
			'rocket'
		);
	});

	it('forgets a choice that the world no longer offers', () => {
		const choices = rememberGame(NO_CHOSEN_GAMES, ONE.id, 'rocket');

		expect(selectedGame(ONE, choices)?.id).toBe('recipe');
	});

	it('falls back on the first game of the registry for a world that names none', () => {
		expect(selectedGame(OLD, NO_CHOSEN_GAMES)?.id).toBe('hatching');
	});

	it('is not fooled by a world named like an object property', () => {
		expect(selectedGame({ id: 'constructor', gameIds: ['recipe'] }, NO_CHOSEN_GAMES)?.id).toBe(
			'recipe'
		);
	});
});

describe('rememberGame', () => {
	it('returns a new record and leaves the old one alone', () => {
		const next = rememberGame(NO_CHOSEN_GAMES, MANY.id, 'recipe');

		expect(next).toEqual({ [MANY.id]: 'recipe' });
		expect(NO_CHOSEN_GAMES).toEqual({});
	});
});

describe('gameOptions', () => {
	it('describes each game of the world, in the order of the world', () => {
		const options = gameOptions(MANY);

		expect(options.map((option) => option.value)).toEqual(['rocket', 'recipe', 'hatching']);
		for (const option of options) {
			expect(option.title.trim()).not.toBe('');
			expect(option.description.trim()).not.toBe('');
		}
	});
});
