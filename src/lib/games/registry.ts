import type { GameDefinition } from './types';

/** Every mini-game, in the order they are offered by default. Each one is loaded when it is played. */
export const GAMES: readonly GameDefinition[] = [
	{ id: 'hatching', load: () => import('./hatching/Hatching.svelte') },
	{ id: 'rocket', load: () => import('./rocket/Rocket.svelte') },
	{ id: 'recipe', load: () => import('./recipe/Recipe.svelte') },
	{ id: 'drawing', load: () => import('./drawing/Drawing.svelte') },
	{ id: 'train', load: () => import('./train/Train.svelte') },
	{ id: 'tower', load: () => import('./tower/Tower.svelte') }
];

export function findGame(id: string): GameDefinition | undefined {
	return GAMES.find((game) => game.id === id);
}

/**
 * The games a world offers, in the order of its `gameIds`. Unknown and repeated identifiers are
 * skipped. A world that names no game (or none that exists) offers the first game of the registry.
 */
export function gamesForWorld(world: {
	readonly gameIds?: readonly string[];
}): readonly GameDefinition[] {
	const offered: GameDefinition[] = [];
	for (const id of world.gameIds ?? []) {
		const game = findGame(id);
		if (game && !offered.includes(game)) offered.push(game);
	}
	if (offered.length > 0) return offered;
	const [first] = GAMES;
	return first ? [first] : [];
}
