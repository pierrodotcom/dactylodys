import { gameDescription, gameTitle } from '$lib/games/labels';
import { gamesForWorld } from '$lib/games/registry';
import type { GameDefinition } from '$lib/games/types';

/** What of a world the games need to know; `gameIds` may be missing from older content. */
export interface WorldGames {
	readonly id: string;
	readonly gameIds?: readonly string[];
}

/** A world with its lessons in order: what the rotation of the games needs. */
export interface WorldLessons extends WorldGames {
	readonly lessons?: readonly { readonly id: string }[];
}

/** A game as the child sees it in the choice. */
export interface GameOption {
	readonly value: string;
	readonly title: string;
	readonly description: string;
}

/** The game last chosen in each world, by world identifier: `Profile.lastGameByWorld`. */
export type ChosenGames = Readonly<Record<string, string>>;

/** The game to play in a world: the one chosen last time in it, else the first one it offers. */
export function selectedGame(world: WorldGames, choices: ChosenGames): GameDefinition | undefined {
	const games = gamesForWorld(world);
	const remembered = Object.hasOwn(choices, world.id) ? choices[world.id] : undefined;
	return games.find((game) => game.id === remembered) ?? games[0];
}

/** The games of a world, ready to be shown in the choice. */
export function gameOptions(world: WorldGames): readonly GameOption[] {
	return gamesForWorld(world).map((game) => ({
		value: game.id,
		title: gameTitle(game.id),
		description: gameDescription(game.id)
	}));
}

/**
 * The game proposed for a lesson. A lesson the child already started keeps its game, so that a
 * replay or a return finds what the child had. A new lesson gets the next game of the world, in
 * the order of its `gameIds` and the place of the lesson in the world: two lessons in a row never
 * look the same, and nothing is drawn at random. `played` is for profiles saved before a game was
 * kept per lesson: they fall back on the game last played in the world.
 */
export function gameForLesson(
	world: WorldLessons,
	lessonId: string,
	choices: ChosenGames,
	played: boolean
): GameDefinition | undefined {
	const games = gamesForWorld(world);
	const kept = Object.hasOwn(choices, lessonId) ? choices[lessonId] : undefined;
	const keptGame = games.find((game) => game.id === kept);
	if (keptGame !== undefined) return keptGame;
	const index = world.lessons?.findIndex((lesson) => lesson.id === lessonId) ?? -1;
	if (played || index < 0 || games.length === 0) return selectedGame(world, choices);
	return games[index % games.length];
}
