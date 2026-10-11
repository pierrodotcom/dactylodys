import { parseProfile } from './profile';
import type { Profile, ProfileStore } from './types';

const DEFAULT_DATABASE_NAME = 'dactylodys';
const DATABASE_VERSION = 1;
const PROFILES_STORE = 'profiles';

export interface IndexedDbProfileStoreOptions {
	readonly databaseName?: string;
}

export interface IndexedDbProfileStore extends ProfileStore {
	/** Releases the connection; the next call reopens it. */
	close(): void;
}

function tryParse(data: unknown): Profile | null {
	try {
		return parseProfile(data);
	} catch {
		return null;
	}
}

function compareProfiles(a: Profile, b: Profile): number {
	if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function readAll(records: readonly unknown[]): readonly Profile[] {
	return records
		.map(tryParse)
		.filter((profile): profile is Profile => profile !== null)
		.sort(compareProfiles);
}

export function createMemoryProfileStore(): ProfileStore {
	const records = new Map<string, Profile>();
	return {
		list: () => Promise.resolve(readAll([...records.values()])),
		get: (id) => Promise.resolve(tryParse(records.get(id))),
		save: (profile) => {
			try {
				records.set(profile.id, parseProfile(profile));
				return Promise.resolve();
			} catch (error) {
				return Promise.reject(error);
			}
		},
		remove: (id) => {
			records.delete(id);
			return Promise.resolve();
		}
	};
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

function openDatabase(name: string): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(PROFILES_STORE)) {
				database.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error('IndexedDB open request is blocked'));
	});
}

export function createIndexedDbProfileStore(
	options: IndexedDbProfileStoreOptions = {}
): IndexedDbProfileStore {
	const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
	let connection: Promise<IDBDatabase> | undefined;

	function release() {
		const current = connection;
		connection = undefined;
		current?.then((database) => database.close()).catch(() => undefined);
	}

	function connect(): Promise<IDBDatabase> {
		if (connection === undefined) {
			const opening = openDatabase(databaseName).then((database) => {
				database.onversionchange = release;
				return database;
			});
			opening.catch(() => {
				if (connection === opening) connection = undefined;
			});
			connection = opening;
		}
		return connection;
	}

	async function run<T>(
		mode: IDBTransactionMode,
		work: (store: IDBObjectStore) => Promise<T>
	): Promise<T> {
		const database = await connect();
		const transaction = database.transaction(PROFILES_STORE, mode);
		const done = transactionDone(transaction);
		done.catch(() => undefined);
		const result = await work(transaction.objectStore(PROFILES_STORE));
		await done;
		return result;
	}

	return {
		list: () => run('readonly', async (store) => readAll(await requestResult(store.getAll()))),
		get: (id) => run('readonly', async (store) => tryParse(await requestResult(store.get(id)))),
		save: async (profile) => {
			const copy = parseProfile(profile);
			await run('readwrite', (store) => requestResult(store.put(copy)));
		},
		remove: async (id) => {
			await run('readwrite', (store) => requestResult(store.delete(id)));
		},
		close: release
	};
}
