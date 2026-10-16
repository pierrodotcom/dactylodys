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
 * The game proposed for a lesson, never the same one twice in a row: a lesson not started yet
 * gets the game of its place in the world (the games in turn along the lessons), a lesson played
 * before gets the game that follows the one it was last played with. The child can always take
 * another picture. Nothing is drawn at random.
 */
export function gameForLesson(
	world: WorldLessons,
	lessonId: string,
	choices: ChosenGames
): GameDefinition | undefined {
	const games = gamesForWorld(world);
	if (games.length === 0) return undefined;
	const kept = Object.hasOwn(choices, lessonId) ? choices[lessonId] : undefined;
	const keptIndex = games.findIndex((game) => game.id === kept);
	if (keptIndex >= 0) return games[(keptIndex + 1) % games.length];
	const place = world.lessons?.findIndex((lesson) => lesson.id === lessonId) ?? -1;
	return place < 0 ? selectedGame(world, choices) : games[place % games.length];
}
