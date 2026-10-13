import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProfile, PROFILE_SCHEMA_VERSION, withLastGame } from './profile';
import { describeProfileStoreContract } from './profile-store-contract';
import { createIndexedDbProfileStore, createMemoryProfileStore } from './stores';
import { asVersion1 } from './test-support';
import type { Profile } from './types';

let databaseCounter = 0;

function freshDatabaseName(): string {
	databaseCounter += 1;
	return `test-db-${databaseCounter}`;
}

function withProfilesStore<T>(
	databaseName: string,
	mode: IDBTransactionMode,
	work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
	return new Promise((resolve, reject) => {
		const open = indexedDB.open(databaseName, 1);
		open.onerror = () => reject(open.error);
		open.onsuccess = () => {
			const database = open.result;
			const transaction = database.transaction('profiles', mode);
			const request = work(transaction.objectStore('profiles'));
			transaction.oncomplete = () => {
				database.close();
				resolve(request.result);
			};
			transaction.onerror = () => reject(transaction.error);
		};
	});
}

async function putRaw(databaseName: string, value: unknown): Promise<void> {
	await withProfilesStore(databaseName, 'readwrite', (store) => store.put(value));
}

function getRaw(databaseName: string, id: string): Promise<unknown> {
	return withProfilesStore(databaseName, 'readonly', (store) => store.get(id));
}

async function indexedDbStoreHolding(databaseName: string, stored: readonly unknown[] = []) {
	const store = createIndexedDbProfileStore({ databaseName });
	await store.list();
	for (const record of stored) await putRaw(databaseName, record);
	return store;
}

describeProfileStoreContract('memory', createMemoryProfileStore);
describeProfileStoreContract('IndexedDB', (stored) =>
	indexedDbStoreHolding(freshDatabaseName(), stored)
);

describe('memory profile store', () => {
	it('reports what it was given that has no usable id', async () => {
		const store = createMemoryProfileStore([null, 'profile', { name: 'Max' }, { id: 4 }]);
		expect(await store.list()).toEqual([]);
		expect(await store.listUnreadable()).toEqual([
			{ id: null, name: null, reason: 'invalid' },
			{ id: null, name: null, reason: 'invalid' },
			{ id: null, name: 'Max', reason: 'invalid' },
			{ id: null, name: null, reason: 'invalid' }
		]);
	});

	it('is not affected by later changes to the records it was given', async () => {
		const profile = createProfile({ id: 'a', name: 'Léa', now: 10, platform: 'pc' });
		const record = asVersion1(profile);
		const store = createMemoryProfileStore([record]);
		record['name'] = 42;
		expect(await store.get('a')).toEqual(profile);
	});
});

describe('IndexedDB profile store', () => {
	const profile = createProfile({ id: 'a', name: 'Léa', now: 10, platform: 'pc' });

	it('keeps profiles across store instances of the same database', async () => {
		const databaseName = freshDatabaseName();
		const first = createIndexedDbProfileStore({ databaseName });
		await first.save(profile);
		first.close();
		const second = createIndexedDbProfileStore({ databaseName });
		expect(await second.get('a')).toEqual(profile);
	});

	it('keeps databases of different names apart', async () => {
		const first = createIndexedDbProfileStore({ databaseName: freshDatabaseName() });
		const second = createIndexedDbProfileStore({ databaseName: freshDatabaseName() });
		await first.save(profile);
		expect(await second.list()).toEqual([]);
	});

	it('uses a default database name', async () => {
		const store = createIndexedDbProfileStore();
		await store.save(profile);
		expect(await store.get('a')).toEqual(profile);
		await store.remove('a');
	});

	it('does not rewrite a record of the first version when it only reads it', async () => {
		const databaseName = freshDatabaseName();
		const stored = asVersion1(profile);
		const store = await indexedDbStoreHolding(databaseName, [stored]);

		expect(await store.list()).toEqual([profile]);
		expect(await store.get('a')).toEqual(profile);
		expect(await store.listUnreadable()).toEqual([]);

		expect(await getRaw(databaseName, 'a')).toEqual(stored);
	});

	it('writes a record of the first version in the current version the first time it is saved', async () => {
		const databaseName = freshDatabaseName();
		const store = await indexedDbStoreHolding(databaseName, [asVersion1(profile)]);
		const played = withLastGame((await store.get('a')) as Profile, 'fr.world.x', 'rocket');

		await store.save(played);

		expect(await getRaw(databaseName, 'a')).toEqual(played);
		expect(played.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
	});

	it('leaves byte for byte the records it cannot open, whatever is asked of it', async () => {
		const databaseName = freshDatabaseName();
		const later = { ...profile, schemaVersion: PROFILE_SCHEMA_VERSION + 1, addedLater: { a: 1 } };
		const damaged = { id: 'broken', name: 42 };
		const store = await indexedDbStoreHolding(databaseName, [later, damaged]);

		await store.list();
		await store.listUnreadable();
		await store.get('a');
		await expect(store.save(profile)).rejects.toThrow();
		await expect(store.remove('a')).rejects.toThrow();
		await expect(store.remove('broken')).rejects.toThrow();
		await store.save({ ...profile, id: 'other' });

		expect(await getRaw(databaseName, 'a')).toEqual(later);
		expect(await getRaw(databaseName, 'broken')).toEqual(damaged);
	});

	it('still works after refusing to touch a record', async () => {
		const databaseName = freshDatabaseName();
		const store = await indexedDbStoreHolding(databaseName, [{ id: 'a', garbage: true }]);
		await expect(store.save(profile)).rejects.toThrow();
		await store.save({ ...profile, id: 'b' });
		expect((await store.list()).map((item) => item.id)).toEqual(['b']);
	});

	it('reopens its connection after close', async () => {
		const store = createIndexedDbProfileStore({ databaseName: freshDatabaseName() });
		await store.save(profile);
		store.close();
		expect(await store.get('a')).toEqual(profile);
	});
});
