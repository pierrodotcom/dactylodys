import { readProfile } from './migrations';
import { parseProfile } from './profile';
import type { Profile, ProfileStore, UnreadableProfile } from './types';

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

/**
 * The record under this id cannot be opened by this version of the app. It may hold what a more
 * recent version saved for a child: the store leaves it alone rather than lose it.
 */
export class UnreadableProfileError extends Error {
	readonly id: string;

	constructor(id: string) {
		super(`The profile "${id}" cannot be read and is left untouched`);
		this.name = 'UnreadableProfileError';
		this.id = id;
	}
}

function compareProfiles(a: Profile, b: Profile): number {
	if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
	return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** By id, the records without a readable id last. */
function compareUnreadable(a: UnreadableProfile, b: UnreadableProfile): number {
	if (a.id === b.id) return 0;
	if (a.id === null) return 1;
	if (b.id === null) return -1;
	return a.id < b.id ? -1 : 1;
}

function readOne(record: unknown): Profile | null {
	if (record === undefined) return null;
	const reading = readProfile(record);
	return reading.ok ? reading.profile : null;
}

function readAll(records: readonly unknown[]): readonly Profile[] {
	return records
		.map(readOne)
		.filter((profile): profile is Profile => profile !== null)
		.sort(compareProfiles);
}

function readUnreadable(records: readonly unknown[]): readonly UnreadableProfile[] {
	const found: UnreadableProfile[] = [];
	for (const record of records) {
		const reading = readProfile(record);
		if (!reading.ok) found.push(reading.unreadable);
	}
	return found.sort(compareUnreadable);
}

/** `existing` is what the store holds under `id`, `undefined` when it holds nothing. */
function assertNotUnreadable(existing: unknown, id: string): void {
	if (existing !== undefined && !readProfile(existing).ok) throw new UnreadableProfileError(id);
}

/** `existing` must be a record the app cannot open, or nothing: a readable profile goes through `remove`. */
function assertUnreadable(existing: unknown, id: string): void {
	if (existing !== undefined && readProfile(existing).ok) {
		throw new RangeError(`profile "${id}" can be opened: remove it with remove()`);
	}
}

/** What `change` makes of `current`, checked: a valid profile, still under the same id. */
function changed(current: Profile, change: (current: Profile) => Profile): Profile {
	const next = parseProfile(change(current));
	if (next.id !== current.id) {
		throw new RangeError(`a change must keep the id of the profile "${current.id}"`);
	}
	return next;
}

function attempt<T>(work: () => T): Promise<T> {
	try {
		return Promise.resolve(work());
	} catch (error) {
		return Promise.reject(error);
	}
}

/**
 * `stored` stands for what an earlier visit left behind, in whatever format: it is read like the
 * records of a real database.
 */
export function createMemoryProfileStore(stored: readonly unknown[] = []): ProfileStore {
	const records = new Map<unknown, unknown>();
	for (const record of stored) {
		const id = (record as { id?: unknown } | null | undefined)?.id;
		records.set(typeof id === 'string' ? id : Symbol('no usable id'), structuredClone(record));
	}
	return {
		list: () => Promise.resolve(readAll([...records.values()])),
		get: (id) => Promise.resolve(readOne(records.get(id))),
		save: (profile) =>
			attempt(() => {
				const copy = parseProfile(profile);
				assertNotUnreadable(records.get(copy.id), copy.id);
				records.set(copy.id, copy);
			}),
		update: (id, change) =>
			attempt(() => {
				const existing = records.get(id);
				assertNotUnreadable(existing, id);
				const current = readOne(existing);
				if (current === null) return null;
				const next = changed(current, change);
				records.set(id, next);
				return parseProfile(next);
			}),
		saveAll: (profiles) =>
			attempt(() => {
				const copies = profiles.map((profile) => parseProfile(profile));
				for (const copy of copies) assertNotUnreadable(records.get(copy.id), copy.id);
				for (const copy of copies) records.set(copy.id, copy);
			}),
		remove: (id) =>
			attempt(() => {
				assertNotUnreadable(records.get(id), id);
				records.delete(id);
			}),
		listUnreadable: () => Promise.resolve(readUnreadable([...records.values()])),
		removeUnreadable: (id) =>
			attempt(() => {
				assertUnreadable(records.get(id), id);
				records.delete(id);
			})
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
		let result: T;
		try {
			result = await work(transaction.objectStore(PROFILES_STORE));
		} catch (error) {
			// What was already asked of this transaction is undone: all of it, or nothing.
			try {
				transaction.abort();
			} catch {
				// Already over: there is nothing left to undo.
			}
			throw error;
		}
		await done;
		return result;
	}

	/** Reads what is under `id` and changes it in the same transaction, so nothing slips in between. */
	function change(id: string, apply: (store: IDBObjectStore) => IDBRequest): Promise<void> {
		return run('readwrite', async (store) => {
			assertNotUnreadable(await requestResult(store.get(id)), id);
			await requestResult(apply(store));
		});
	}

	return {
		list: () => run('readonly', async (store) => readAll(await requestResult(store.getAll()))),
		get: (id) => run('readonly', async (store) => readOne(await requestResult(store.get(id)))),
		save: async (profile) => {
			const copy = parseProfile(profile);
			await change(copy.id, (store) => store.put(copy));
		},
		update: (id, apply) =>
			run('readwrite', async (store) => {
				const existing = await requestResult(store.get(id));
				assertNotUnreadable(existing, id);
				const current = readOne(existing);
				if (current === null) return null;
				const next = changed(current, apply);
				await requestResult(store.put(next));
				return next;
			}),
		saveAll: async (profiles) => {
			const copies = profiles.map((profile) => parseProfile(profile));
			await run('readwrite', async (store) => {
				// A refusal on the way undoes the profiles already written: the transaction is aborted.
				for (const copy of copies) {
					assertNotUnreadable(await requestResult(store.get(copy.id)), copy.id);
					await requestResult(store.put(copy));
				}
			});
		},
		remove: (id) => change(id, (store) => store.delete(id)),
		listUnreadable: () =>
			run('readonly', async (store) => readUnreadable(await requestResult(store.getAll()))),
		removeUnreadable: (id) =>
			run('readwrite', async (store) => {
				assertUnreadable(await requestResult(store.get(id)), id);
				await requestResult(store.delete(id));
			}),
		close: release
	};
}
