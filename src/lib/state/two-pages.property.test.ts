import 'fake-indexeddb/auto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { StarCount } from '../engine/progression/types';
import { withSessionRecorded } from './journal';
import {
	createProfile,
	renameProfile,
	updateSettings,
	withAdultWords,
	withGamePlayed,
	withLastGame,
	withOpenedWorld,
	withProgress
} from './profile';
import { createProfileNotices, withNotices, type NoticeChannelFactory } from './profile-notices';
import { createIndexedDbProfileStore, createMemoryProfileStore } from './stores';
import { nameArb, sessionRecordArb, settingsPatchArb } from './test-arbitraries';
import { createNoticeHub } from './test-support';
import type { Profile, ProfileStore } from './types';

type Change = (current: Profile) => Profile;

const PROFILE_ID = 'child';
const JOURNAL = { maxSessions: 2000 };
const idArb = fc.constantFrom('a', 'b', 'c', 'd', 'e');
const starsArb = fc.constantFrom<StarCount>(0, 1, 2, 3);

/** What the game stores while the child plays: a lesson, its play, the game chosen. */
const gameChangeArb: fc.Arbitrary<Change> = fc.oneof(
	fc.record({ lessonId: idArb, stars: starsArb, at: fc.nat({ max: 1000 }) }).map(
		({ lessonId, stars, at }): Change =>
			(current) =>
				withProgress(current, {
					...current.progress,
					lessons: {
						...current.progress.lessons,
						[lessonId]: {
							bestAccuracy: 90,
							stars,
							attempts: (current.progress.lessons[lessonId]?.attempts ?? 0) + 1,
							lastPlayedAt: at
						}
					}
				})
	),
	sessionRecordArb.map(
		(session): Change =>
			(current) =>
				withSessionRecorded(current, session, JOURNAL)
	),
	fc.record({ worldId: idArb, gameId: idArb }).map(
		({ worldId, gameId }): Change =>
			(current) =>
				withLastGame(current, worldId, gameId)
	),
	idArb.map(
		(gameId): Change =>
			(current) =>
				withGamePlayed(current, gameId)
	)
);

/** What the adult space stores: a setting, the words to type, a world opened, the nickname. */
const adultChangeArb: fc.Arbitrary<Change> = fc.oneof(
	settingsPatchArb.map(
		(patch): Change =>
			(current) =>
				updateSettings(current, patch)
	),
	fc.array(idArb, { maxLength: 3 }).map(
		(words): Change =>
			(current) =>
				withAdultWords(current, words)
	),
	idArb.map(
		(worldId): Change =>
			(current) =>
				withOpenedWorld(current, worldId)
	),
	nameArb.map(
		(name): Change =>
			(current) =>
				renameProfile(current, name)
	)
);

interface Step {
	readonly by: 'game' | 'adult';
	readonly change: Change;
}

/** One order of the changes of both pages that keeps the order of each. */
function interleave(
	game: readonly Change[],
	adult: readonly Change[],
	picks: readonly boolean[]
): Step[] {
	const steps: Step[] = [];
	let played = 0;
	let asked = 0;
	for (let index = 0; played < game.length || asked < adult.length; index++) {
		const gameNext = asked >= adult.length || (played < game.length && (picks[index] ?? true));
		const change = gameNext ? game[played++] : adult[asked++];
		if (change) steps.push({ by: gameNext ? 'game' : 'adult', change });
	}
	return steps;
}

function applyAll(profile: Profile, changes: readonly Change[]): Profile {
	return changes.reduce((current, change) => change(current), profile);
}

/**
 * A page as the routes are: it read the profile when it opened, keeps that copy, shows each of
 * its changes at once and stores them one by one; told by another page, it reads the profile again.
 */
interface Page {
	readonly store: ProfileStore;
	profile: Profile;
	/** Readings started by a notice of the other page. */
	readonly readings: Promise<void>[];
	commit(change: Change): Promise<void>;
}

async function openPage(store: ProfileStore, open: NoticeChannelFactory): Promise<Page> {
	const notices = createProfileNotices(open);
	const told = withNotices(store, notices);
	const page: Page = {
		store: told,
		profile: (await told.get(PROFILE_ID)) as Profile,
		readings: [],
		async commit(change) {
			page.profile = change(page.profile);
			const stored = await told.update(PROFILE_ID, change);
			if (stored !== null) page.profile = stored;
		}
	};
	notices.listen(() => {
		page.readings.push(
			told.get(PROFILE_ID).then((stored) => {
				if (stored !== null) page.profile = stored;
			})
		);
	});
	return page;
}

