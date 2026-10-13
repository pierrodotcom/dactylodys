import type { Page } from '@playwright/test';
import { IDBFactory } from 'fake-indexeddb';
import { readFileSync } from 'node:fs';
import type { ProgressState, StarCount } from '../src/lib/engine/progression/types';
import { createProfile, markCalibrated, withProgress } from '../src/lib/state/profile';
import { createIndexedDbProfileStore } from '../src/lib/state/stores';
import { asVersion1 } from '../src/lib/state/test-support';
import type { Profile } from '../src/lib/state/types';

/** SvelteKit adds its announcer once the client app has taken over the page. */
const HYDRATION_SIGNAL = '#svelte-announcer';

/** Acting before hydration loses clicks and keystrokes: wait until the page reacts. */
export async function waitForHydration(page: Page): Promise<void> {
	await page.locator(HYDRATION_SIGNAL).waitFor({ state: 'attached' });
}

export async function openPage(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await waitForHydration(page);
}

export async function reloadPage(page: Page): Promise<void> {
	await page.reload();
	await waitForHydration(page);
}

export function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')) as T;
}

type MessageParams = Record<string, string | number>;

/** The French messages of the interface, read from the source file the app is built from. */
export function loadMessages() {
	const messages = readJson<Record<string, string>>('messages/fr.json');

	function message(key: string, params: MessageParams = {}): string {
		const template = messages[key] ?? key;
		return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
	}

	function plural(key: string, count: number, params: MessageParams = {}): string {
		const form = new Intl.PluralRules('fr').select(count) === 'one' ? 'one' : 'other';
		return message(`${key}_${form}`, { count, ...params });
	}

	/** A regular expression for a message with `{text}` and `{char}`; `text` is captured. */
	function templateRegex(key: string): RegExp {
		const escaped = (messages[key] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const pattern = escaped.replace('\\{text\\}', '(?<text>.*)').replace('\\{char\\}', '.*');
		return new RegExp(`^${pattern}$`, 's');
	}

	/** Keys `<prefix>1`, `<prefix>2`… in order. */
	function numbered(prefix: string): string[] {
		return Object.keys(messages).filter((key) => new RegExp(`^${prefix}\\d+$`).test(key));
	}

	return { message, plural, templateRegex, numbered };
}

/** Pathnames of every link of the page. */
export function linkedPaths(page: Page): Promise<string[]> {
	return page
		.getByRole('link')
		.evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).pathname));
}

/** Best accuracy of a lesson that is installed as passed: enough to open the next one. */
const PASSED_ACCURACY = 100;

export interface AdvancedProfileInput {
	readonly name: string;
	/** Stars of every lesson the child has already passed, by lesson identifier. */
	readonly passed: Readonly<Record<string, StarCount>>;
}

/** A calibrated profile, built with the real profile functions, that has passed the given lessons. */
export function advancedProfile(input: AdvancedProfileInput): Profile {
	const now = Date.now();
	const progress: ProgressState = {
		lessons: Object.fromEntries(
			Object.entries(input.passed).map(([lessonId, stars]) => [
				lessonId,
				{ bestAccuracy: PASSED_ACCURACY, stars, attempts: 1, lastPlayedAt: now }
			])
		),
		chars: {}
	};
	const created = createProfile({
		id: `e2e-${input.name}`,
		name: input.name,
		now,
		platform: 'pc'
	});
	return withProgress(markCalibrated(created), progress);
}

interface StoreSnapshot {
	readonly name: string;
	readonly keyPath: string | string[] | null;
	readonly records: readonly unknown[];
}

interface DatabaseSnapshot {
	readonly name: string;
	readonly version: number;
	readonly stores: readonly StoreSnapshot[];
}

function settled<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/**
 * Lets the real profile store write the profile into a throwaway database, then reads back the
 * name, the version, the stores and the records it produced: the app's database is never described
 * by constants of the tests.
 */
async function snapshotOfRealStore(profile: Profile): Promise<DatabaseSnapshot> {
	const factory = new IDBFactory();
	const scope = globalThis as { indexedDB?: unknown };
	const previous = scope.indexedDB;
	scope.indexedDB = factory;
	try {
		const store = createIndexedDbProfileStore();
		await store.save(profile);
		store.close();
		const [info] = await factory.databases();
		if (info?.name === undefined || info.version === undefined) {
			throw new Error('The profile store did not create a database');
		}
		const database = await settled(factory.open(info.name, info.version));
		const stores: StoreSnapshot[] = [];
		for (const name of Array.from(database.objectStoreNames)) {
			const objectStore = database.transaction(name, 'readonly').objectStore(name);
			stores.push({
				name,
				keyPath: objectStore.keyPath,
				records: await settled(objectStore.getAll())
			});
		}
		database.close();
		return { name: info.name, version: info.version, stores };
	} finally {
		scope.indexedDB = previous;
	}
}

/** `version-1`: the record as the first version of the app stored it, before any migration. */
export type StoredFormat = 'current' | 'version-1';

function inFormat(snapshot: DatabaseSnapshot, profile: Profile, format: StoredFormat) {
	if (format === 'current') return snapshot;
	const isThisProfile = (record: unknown) => (record as { id?: unknown }).id === profile.id;
	return {
		...snapshot,
		stores: snapshot.stores.map((store) => ({
			...store,
			records: store.records.map((record) => (isThisProfile(record) ? asVersion1(profile) : record))
		}))
	};
}

/**
 * Writes a profile straight into the IndexedDB database of the app, in its real format. The page
 * must already be on the app: reload it afterwards so that the app reads the profile.
 */
export async function installProfile(
	page: Page,
	profile: Profile,
	format: StoredFormat = 'current'
): Promise<void> {
	const snapshot = inFormat(await snapshotOfRealStore(profile), profile, format);
	await page.evaluate(async (database) => {
		const opened = await new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open(database.name, database.version);
			request.onupgradeneeded = () => {
				for (const store of database.stores) {
					if (!request.result.objectStoreNames.contains(store.name)) {
						request.result.createObjectStore(store.name, { keyPath: store.keyPath });
					}
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		await new Promise<void>((resolve, reject) => {
			const names = database.stores.map((store) => store.name);
			const transaction = opened.transaction(names, 'readwrite');
			for (const store of database.stores) {
				for (const record of store.records) transaction.objectStore(store.name).put(record);
			}
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
		opened.close();
	}, snapshot);
}

/** The record the app holds for this profile, as it is stored; `undefined` when there is none. */
export async function storedRecord(
	page: Page,
	profile: Profile
): Promise<Record<string, unknown> | undefined> {
	const snapshot = await snapshotOfRealStore(profile);
	const holder = snapshot.stores.find((store) => store.records.length > 0);
	if (!holder) throw new Error('The profile store did not write the profile anywhere');
	return page.evaluate(
		async ({ databaseName, storeName, id }) => {
			const opened = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(databaseName);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
			try {
				return await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
					const request = opened.transaction(storeName, 'readonly').objectStore(storeName).get(id);
					request.onsuccess = () => resolve(request.result as Record<string, unknown> | undefined);
					request.onerror = () => reject(request.error);
				});
			} finally {
				opened.close();
			}
		},
		{ databaseName: snapshot.name, storeName: holder.name, id: profile.id }
	);
}
