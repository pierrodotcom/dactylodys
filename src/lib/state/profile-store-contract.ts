import { describe, expect, it } from 'vitest';
import { createProfile, updateSettings, withProgress } from './profile';
import type { Profile, ProfileStore } from './types';

function profileAt(id: string, createdAt: number, name = 'Léa'): Profile {
	return createProfile({ id, name, now: createdAt, platform: 'pc' });
}

/** Behaviour every `ProfileStore` must have, whatever it persists to. */
export function describeProfileStoreContract(label: string, createStore: () => ProfileStore) {
	describe(`${label} profile store contract`, () => {
		it('lists nothing when empty', async () => {
			expect(await createStore().list()).toEqual([]);
		});

		it('returns null for an unknown id', async () => {
			expect(await createStore().get('missing')).toBeNull();
		});

		it('gives back what was saved', async () => {
			const store = createStore();
			const profile = withProgress(updateSettings(profileAt('a', 10), { theme: 'dark' }), {
				lessons: { 'fr.lesson.x': { bestAccuracy: 92.5, stars: 2, attempts: 4, lastPlayedAt: 99 } },
				chars: { é: { attempts: 3, errors: 1 } }
			});
			await store.save(profile);
			expect(await store.get('a')).toEqual(profile);
			expect(await store.list()).toEqual([profile]);
		});

		it('replaces a profile saved again under the same id', async () => {
			const store = createStore();
			await store.save(profileAt('a', 10, 'Léa'));
			await store.save(profileAt('a', 10, 'Zoé'));
			expect((await store.get('a'))?.name).toBe('Zoé');
			expect(await store.list()).toHaveLength(1);
		});

		it('lists profiles by creation date, oldest first', async () => {
			const store = createStore();
			await store.save(profileAt('c', 30));
			await store.save(profileAt('a', 10));
			await store.save(profileAt('b', 20));
			expect((await store.list()).map((profile) => profile.id)).toEqual(['a', 'b', 'c']);
		});

		it('breaks creation date ties by id', async () => {
			const store = createStore();
			await store.save(profileAt('b', 10));
			await store.save(profileAt('a', 10));
			expect((await store.list()).map((profile) => profile.id)).toEqual(['a', 'b']);
		});

		it('removes a profile and keeps the others', async () => {
			const store = createStore();
			await store.save(profileAt('a', 10));
			await store.save(profileAt('b', 20));
			await store.remove('a');
			expect(await store.get('a')).toBeNull();
			expect((await store.list()).map((profile) => profile.id)).toEqual(['b']);
		});

		it('accepts removing an unknown id', async () => {
			await expect(createStore().remove('missing')).resolves.toBeUndefined();
		});

		it('is not affected by later changes to a saved object', async () => {
			const store = createStore();
			const profile = profileAt('a', 10);
			await store.save(profile);
			(profile.settings as { theme: string }).theme = 'dark';
			expect((await store.get('a'))?.settings.theme).toBe('system');
		});

		it('hands out copies that cannot alter the stored profile', async () => {
			const store = createStore();
			await store.save(profileAt('a', 10));
			const first = (await store.get('a')) as unknown as { settings: { theme: string } };
			const second = await store.get('a');
			expect(first).not.toBe(second);
			first.settings.theme = 'dark';
			(await store.list()).forEach((profile) => ((profile as { name: string }).name = 'changed'));
			expect((await store.get('a'))?.settings.theme).toBe('system');
			expect((await store.get('a'))?.name).toBe('Léa');
		});

		it('refuses an invalid profile and stores nothing', async () => {
			const store = createStore();
			const invalid = { ...profileAt('a', 10), name: '' };
			await expect(store.save(invalid)).rejects.toThrow();
			expect(await store.list()).toEqual([]);
		});
	});
}
