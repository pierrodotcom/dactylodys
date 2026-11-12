import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GAMES } from '../registry';
import { GAME_DECORS, decorFor, decorIndex, type DecorGameId } from './decor';

const DECOR_GAMES = Object.keys(GAME_DECORS) as DecorGameId[];

describe('decorIndex', () => {
	it('gives the first decor to the first play', () => {
		expect(decorIndex(0, 3)).toBe(0);
	});

	it('takes the next decor at each play, and starts over once all have been shown', () => {
		expect([0, 1, 2, 3, 4, 5, 6].map((plays) => decorIndex(plays, 3))).toEqual([
			0, 1, 2, 0, 1, 2, 0
		]);
	});

	it('counts a play count that is not a whole number of plays as no play at all', () => {
		for (const plays of [-1, -7, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 60]) {
			expect(decorIndex(plays, 3)).toBe(0);
		}
	});

	it('gives the first decor when there is no list to choose from', () => {
		expect(decorIndex(5, 0)).toBe(0);
		expect(decorIndex(5, Number.NaN)).toBe(0);
	});

	it('always gives a rank of the list, the same for the same play', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -1000, max: 100_000 }),
				fc.integer({ min: 1, max: 9 }),
				(p, n) => {
					const rank = decorIndex(p, n);
					expect(rank).toBeGreaterThanOrEqual(0);
					expect(rank).toBeLessThan(n);
					expect(decorIndex(p, n)).toBe(rank);
				}
			)
		);
	});
});

describe('decorFor', () => {
	it('keeps the decor of today for a child who never finished the game', () => {
		for (const game of DECOR_GAMES) {
			expect(decorFor(game, 0)).toBe(GAME_DECORS[game][0]);
			expect(decorFor(game)).toBe(GAME_DECORS[game][0]);
		}
	});

	it('shows every decor of a game before one comes back', () => {
		for (const game of DECOR_GAMES) {
			const decors = GAME_DECORS[game];
			const shown = decors.map((_, plays) => decorFor(game, plays));
			expect(shown).toEqual([...decors]);
			expect(decorFor(game, decors.length)).toBe(decors[0]);
		}
	});

	it('goes back to the decor of today for an invalid play count', () => {
		expect(decorFor('train', -3)).toBe('summer');
		expect(decorFor('train', Number.NaN)).toBe('summer');
	});
});

describe('GAME_DECORS', () => {
	it('gives every game of the registry at least three distinct decors', () => {
		for (const game of GAMES) {
			const decors: readonly string[] = GAME_DECORS[game.id as DecorGameId] ?? [];
			expect(decors.length, game.id).toBeGreaterThanOrEqual(3);
			expect(new Set(decors).size, game.id).toBe(decors.length);
		}
	});

	it('only lists games of the registry', () => {
		const ids = new Set(GAMES.map((game) => game.id));
		for (const game of DECOR_GAMES) expect(ids.has(game), game).toBe(true);
	});

	it('names each decor with a lower-case identifier that a style sheet can select', () => {
		for (const decors of Object.values(GAME_DECORS)) {
			for (const decor of decors) expect(decor).toMatch(/^[a-z]+(-[a-z]+)*$/);
		}
	});
});
