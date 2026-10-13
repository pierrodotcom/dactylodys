import { VOICE_KEY_PATTERN } from '$lib/audio/voice-key';

/** What the page keeps of one recorded text; the text itself is found again through its key. */
export interface Take {
	/** `voiceKey` of the text that was read. */
	readonly key: string;
	/** The processed clip, a complete WAV file. */
	readonly wav: Uint8Array<ArrayBuffer>;
	readonly durationMs: number;
	/** ISO 8601 date and time of the take. */
	readonly recordedAt: string;
}

/** Takes are kept in the browser so that recording can stop and go on another day. */
export interface TakeStore {
	list(): Promise<readonly Take[]>;
	/** Replaces the take of the same text, if any. */
	save(take: Take): Promise<void>;
	clear(): Promise<void>;
	close(): void;
}

export interface IndexedDbTakeStoreOptions {
	readonly databaseName?: string;
}

/** Apart from the database of the profiles: erasing the takes can never touch a child's progress. */
const DEFAULT_DATABASE_NAME = 'dactylodys-voix';
const DATABASE_VERSION = 1;
const TAKES_STORE = 'takes';

function readTake(record: unknown): Take | null {
	if (typeof record !== 'object' || record === null) return null;
	const { key, wav, durationMs, recordedAt } = record as Record<string, unknown>;
	if (typeof key !== 'string' || !VOICE_KEY_PATTERN.test(key)) return null;
	if (!(wav instanceof Uint8Array) || wav.length === 0) return null;
	if (typeof durationMs !== 'number' || !(durationMs > 0)) return null;
	if (typeof recordedAt !== 'string') return null;
	return { key, wav: Uint8Array.from(wav), durationMs, recordedAt };
}

function expectTake(take: Take): Take {
	const copy = readTake(take);
	if (copy === null) throw new Error('Invalid take');
	return copy;
}

/** Whatever is not a take is left out: a record this page cannot read is no reason to fail. */
function readAll(records: readonly unknown[]): readonly Take[] {
	return records
		.map(readTake)
		.filter((take): take is Take => take !== null)
		.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function createMemoryTakeStore(): TakeStore {
	const takes = new Map<string, Take>();
	return {
		list: () => Promise.resolve(readAll([...takes.values()])),
		save(take) {
			try {
				const copy = expectTake(take);
				takes.set(copy.key, copy);
				return Promise.resolve();
			} catch (error) {
				return Promise.reject(error);
			}
		},
		clear() {
			takes.clear();
			return Promise.resolve();
		},
		close: () => undefined
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
			if (!database.objectStoreNames.contains(TAKES_STORE)) {
				database.createObjectStore(TAKES_STORE, { keyPath: 'key' });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
		request.onblocked = () => reject(new Error('IndexedDB open request is blocked'));
	});
}

export function createIndexedDbTakeStore(options: IndexedDbTakeStoreOptions = {}): TakeStore {
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
		work: (store: IDBObjectStore) => IDBRequest<T>
	): Promise<T> {
		const database = await connect();
		const transaction = database.transaction(TAKES_STORE, mode);
		const done = transactionDone(transaction);
		done.catch(() => undefined);
		const result = await requestResult(work(transaction.objectStore(TAKES_STORE)));
		await done;
		return result;
	}

	return {
		list: async () => readAll(await run('readonly', (store) => store.getAll())),
		save: async (take) => {
			const copy = expectTake(take);
			await run('readwrite', (store) => store.put(copy));
		},
		clear: async () => {
			await run('readwrite', (store) => store.clear());
		},
		close: release
	};
}
