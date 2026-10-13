import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { voiceKey } from '$lib/audio/voice-key';
import { createIndexedDbProfileStore } from '$lib/state/stores';
import {
	createIndexedDbTakeStore,
	createMemoryTakeStore,
	type Take,
	type TakeStore
} from './take-store';

let databaseCounter = 0;

function freshDatabaseName(): string {
	databaseCounter += 1;
	return `test-voix-${databaseCounter}`;
}

function take(text: string, changes: Partial<Take> = {}): Take {
	return {
		key: voiceKey(text),
		wav: Uint8Array.from([82, 73, 70, 70, 1, 2, 3]),
		durationMs: 2400,
		recordedAt: '2026-10-14T09:30:00.000Z',
		...changes
	};
}

describe.each([
	['memory', () => createMemoryTakeStore()],
	['IndexedDB', () => createIndexedDbTakeStore({ databaseName: freshDatabaseName() })]
])('take store (%s)', (_, create: () => TakeStore) => {
	it('starts empty', async () => {
		await expect(create().list()).resolves.toEqual([]);
	});

	it('gives back the takes it was given, bytes included', async () => {
		const store = create();
		const first = take('Un texte.');
		const second = take('Un autre texte.', { wav: Uint8Array.from([9, 8, 7]), durationMs: 900 });

		await store.save(first);
		await store.save(second);

		const listed = await store.list();
		expect(listed).toHaveLength(2);
		expect(listed).toEqual(expect.arrayContaining([first, second]));
	});

	it('keeps one take per text: a new one replaces the old one', async () => {
		const store = create();
		await store.save(take('Un texte.', { durationMs: 1000 }));

		await store.save(take('Un texte.', { durationMs: 2000 }));

		await expect(store.list()).resolves.toEqual([take('Un texte.', { durationMs: 2000 })]);
	});

	it('does not share its bytes with the caller', async () => {
		const store = create();
		const given = take('Un texte.');
		await store.save(given);

		given.wav[0] = 0;

		const [listed] = await store.list();
		expect(listed?.wav[0]).toBe(82);
	});

	it('forgets everything when cleared', async () => {
		const store = create();
		await store.save(take('Un texte.'));
		await store.save(take('Un autre texte.'));

		await store.clear();

		await expect(store.list()).resolves.toEqual([]);
	});

	it.each([
		['a key that is not a voice key', { key: 'intro' }],
		['no sound', { wav: new Uint8Array(0) }],
		['no duration', { durationMs: 0 }]
	])('refuses a take with %s', async (_label, changes) => {
		const store = create();

		await expect(store.save(take('Un texte.', changes))).rejects.toThrow('Invalid take');
		await expect(store.list()).resolves.toEqual([]);
	});
});

describe('IndexedDB take store', () => {
	it('finds the takes again after the page was closed', async () => {
		const databaseName = freshDatabaseName();
		const before = createIndexedDbTakeStore({ databaseName });
		await before.save(take('Un texte.'));
		before.close();

		const after = createIndexedDbTakeStore({ databaseName });

		await expect(after.list()).resolves.toEqual([take('Un texte.')]);
	});

	it('leaves out a record that is not a take', async () => {
		const databaseName = freshDatabaseName();
		const store = createIndexedDbTakeStore({ databaseName });
		await store.save(take('Un texte.'));
		store.close();
		await new Promise<void>((resolve, reject) => {
			const open = indexedDB.open(databaseName);
			open.onerror = () => reject(open.error);
			open.onsuccess = () => {
				const transaction = open.result.transaction('takes', 'readwrite');
				transaction.objectStore('takes').put({ key: 'not-a-take', wav: 'nothing' });
				transaction.oncomplete = () => {
					open.result.close();
					resolve();
				};
				transaction.onerror = () => reject(transaction.error);
			};
		});

		await expect(store.list()).resolves.toEqual([take('Un texte.')]);
	});

	it('keeps its takes apart from the profiles of the children', async () => {
		const takes = createIndexedDbTakeStore();
		const profiles = createIndexedDbProfileStore();
		await takes.save(take('Un texte.'));

		await takes.clear();
		await profiles.list();

		const names = (await indexedDB.databases()).map((database) => database.name);
		expect(new Set(names).size).toBe(names.length);
		expect(names).toEqual(expect.arrayContaining(['dactylodys', 'dactylodys-voix']));
		takes.close();
		profiles.close();
	});
});
