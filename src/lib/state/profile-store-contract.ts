import { describe, expect, it } from 'vitest';
import { createProfile, updateSettings, withProgress } from './profile';
import { UnreadableProfileError } from './stores';
import { asVersion1 } from './test-support';
import type { Profile, ProfileStore } from './types';

function profileAt(id: string, createdAt: number, name = 'Léa'): Profile {
	return createProfile({ id, name, now: createdAt, platform: 'pc' });
}

/** What a later version of the app could have stored: not something this code may open. */
function fromLaterVersion(profile: Profile): Record<string, unknown> {
	return { ...profile, schemaVersion: profile.schemaVersion + 1, addedLater: [1, 2] };
}

/**
 * Behaviour every `ProfileStore` must have, whatever it persists to. `createStore` gives a store
 * that already holds the given records, as an earlier visit could have left them; each has an `id`.
 */
export function describeProfileStoreContract(
	label: string,
	createStore: (stored?: readonly unknown[]) => ProfileStore | Promise<ProfileStore>
) {
	describe(`${label} profile store contract`, () => {
		it('lists nothing when empty', async () => {
			const store = await createStore();
			expect(await store.list()).toEqual([]);
			expect(await store.listUnreadable()).toEqual([]);
		});

		it('returns null for an unknown id', async () => {
			expect(await (await createStore()).get('missing')).toBeNull();
		});

		it('gives back what was saved', async () => {
			const store = await createStore();
			const profile = withProgress(updateSettings(profileAt('a', 10), { theme: 'dark' }), {
				lessons: { 'fr.lesson.x': { bestAccuracy: 92.5, stars: 2, attempts: 4, lastPlayedAt: 99 } },
				chars: { é: { attempts: 3, errors: 1 } }
			});
			await store.save(profile);
			expect(await store.get('a')).toEqual(profile);
			expect(await store.list()).toEqual([profile]);
			expect(await store.listUnreadable()).toEqual([]);
		});

		it('replaces a profile saved again under the same id', async () => {
			const store = await createStore();
			await store.save(profileAt('a', 10, 'Léa'));
			await store.save(profileAt('a', 10, 'Zoé'));
			expect((await store.get('a'))?.name).toBe('Zoé');
			expect(await store.list()).toHaveLength(1);
		});

		it('lists profiles by creation date, oldest first', async () => {
			const store = await createStore();
			await store.save(profileAt('c', 30));
			await store.save(profileAt('a', 10));
			await store.save(profileAt('b', 20));
			expect((await store.list()).map((profile) => profile.id)).toEqual(['a', 'b', 'c']);
		});

		it('breaks creation date ties by id', async () => {
			const store = await createStore();
			await store.save(profileAt('b', 10));
			await store.save(profileAt('a', 10));
			expect((await store.list()).map((profile) => profile.id)).toEqual(['a', 'b']);
		});

		it('removes a profile and keeps the others', async () => {
			const store = await createStore();
			await store.save(profileAt('a', 10));
			await store.save(profileAt('b', 20));
			await store.remove('a');
			expect(await store.get('a')).toBeNull();
			expect((await store.list()).map((profile) => profile.id)).toEqual(['b']);
		});

		it('accepts removing an unknown id', async () => {
			await expect((await createStore()).remove('missing')).resolves.toBeUndefined();
		});

		it('is not affected by later changes to a saved object', async () => {
			const store = await createStore();
			const profile = profileAt('a', 10);
			await store.save(profile);
			(profile.settings as { theme: string }).theme = 'dark';
			expect((await store.get('a'))?.settings.theme).toBe('system');
		});

		it('hands out copies that cannot alter the stored profile', async () => {
			const store = await createStore();
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
			const store = await createStore();
			const invalid = { ...profileAt('a', 10), name: '' };
			await expect(store.save(invalid)).rejects.toThrow();
			expect(await store.list()).toEqual([]);
		});

		it('opens a record of the first version as a profile of the current one', async () => {
			const profile = profileAt('a', 10);
			const store = await createStore([asVersion1(profile)]);
			expect(await store.get('a')).toEqual(profile);
			expect(await store.list()).toEqual([profile]);
			expect(await store.listUnreadable()).toEqual([]);
		});

		it('saves a profile over the record of the first version it came from', async () => {
			const profile = profileAt('a', 10);
			const store = await createStore([asVersion1(profile)]);
			const changed = updateSettings((await store.get('a')) as Profile, { voiceEnabled: false });
			await store.save(changed);
			expect(await store.list()).toEqual([changed]);
		});

		it('removes a record of the first version', async () => {
			const store = await createStore([asVersion1(profileAt('a', 10))]);
			await store.remove('a');
			expect(await store.list()).toEqual([]);
		});

		it('keeps the records it cannot open out of the list and reports them', async () => {
			const valid = profileAt('b', 20);
			const store = await createStore([
				fromLaterVersion(profileAt('d', 40, 'Zoé')),
				{ ...profileAt('c', 30, 'Noé'), settings: {} },
				valid,
				{ id: 'a', garbage: true },
				{ id: 7, name: 'Max' }
			]);
			expect(await store.list()).toEqual([valid]);
			expect(await store.listUnreadable()).toEqual([
				{ id: 'a', name: null, reason: 'invalid' },
				{ id: 'c', name: 'Noé', reason: 'invalid' },
				{ id: 'd', name: 'Zoé', reason: 'newer-version' },
				{ id: null, name: 'Max', reason: 'invalid' }
			]);
		});

		it('returns null for a record it cannot open', async () => {
			const store = await createStore([fromLaterVersion(profileAt('a', 10)), { id: 'b' }]);
			expect(await store.get('a')).toBeNull();
			expect(await store.get('b')).toBeNull();
		});

		it('refuses to replace a record it cannot open', async () => {
			const later = profileAt('a', 10, 'Zoé');
			const store = await createStore([fromLaterVersion(later), { id: 'b', garbage: true }]);
			const unreadable = await store.listUnreadable();

			await expect(store.save(profileAt('a', 10))).rejects.toThrow(UnreadableProfileError);
			await expect(store.save(profileAt('b', 20))).rejects.toThrow(UnreadableProfileError);

			expect(await store.list()).toEqual([]);
			expect(await store.listUnreadable()).toEqual(unreadable);
		});

		it('refuses to remove a record it cannot open', async () => {
			const store = await createStore([fromLaterVersion(profileAt('a', 10)), { id: 'b' }]);
			const unreadable = await store.listUnreadable();

			await expect(store.remove('a')).rejects.toThrow(UnreadableProfileError);
			await expect(store.remove('b')).rejects.toThrow(UnreadableProfileError);

			expect(await store.listUnreadable()).toEqual(unreadable);
		});

		it('leaves the records it cannot open alone while other profiles come and go', async () => {
			const store = await createStore([fromLaterVersion(profileAt('a', 10, 'Zoé'))]);
			await store.list();
			await store.get('a');
			await store.save(profileAt('b', 20));
			await store.save(profileAt('c', 30));
			await store.remove('b');
			expect((await store.list()).map((profile) => profile.id)).toEqual(['c']);
			expect(await store.listUnreadable()).toEqual([
				{ id: 'a', name: 'Zoé', reason: 'newer-version' }
			]);
		});
	});
}
