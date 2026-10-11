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
