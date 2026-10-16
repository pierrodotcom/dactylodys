import { describe, expect, it } from 'vitest';
import { gameDescription, gameTitle } from './labels';
import { GAMES, findGame, gamesForWorld } from './registry';

const ids = (games: readonly { id: string }[]) => games.map((game) => game.id);

describe('GAMES', () => {
	it('offers the six mini-games, the egg first', () => {
		expect(ids(GAMES)).toEqual(['hatching', 'rocket', 'recipe', 'drawing', 'train', 'tower']);
	});

	it('has unique identifiers', () => {
		expect(new Set(ids(GAMES)).size).toBe(GAMES.length);
	});

	it.each(GAMES.map((game) => game.id))('gives a title and a description to %s', (id) => {
		expect(gameTitle(id)).not.toBe(id);
		expect(gameTitle(id).trim()).not.toBe('');
		expect(gameDescription(id).trim()).not.toBe('');
	});

	it('loads every game on demand, without loading any now', () => {
		for (const game of GAMES) expect(typeof game.load).toBe('function');
	});
});

describe('findGame', () => {
	it('finds a game by its identifier', () => {
		expect(findGame('rocket')?.id).toBe('rocket');
	});

	it('finds nothing for an unknown identifier', () => {
		expect(findGame('tetris')).toBeUndefined();
	});

	it('does not mistake an object property for a game', () => {
		expect(findGame('constructor')).toBeUndefined();
	});
});

describe('gamesForWorld', () => {
	it('gives the games of the world in the order of its list', () => {
		expect(ids(gamesForWorld({ gameIds: ['recipe', 'hatching'] }))).toEqual(['recipe', 'hatching']);
		expect(ids(gamesForWorld({ gameIds: ['rocket', 'recipe', 'hatching'] }))).toEqual([
			'rocket',
			'recipe',
			'hatching'
		]);
	});

	it('ignores the identifiers it does not know', () => {
		expect(ids(gamesForWorld({ gameIds: ['tetris', 'rocket', 'pong'] }))).toEqual(['rocket']);
	});

	it('names a game once, even when the list repeats it', () => {
		expect(ids(gamesForWorld({ gameIds: ['rocket', 'rocket', 'hatching'] }))).toEqual([
			'rocket',
			'hatching'
		]);
	});

	it('falls back on the first game when the list is empty', () => {
		expect(ids(gamesForWorld({ gameIds: [] }))).toEqual(['hatching']);
	});

	it('falls back on the first game when the list is missing', () => {
		expect(ids(gamesForWorld({}))).toEqual(['hatching']);
	});

	it('falls back on the first game when none of the identifiers exists', () => {
		expect(ids(gamesForWorld({ gameIds: ['tetris'] }))).toEqual(['hatching']);
	});
});