const changesArb = fc.record({
	game: fc.array(gameChangeArb, { maxLength: 6 }),
	adult: fc.array(adultChangeArb, { maxLength: 6 }),
	picks: fc.array(fc.boolean(), { maxLength: 12 }),
	otherPicks: fc.array(fc.boolean(), { maxLength: 12 })
});

let databaseCounter = 0;

const STORES: Readonly<Record<string, () => readonly [ProfileStore, ProfileStore]>> = {
	memory: () => {
		const store = createMemoryProfileStore();
		return [store, store];
	},
	// Two connections to the same database, as two tabs have.
	IndexedDB: () => {
		databaseCounter += 1;
		const databaseName = `two-pages-${databaseCounter}`;
		return [
			createIndexedDbProfileStore({ databaseName }),
			createIndexedDbProfileStore({ databaseName })
		];
	}
};

async function twoPages(kind: string) {
	const [first, second] = (STORES[kind] as () => readonly [ProfileStore, ProfileStore])();
	const initial = createProfile({ id: PROFILE_ID, name: 'Léa', now: 10, platform: 'pc' });
	await first.save(initial);
	const open = createNoticeHub();
	// Both pages read the profile now: from here on, each copy in memory may be out of date.
	const game = await openPage(first, open);
	const adult = await openPage(second, open);
	return { initial, game, adult, read: () => first.get(PROFILE_ID) };
}

describe.each(Object.keys(STORES))('two pages on the same profile (%s store)', (kind) => {
	const runs = kind === 'memory' ? 100 : 40;

	it('store what their changes give one after the other, in the order they were made', async () => {
		await fc.assert(
			fc.asyncProperty(changesArb, async ({ game, adult, picks }) => {
				const pages = await twoPages(kind);
				const steps = interleave(game, adult, picks);

				for (const step of steps) await pages[step.by].commit(step.change);

				expect(await pages.read()).toEqual(
					applyAll(
						pages.initial,
						steps.map((step) => step.change)
					)
				);
			}),
			{ numRuns: runs }
		);
	});

	it('lose no lesson and no setting, whatever the order that keeps the order of each page', async () => {
		await fc.assert(
			fc.asyncProperty(changesArb, async ({ game, adult, picks, otherPicks }) => {
				const pages = await twoPages(kind);
				for (const step of interleave(game, adult, picks)) {
					await pages[step.by].commit(step.change);
				}
				const others = await twoPages(kind);
				for (const step of interleave(game, adult, otherPicks)) {
					await others[step.by].commit(step.change);
				}

				const stored = (await pages.read()) as Profile;
				// The game and the adult space change different parts of the profile: any order
				// that keeps the order of each page gives the same profile, that of one page
				// after the other.
				expect(stored).toEqual(await others.read());
				expect(stored).toEqual(applyAll(applyAll(pages.initial, game), adult));
				expect(stored).toEqual(applyAll(applyAll(pages.initial, adult), game));
			}),
			{ numRuns: runs }
		);
	});

	it('lose nothing when both write at the same time, without waiting for each other', async () => {
		await fc.assert(
			fc.asyncProperty(changesArb, async ({ game, adult, picks }) => {
				const pages = await twoPages(kind);

				await Promise.all(
					interleave(game, adult, picks).map((step) => pages[step.by].commit(step.change))
				);

				expect(await pages.read()).toEqual(applyAll(applyAll(pages.initial, game), adult));
			}),
			{ numRuns: runs }
		);
	});

	it('both show the stored profile once each has heard the other', async () => {
		await fc.assert(
			fc.asyncProperty(changesArb, async ({ game, adult, picks }) => {
				const pages = await twoPages(kind);

				for (const step of interleave(game, adult, picks)) {
					await pages[step.by].commit(step.change);
					await Promise.all([...pages.game.readings, ...pages.adult.readings]);
				}

				const stored = await pages.read();
				expect(pages.game.profile).toEqual(stored);
				expect(pages.adult.profile).toEqual(stored);
			}),
			{ numRuns: runs }
		);
	});
});
