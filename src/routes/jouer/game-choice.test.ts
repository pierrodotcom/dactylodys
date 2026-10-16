import { describe, expect, it } from 'vitest';
import { createProfile, withLastGame } from '$lib/state/profile';
import { gameForLesson, gameOptions, selectedGame, type ChosenGames } from './game-choice';

const MANY = { id: 'w.many', gameIds: ['rocket', 'recipe', 'hatching'] };
const ONE = { id: 'w.one', gameIds: ['recipe'] };
const OLD = { id: 'w.old' };
const NO_CHOSEN_GAMES: ChosenGames = {};

/** The choices as the play route holds them: in the profile of the child. */
function chosenIn(worldId: string, gameId: string): ChosenGames {
	const profile = createProfile({ id: 'p', name: 'Mini', now: 0, platform: 'pc' });
	return withLastGame(profile, worldId, gameId).lastGameByWorld;
}

describe('selectedGame', () => {
	it('preselects the first game of the world', () => {
		expect(selectedGame(MANY, NO_CHOSEN_GAMES)?.id).toBe('rocket');
	});

	it('takes the game chosen last time in this world', () => {
		const choices = chosenIn(MANY.id, 'hatching');

		expect(selectedGame(MANY, choices)?.id).toBe('hatching');
	});

	it('keeps the choices of the worlds apart', () => {
		const choices = chosenIn(MANY.id, 'recipe');

		expect(selectedGame(ONE, choices)?.id).toBe('recipe');
		expect(selectedGame({ id: 'w.other', gameIds: ['rocket', 'hatching'] }, choices)?.id).toBe(
			'rocket'
		);
	});

	it('forgets a choice that the world no longer offers', () => {
		const choices = chosenIn(ONE.id, 'rocket');

		expect(selectedGame(ONE, choices)?.id).toBe('recipe');
	});

	it('falls back on the first game of the registry for a world that names none', () => {
		expect(selectedGame(OLD, NO_CHOSEN_GAMES)?.id).toBe('hatching');
	});

	it('starts a new profile on the first game of each world', () => {
		const profile = createProfile({ id: 'p', name: 'Mini', now: 0, platform: 'pc' });

		expect(selectedGame(MANY, profile.lastGameByWorld)?.id).toBe('rocket');
	});

	it('is not fooled by a world named like an object property', () => {
		expect(selectedGame({ id: 'constructor', gameIds: ['recipe'] }, NO_CHOSEN_GAMES)?.id).toBe(
			'recipe'
		);
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

describe('gameForLesson', () => {
	const WORLD = {
		id: 'w.rotation',
		gameIds: ['rocket', 'recipe', 'hatching'],
		lessons: [{ id: 'l.1' }, { id: 'l.2' }, { id: 'l.3' }, { id: 'l.4' }]
	};

	it('proposes the games of a world in turn, one per new lesson, without any chance', () => {
		const proposed = WORLD.lessons.map(
			(lesson) => gameForLesson(WORLD, lesson.id, NO_CHOSEN_GAMES)?.id
		);

		expect(proposed).toEqual(['rocket', 'recipe', 'hatching', 'rocket']);
	});

	it('does not look at the game last played in the world for a lesson not started yet', () => {
		expect(gameForLesson(WORLD, 'l.2', chosenIn(WORLD.id, 'hatching'))?.id).toBe('recipe');
	});

	it('proposes the game after the one a lesson was last played with, so a replay changes', () => {
		expect(gameForLesson(WORLD, 'l.2', { 'l.2': 'rocket' })?.id).toBe('recipe');
		expect(gameForLesson(WORLD, 'l.2', { 'l.2': 'recipe' })?.id).toBe('hatching');
		expect(gameForLesson(WORLD, 'l.2', { 'l.2': 'hatching' })?.id).toBe('rocket');
	});

	it('never proposes the game just played when the world has another one', () => {
		for (const lesson of WORLD.lessons) {
			for (const game of WORLD.gameIds) {
				expect(gameForLesson(WORLD, lesson.id, { [lesson.id]: game })?.id).not.toBe(game);
			}
		}
	});

	it('forgets the game of a lesson that the world no longer offers', () => {
		expect(gameForLesson(WORLD, 'l.2', { 'l.2': 'unknown' })?.id).toBe('recipe');
	});

	it('falls back on the choice of the world for a lesson it does not list', () => {
		expect(gameForLesson(WORLD, 'l.x', chosenIn(WORLD.id, 'recipe'))?.id).toBe('recipe');
		expect(gameForLesson({ id: 'w.old' }, 'l.1', NO_CHOSEN_GAMES)?.id).toBe('hatching');
	});

	it('proposes the only game of a world for every lesson', () => {
		const single = { ...ONE, lessons: [{ id: 'a' }, { id: 'b' }] };

		expect(gameForLesson(single, 'a', NO_CHOSEN_GAMES)?.id).toBe('recipe');
		expect(gameForLesson(single, 'b', { b: 'recipe' })?.id).toBe('recipe');
	});
});
