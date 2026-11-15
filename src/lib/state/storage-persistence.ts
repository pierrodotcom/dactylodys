/*
 * Technical key of the local storage of the device: it never changes with the name of the app
 * (ADR-055).
 */
export const STORAGE_ASKED_KEY = 'dactylodys.storage-asked';

const ASKED = '1';

/**
 * `protected`: the browser promised to keep the data of the site, it will not clear them on its
 * own. `unprotected`: it may (disk full, weeks without a visit). `unknown`: it does not say.
 */
export type StorageProtection = 'protected' | 'unprotected' | 'unknown';

/** What is used of `navigator.storage`; `undefined` where the browser has none. */
export type PersistenceProvider = () =>
	Partial<Pick<StorageManager, 'persist' | 'persisted'>> | undefined;

export type FlagStorageProvider = () => Pick<Storage, 'getItem' | 'setItem'>;

const browserPersistence: PersistenceProvider = () => navigator.storage;
const browserFlags: FlagStorageProvider = () => localStorage;

/** Whether the browser promised to keep the data. Asks nothing of anyone, never fails. */
export async function readStorageProtection(
	provider: PersistenceProvider = browserPersistence
): Promise<StorageProtection> {
	try {
		const manager = provider();
		if (typeof manager?.persisted !== 'function') return 'unknown';
		return (await manager.persisted()) ? 'protected' : 'unprotected';
	} catch {
		return 'unknown';
	}
}

/**
 * Asks the browser to keep the data of the site, unless it already does. Some browsers decide on
 * their own, others ask the person: the answer may take as long as the person does, so nothing
 * of the app waits for it. Never fails.
 */
export async function requestStorageProtection(
	provider: PersistenceProvider = browserPersistence
): Promise<StorageProtection> {
	try {
		const manager = provider();
		if (typeof manager?.persist !== 'function') return 'unknown';
		if (typeof manager.persisted === 'function' && (await manager.persisted())) return 'protected';
		return (await manager.persist()) ? 'protected' : 'unprotected';
	} catch {
		return 'unknown';
	}
}

/**
 * The same request, made once for good on this device: a child is never asked twice. `null` when
 * it was already made, or when the device cannot remember that it was. Never fails.
 */
export async function requestStorageProtectionOnce(
	provider: PersistenceProvider = browserPersistence,
	flags: FlagStorageProvider = browserFlags
): Promise<StorageProtection | null> {
	try {
		const storage = flags();
		if (storage.getItem(STORAGE_ASKED_KEY) !== null) return null;
		storage.setItem(STORAGE_ASKED_KEY, ASKED);
	} catch {
		return null;
	}
	return requestStorageProtection(provider);
}
