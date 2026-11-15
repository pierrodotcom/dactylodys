import type { ProfileStore } from './types';

/**
 * Technical name of the channel between the pages of the app on this device: it never changes
 * with the name of the app (ADR-055).
 */
export const PROFILE_CHANNEL_NAME = 'dactylodys';

/** What is sent: no identifier, no nickname, only that the profiles are to be read again. */
const PROFILES_CHANGED = 'profiles-changed';

/** What is used of a `BroadcastChannel`. */
export interface NoticeChannel {
	post(message: unknown): void;
	/** `handler` gets what the other pages post, never what this one posts. */
	receive(handler: (message: unknown) => void): void;
	close(): void;
}

/** Opens the channel of that name; may throw where the browser has none. */
export type NoticeChannelFactory = (name: string) => NoticeChannel;

const browserChannel: NoticeChannelFactory = (name) => {
	const channel = new BroadcastChannel(name);
	return {
		post: (message) => channel.postMessage(message),
		receive: (handler) => {
			channel.onmessage = (event) => handler(event.data);
		},
		close: () => channel.close()
	};
};

export interface ProfileNotices {
	/** Tells the other pages of the app, on this device, that the profiles changed. */
	announce(): void;
	/** `listener` is called each time another page says so; the result stops listening. */
	listen(listener: () => void): () => void;
	close(): void;
}

/**
 * The pages of the app tell each other when the profiles change (another tab, the installed app
 * beside a tab). Without a channel, nothing is said and nothing is heard: each page still stores
 * its changes one by one (`ProfileStore.update`), it only shows those of the others later.
 */
export function createProfileNotices(open: NoticeChannelFactory = browserChannel): ProfileNotices {
	const listeners = new Set<() => void>();
	let channel: NoticeChannel | null = null;
	try {
		channel = open(PROFILE_CHANNEL_NAME);
		channel.receive((message) => {
			if (message !== PROFILES_CHANGED) return;
			for (const listener of [...listeners]) listener();
		});
	} catch {
		channel = null;
	}

	return {
		announce() {
			try {
				channel?.post(PROFILES_CHANGED);
			} catch {
				// A closed channel: the other pages will read the change at their next write.
			}
		},
		listen(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		close() {
			listeners.clear();
			try {
				channel?.close();
			} catch {
				// Nothing to release.
			}
			channel = null;
		}
	};
}

/** The same store, which tells the other pages once a change is stored. */
export function withNotices<Store extends ProfileStore>(
	store: Store,
	notices: ProfileNotices
): Store {
	async function told<T>(written: Promise<T>): Promise<T> {
		const result = await written;
		notices.announce();
		return result;
	}

	return {
		...store,
		save: (profile) => told(store.save(profile)),
		update: async (id, change) => {
			const stored = await store.update(id, change);
			if (stored !== null) notices.announce();
			return stored;
		},
		saveAll: (profiles) => told(store.saveAll(profiles)),
		remove: (id) => told(store.remove(id)),
		removeUnreadable: (id) => told(store.removeUnreadable(id))
	};
}
