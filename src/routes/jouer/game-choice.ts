import { gameDescription, gameTitle } from '$lib/games/labels';
import { gamesForWorld } from '$lib/games/registry';
import type { GameDefinition } from '$lib/games/types';

/** What of a world the games need to know; `gameIds` may be missing from older content. */
export interface WorldGames {
	readonly id: string;
	readonly gameIds?: readonly string[];
}

/** A game as the child sees it in the choice. */
export interface GameOption {
	readonly value: string;
	readonly title: string;
	readonly description: string;
}

/** The game last chosen in each world during this visit, by world identifier. */
export type ChosenGames = Readonly<Record<string, string>>;

export const NO_CHOSEN_GAMES: ChosenGames = {};

/** The game to play in a world: the one chosen last time in it, else the first one it offers. */
export function selectedGame(world: WorldGames, choices: ChosenGames): GameDefinition | undefined {
	const games = gamesForWorld(world);
	const remembered = Object.hasOwn(choices, world.id) ? choices[world.id] : undefined;
	return games.find((game) => game.id === remembered) ?? games[0];
}

export function rememberGame(choices: ChosenGames, worldId: string, gameId: string): ChosenGames {
	return { ...choices, [worldId]: gameId };
}

/** The games of a world, ready to be shown in the choice. */
export function gameOptions(world: WorldGames): readonly GameOption[] {
	return gamesForWorld(world).map((game) => ({
		value: game.id,
		title: gameTitle(game.id),
		description: gameDescription(game.id)
	}));
}
