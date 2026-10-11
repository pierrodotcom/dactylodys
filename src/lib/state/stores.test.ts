import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createProfile } from './profile';
import { describeProfileStoreContract } from './profile-store-contract';
import { createIndexedDbProfileStore, createMemoryProfileStore } from './stores';

let databaseCounter = 0;

function freshDatabaseName(): string {
	databaseCounter += 1;
	return `test-db-${databaseCounter}`;
}

function putRaw(databaseName: string, value: unknown): Promise<void> {
	return new Promise((resolve, reject) => {
		const open = indexedDB.open(databaseName, 1);
		open.onerror = () => reject(open.error);
		open.onsuccess = () => {
			const database = open.result;
			const transaction = database.transaction('profiles', 'readwrite');
			transaction.objectStore('profiles').put(value);
			transaction.oncomplete = () => {
				database.close();
				resolve();
			};
			transaction.onerror = () => reject(transaction.error);
		};
	});
}

describeProfileStoreContract('memory', createMemoryProfileStore);
describeProfileStoreContract('IndexedDB', () =>
	createIndexedDbProfileStore({ databaseName: freshDatabaseName() })
);

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

	it('ignores corrupted entries when listing and keeps the valid ones', async () => {
		const databaseName = freshDatabaseName();
		const store = createIndexedDbProfileStore({ databaseName });
		await store.save(profile);
		await putRaw(databaseName, { id: 'broken', name: 42 });
		await putRaw(databaseName, { ...profile, id: 'wrong-settings', settings: {} });
		expect(await store.list()).toEqual([profile]);
	});

	it('returns null instead of throwing for a corrupted entry', async () => {
		const databaseName = freshDatabaseName();
		const store = createIndexedDbProfileStore({ databaseName });
		await store.list();
		await putRaw(databaseName, { id: 'broken', schemaVersion: 1 });
		await expect(store.get('broken')).resolves.toBeNull();
	});

	it('can overwrite a corrupted entry with a valid profile', async () => {
		const databaseName = freshDatabaseName();
		const store = createIndexedDbProfileStore({ databaseName });
		await store.list();
		await putRaw(databaseName, { id: 'a', garbage: true });
		await store.save(profile);
		expect(await store.get('a')).toEqual(profile);
	});

	it('reopens its connection after close', async () => {
		const store = createIndexedDbProfileStore({ databaseName: freshDatabaseName() });
		await store.save(profile);
		store.close();
		expect(await store.get('a')).toEqual(profile);
	});
});
