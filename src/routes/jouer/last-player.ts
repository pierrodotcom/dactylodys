export const LAST_PLAYER_KEY = 'dactylodys.last-player';

export type StorageProvider = () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const browserStorage: StorageProvider = () => localStorage;

/** Reading may be refused (private browsing, blocked site data): the play route works without it. */
export function readLastPlayerId(storage: StorageProvider = browserStorage): string | null {
	try {
		const id = storage().getItem(LAST_PLAYER_KEY);
		return id === null || id === '' ? null : id;
	} catch {
		return null;
	}
}

export function writeLastPlayerId(id: string, storage: StorageProvider = browserStorage): void {
	try {
		storage().setItem(LAST_PLAYER_KEY, id);
	} catch {
		// Nothing to do: the child will simply choose the player again next time.
	}
}

export function forgetLastPlayerId(storage: StorageProvider = browserStorage): void {
	try {
		storage().removeItem(LAST_PLAYER_KEY);
	} catch {
		// Nothing to forget if the storage cannot be reached.
	}
}

interface Identified {
	readonly id: string;
}

export interface ReturningPlayer<Player> {
	/** The player who played last on this device, when the device still has it. */
	readonly last: Player | null;
	/**
	 * `true`: the last player goes straight back to the game. Only when the device has no other
	 * player: with several, the game asks who plays, or one child would play as another (ADR-075).
	 */
	readonly resume: boolean;
	/** `true`: the remembered player is not on this device any more. */
	readonly gone: boolean;
}

/** Who comes back when the game opens, from the players of the device and the remembered one. */
export function returningPlayer<Player extends Identified>(
	players: readonly Player[],
	lastId: string | null
): ReturningPlayer<Player> {
	const last = lastId === null ? null : (players.find((player) => player.id === lastId) ?? null);
	return {
		last,
		resume: last !== null && players.length === 1,
		gone: lastId !== null && last === null
	};
}

/** The players in the order they are offered: the one who played last first, the others as they were. */
export function lastPlayerFirst<Player extends Identified>(
	players: readonly Player[],
	lastId: string | null
): readonly Player[] {
	const last = players.find((player) => player.id === lastId);
	if (!last) return players;
	return [last, ...players.filter((player) => player !== last)];
}
