/**
 * The decors of each game (ADR-057, level 2 of the animations): the place and the moment the scene
 * shows, changed from one play to the next so that a replayed game looks like a new outing. A
 * decor changes the sky, the ground and a few props, never what tells the child something. The
 * first decor of each list is the one the game always had: a child who never replays sees no change.
 */
export const GAME_DECORS = {
	hatching: ['bare', 'nest', 'beach', 'snow'],
	rocket: ['blue-night', 'rose-nebula', 'milky-way'],
	recipe: ['day', 'evening', 'winter'],
	drawing: ['desk', 'meadow', 'beach'],
	train: ['summer', 'autumn', 'winter'],
	tower: ['summer', 'sunset', 'winter'],
	dialogue: ['garden', 'evening', 'winter'],
	river: ['day', 'sunset', 'night']
} as const satisfies Record<string, readonly [string, string, string, ...string[]]>;

export type DecorGameId = keyof typeof GAME_DECORS;
export type DecorOf<Game extends DecorGameId> = (typeof GAME_DECORS)[Game][number];

/** Plays of a game already finished, as a count: anything else counts as none. */
function playsOf(playCount: number): number {
	return Number.isSafeInteger(playCount) && playCount > 0 ? playCount : 0;
}

/** Rank of the decor of a play among `count` decors: one after the other, never by chance. */
export function decorIndex(playCount: number, count: number): number {
	if (!Number.isSafeInteger(count) || count <= 0) return 0;
	return playsOf(playCount) % count;
}

/** The decor of a game for a play, from the number of plays of this game already finished. */
export function decorFor<Game extends DecorGameId>(game: Game, playCount = 0): DecorOf<Game> {
	const decors: readonly [DecorOf<Game>, ...DecorOf<Game>[]] = GAME_DECORS[game];
	return decors[decorIndex(playCount, decors.length)] ?? decors[0];
}
