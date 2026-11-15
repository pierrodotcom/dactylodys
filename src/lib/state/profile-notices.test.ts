import { describe, expect, it } from 'vitest';
import { createProfile, updateSettings } from './profile';
import {
	createProfileNotices,
	PROFILE_CHANNEL_NAME,
	withNotices,
	type NoticeChannel
} from './profile-notices';
import { createMemoryProfileStore } from './stores';
import { createNoticeHub } from './test-support';

const profile = createProfile({ id: 'a', name: 'Léa', now: 10, platform: 'pc' });

/** Counts what a page hears from the others. */
function heardBy(notices: { listen(listener: () => void): () => void }) {
	const heard = { count: 0, stop: () => {} };
	const stop = notices.listen(() => (heard.count += 1));
	heard.stop = () => stop();
	return heard;
}

describe('profile notices', () => {
	it('opens the channel under the technical name of the app', () => {
		const names: string[] = [];
		const open = createNoticeHub();
		createProfileNotices((name) => {
			names.push(name);
			return open(name);
		});
		expect(names).toEqual([PROFILE_CHANNEL_NAME]);
		expect(PROFILE_CHANNEL_NAME).toBe('dactylodys');
	});

	it('tells the other pages, not the one that speaks', () => {
		const open = createNoticeHub();
		const first = createProfileNotices(open);
		const second = createProfileNotices(open);
		const third = createProfileNotices(open);
		const heard = [heardBy(first), heardBy(second), heardBy(third)];

		first.announce();

		expect(heard.map((page) => page.count)).toEqual([0, 1, 1]);
	});

	it('stops telling a listener that left, and a page that closed', () => {
		const open = createNoticeHub();
		const first = createProfileNotices(open);
		const second = createProfileNotices(open);
		const third = createProfileNotices(open);
		const left = heardBy(second);
		const stays = heardBy(second);
		const closed = heardBy(third);

		left.stop();
		third.close();
		first.announce();

		expect([left.count, stays.count, closed.count]).toEqual([0, 1, 0]);
	});

	it('ignores what is not a notice of the app', () => {
		let deliver: (message: unknown) => void = () => {};
		const channel: NoticeChannel = {
			post: () => {},
			receive: (handler) => {
				deliver = handler;
			},
			close: () => {}
		};
		const heard = heardBy(createProfileNotices(() => channel));

		deliver('something else');
		deliver({ type: 'profiles-changed' });
		deliver(null);

		expect(heard.count).toBe(0);
	});

	it('says and hears nothing, without failing, where the browser has no channel', () => {
		const notices = createProfileNotices(() => {
			throw new ReferenceError('BroadcastChannel is not defined');
		});
		const heard = heardBy(notices);

		expect(() => notices.announce()).not.toThrow();
		expect(() => notices.close()).not.toThrow();
		expect(heard.count).toBe(0);
	});

	it('does not fail when the channel refuses a message or its closing', () => {
		const notices = createProfileNotices(() => ({
			post: () => {
				throw new Error('closed');
			},
			receive: () => {},
			close: () => {
				throw new Error('closed');
			}
		}));

		expect(() => notices.announce()).not.toThrow();
		expect(() => notices.close()).not.toThrow();
		expect(() => notices.close()).not.toThrow();
	});
});

describe('a profile store that tells the other pages', () => {
	function twoPages() {
		const open = createNoticeHub();
		const mine = createProfileNotices(open);
		const other = createProfileNotices(open);
		return {
			store: withNotices(createMemoryProfileStore([{ id: 'broken', garbage: true }]), mine),
			mine: heardBy(mine),
			other: heardBy(other)
		};
	}

	it('tells them once each change is stored', async () => {
		const { store, mine, other } = twoPages();

		await store.save(profile);
		expect(other.count).toBe(1);
		await store.update('a', (current) => updateSettings(current, { theme: 'dark' }));
		expect(other.count).toBe(2);
		await store.saveAll([{ ...profile, id: 'b' }]);
		expect(other.count).toBe(3);
		await store.remove('b');
		expect(other.count).toBe(4);
		await store.removeUnreadable('broken');
		expect(other.count).toBe(5);

		expect(mine.count).toBe(0);
		expect((await store.get('a'))?.settings.theme).toBe('dark');
		expect((await store.list()).map((item) => item.id)).toEqual(['a']);
	});

	it('tells them nothing when it only reads', async () => {
		const { store, other } = twoPages();

		await store.list();
		await store.get('a');
		await store.listUnreadable();

		expect(other.count).toBe(0);
	});

	it('tells them nothing when a change is refused or finds no profile', async () => {
		const { store, other } = twoPages();

		await expect(store.save({ ...profile, name: '' })).rejects.toThrow();
		await expect(store.save({ ...profile, id: 'broken' })).rejects.toThrow();
		await expect(store.saveAll([{ ...profile, id: 'broken' }])).rejects.toThrow();
		await expect(store.remove('broken')).rejects.toThrow();
		expect(await store.update('missing', (current) => current)).toBeNull();
		await expect(store.update('broken', (current) => current)).rejects.toThrow();

		expect(other.count).toBe(0);
	});
});
