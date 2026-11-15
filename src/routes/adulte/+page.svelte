<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { findLesson } from '$lib/engine/progression/definition';
	import { gameTitle } from '$lib/games/labels';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { BACKUP_FILE_EXTENSION, backupFileName, exportBackup } from '$lib/state/backup';
	import { utcOffsetAt } from '$lib/state/journal';
	import {
		localDay,
		renameProfile,
		updateSettings,
		withAdultWords,
		withOpenedWorld
	} from '$lib/state/profile';
	import {
		createProfileNotices,
		withNotices,
		type ProfileNotices
	} from '$lib/state/profile-notices';
	import { readStorageProtection, requestStorageProtection } from '$lib/state/storage-persistence';
	import { createIndexedDbProfileStore, createMemoryProfileStore } from '$lib/state/stores';
	import type { Profile, ProfileStore, Settings } from '$lib/state/types';
	import { downloadTextFile } from '$lib/ui/download';
	import { isElidedBefore } from '$lib/ui/elision';
	import { progressionFor } from '../jouer/content';
	import { FREE_PRACTICE_RULES } from '../jouer/free-practice';
	import { forgetLastPlayerId, readLastPlayerId } from '../jouer/last-player';
	import { PLAY_RULES } from '../jouer/play-rules';
	import SettingsPanel from '../jouer/SettingsPanel.svelte';
	import AdultGate from './AdultGate.svelte';
	import AdultHome from './AdultHome.svelte';
	import { ADULT_RULES } from './adult-rules';
	import {
		readAdultCode,
		readLastBackupAt,
		writeLastBackupAt,
		type StoredCode
	} from './adult-storage';
	import ChildRemoval from './ChildRemoval.svelte';
	import ChildReport from './ChildReport.svelte';
	import { gateNumbersFor } from './content';
	import { CSV_FILE_EXTENSION, measuresCsv, type CsvFormat } from './csv';
	import { createFormatters } from './format';
	import { sortChildren } from './report';
	import SessionSheet from './SessionSheet.svelte';
	import { withHandwritingSample } from './target';

	type View =
		| { readonly name: 'loading' }
		| { readonly name: 'gate' }
		| { readonly name: 'home' }
		| { readonly name: 'child'; readonly id: string }
		/** The settings of one child, the same screen as in the game. */
		| { readonly name: 'settings'; readonly id: string }
		/** The session sheet of one child, to print. */
		| { readonly name: 'sheet'; readonly id: string }
		/** The confirmation asked before the profile of one child is deleted. */
		| { readonly name: 'removal'; readonly id: string };

	const JSON_TYPE = 'application/json';
	const CSV_TYPE = 'text/csv;charset=utf-8';

	const locale = getLocale();
	const format = createFormatters(locale);
	const collator = new Intl.Collator(locale);
	const gateNumbers = gateNumbersFor(locale).numbers;

	let view = $state.raw<View>({ name: 'loading' });
	let store: ProfileStore = createMemoryProfileStore();
	/** What the other pages of the app say of the profiles (a game going on in another tab). */
	let notices: ProfileNotices | null = null;
	let profiles = $state.raw<readonly Profile[]>([]);
	let memoryOnly = $state(false);
	let code = $state.raw<StoredCode>({ status: 'none' });
	let lastBackupAt = $state<number | null>(null);
	let fileStatus = $state('');
	let childrenStatus = $state('');
	/** Whether the browser promised to keep the data of the site; `null` while it is not known. */
	let storageProtected = $state<boolean | null>(null);
	let today = $state('');
	let settingsSave = $state<'idle' | 'saved' | 'error'>('idle');

	const children = $derived(sortChildren(profiles, collator.compare));
	const shown = $derived.by(() => {
		const current = view;
		if (!('id' in current)) return null;
		return profiles.find((profile) => profile.id === current.id) ?? null;
	});

	onMount(async () => {
		code = readAdultCode(ADULT_RULES.codeLength);
		lastBackupAt = readLastBackupAt();
		const now = Date.now();
		today = localDay(now, utcOffsetAt(now));
		view = { name: 'gate' };
		notices = createProfileNotices();
		notices.listen(() => void readAgain());
		store = withNotices(createIndexedDbProfileStore(), notices);
		try {
			profiles = await store.list();
		} catch {
			store = createMemoryProfileStore();
			memoryOnly = true;
		}
		storageProtected = (await readStorageProtection()) === 'protected';
	});

	onMount(() => () => notices?.close());

	/** Another page of the app changed the profiles (a lesson played in another tab): read them again. */
	async function readAgain() {
		try {
			profiles = await store.list();
		} catch {
			// The list stays as it was read last.
		}
	}

	/**
	 * An adult is here: the browser is asked again to keep the data, in case it would now. Nothing
	 * waits for its answer, and a refusal changes nothing on screen.
	 */
	function enter() {
		void show({ name: 'home' });
		if (memoryOnly || storageProtected === true) return;
		void requestStorageProtection().then((protection) => {
			if (protection === 'protected') storageProtected = true;
		});
	}

	/** Back on the player screen, nobody chosen: the last player is not opened again on its own. */
	function leave() {
		forgetLastPlayerId();
		void goto(resolve('/jouer'));
	}

	async function show(next: View) {
		fileStatus = '';
		childrenStatus = '';
		settingsSave = 'idle';
		view = next;
		await tick();
		window.scrollTo(0, 0);
	}

	function lessonTitle(lessonId: string): string {
		for (const profile of profiles) {
			const source = progressionFor(profile.settings.layoutId);
			const lesson = source ? findLesson(source, lessonId) : undefined;
			if (lesson) return lesson.title;
		}
		return lessonId;
	}

	function csvFormat(): CsvFormat {
		return {
			separator: m.adult_csv_separator(),
			formatNumber: format.number,
			yes: m.adult_csv_yes(),
			no: m.adult_csv_no(),
			headers: {
				child: m.adult_csv_child(),
				date: m.adult_csv_date(),
				time: m.adult_csv_time(),
				lesson: m.adult_csv_lesson(),
				game: m.adult_csv_game(),
				durationSeconds: m.adult_csv_duration(),
				keystrokes: m.adult_csv_keystrokes(),
				errors: m.adult_csv_errors(),
				accuracy: m.adult_csv_accuracy(),
				wordsPerMinute: m.adult_csv_speed(),
				charsPerMinute: m.adult_csv_speed_chars(),
				readingTimeCounted: m.adult_csv_reading_time(),
				stars: m.adult_csv_stars(),
				passed: m.adult_csv_passed()
			},
			lessonTitle,
			gameTitle
		};
	}

	function fileName(prefix: string, playerName: string | null, at: number, extension: string) {
		const name = backupFileName({
			prefix,
			playerName,
			exportedAt: at,
			utcOffsetMinutes: utcOffsetAt(at)
		});
		return name.slice(0, name.length - BACKUP_FILE_EXTENSION.length) + extension;
	}

	function download(name: string, text: string, type: string): boolean {
		try {
			downloadTextFile(name, text, type);
			fileStatus = m.adult_downloaded({ file: name });
			return true;
		} catch {
			fileStatus = m.adult_download_failed();
			return false;
		}
	}

	/** `child`: the measures of one child; `null`: of all of them. */
	function downloadMeasures(child: Profile | null) {
		const now = Date.now();
		const prefix = m.adult_measures_file_prefix({ appName: m.app_name() });
		const list = child ? [child] : children;
		download(
			fileName(prefix, child?.name ?? null, now, CSV_FILE_EXTENSION),
			measuresCsv(list, csvFormat()),
			CSV_TYPE
		);
	}

	function downloadBackup(child: Profile | null) {
		const now = Date.now();
		const list = child ? [child] : children;
		let text: string;
		try {
			text = exportBackup(list, now);
		} catch {
			fileStatus = m.adult_download_failed();
			return;
		}
		const name = fileName(m.app_name(), child?.name ?? null, now, BACKUP_FILE_EXTENSION);
		if (download(name, text, JSON_TYPE) && writeLastBackupAt(now)) lastBackupAt = now;
	}

	/** The profiles of a backup file, stored all or none: `false` when the device refused them. */
	async function importProfiles(saved: readonly Profile[]): Promise<boolean> {
		try {
			await store.saveAll(saved);
		} catch {
			return false;
		}
		const ids = new Set(saved.map((profile) => profile.id));
		profiles = [...profiles.filter((profile) => !ids.has(profile.id)), ...saved];
		return true;
	}

	/**
	 * Stores one change of a profile, made from the profile as the device holds it now, never from
	 * the copy shown here: a lesson played meanwhile in another tab is not written over. `false`
	 * when the device refused, or when the profile is no longer there.
	 */
	async function change(child: Profile, apply: (current: Profile) => Profile): Promise<boolean> {
		let stored: Profile | null;
		try {
			stored = await store.update(child.id, apply);
		} catch {
			return false;
		}
		if (stored === null) return false;
		const kept = stored;
		profiles = profiles.map((profile) => (profile.id === kept.id ? kept : profile));
		return true;
	}

	async function openWorld(child: Profile, worldId: string): Promise<boolean> {
		return change(child, (current) => withOpenedWorld(current, worldId));
	}

	async function saveWords(child: Profile, words: readonly string[]): Promise<boolean> {
		return change(child, (current) => withAdultWords(current, words));
	}

	async function changeSettings(child: Profile, patch: Partial<Settings>) {
		const saved = await change(child, (current) => updateSettings(current, patch));
		settingsSave = saved ? 'saved' : 'error';
	}

	async function measure(child: Profile, wordsPerMinute: number): Promise<boolean> {
		const sample = { measuredAt: Date.now(), wordsPerMinute };
		return change(child, (current) => withHandwritingSample(current, sample));
	}

	async function rename(child: Profile, name: string): Promise<boolean> {
		return change(child, (current) => renameProfile(current, name));
	}

	/** Deletes the profile and its journal for good, after the confirmation of the adult. */
	async function remove(child: Profile): Promise<boolean> {
		try {
			await store.remove(child.id);
		} catch {
			return false;
		}
		// The game does not open again on a player who is no longer there.
		if (readLastPlayerId() === child.id) forgetLastPlayerId();
		profiles = profiles.filter((profile) => profile.id !== child.id);
		await show({ name: 'home' });
		childrenStatus = isElidedBefore(child.name)
			? m.adult_delete_done_elided({ name: child.name })
			: m.adult_delete_done({ name: child.name });
		return true;
	}
</script>

<svelte:head>
	<title>{m.adult_page_title({ appName: m.app_name() })}</title>
</svelte:head>

<main>
	{#if view.name === 'loading'}
		<p class="loading" role="status">{m.adult_loading()}</p>
	{:else if view.name === 'gate'}
		<AdultGate
			numbers={gateNumbers}
			rng={Math.random}
			{code}
			codeLength={ADULT_RULES.codeLength}
			onenter={enter}
			onleave={leave}
		/>
	{:else if view.name === 'child' && shown}
		{@const child = shown}
		<ChildReport
			profile={child}
			progression={progressionFor(child.settings.layoutId)}
			rules={ADULT_RULES}
			freeRules={FREE_PRACTICE_RULES}
			{format}
			{today}
			{lessonTitle}
			{fileStatus}
			onmeasure={(wordsPerMinute) => measure(child, wordsPerMinute)}
			onopenworld={(worldId) => openWorld(child, worldId)}
			onsavewords={(words) => saveWords(child, words)}
			onsettings={() => show({ name: 'settings', id: child.id })}
			onsheet={() => show({ name: 'sheet', id: child.id })}
			onmeasures={() => downloadMeasures(child)}
			onbackup={() => downloadBackup(child)}
			onrename={(name) => rename(child, name)}
			ondelete={() => show({ name: 'removal', id: child.id })}
			onback={() => show({ name: 'home' })}
		/>
	{:else if view.name === 'removal' && shown}
		{@const child = shown}
		<ChildRemoval
			profile={child}
			{fileStatus}
			onbackup={() => downloadBackup(child)}
			onconfirm={() => remove(child)}
			oncancel={() => show({ name: 'child', id: child.id })}
		/>
	{:else if view.name === 'sheet' && shown}
		{@const child = shown}
		<SessionSheet
			profile={child}
			progression={progressionFor(child.settings.layoutId)}
			rules={ADULT_RULES}
			playRules={PLAY_RULES}
			{format}
			{today}
			onback={() => show({ name: 'child', id: child.id })}
		/>
	{:else if view.name === 'settings' && shown}
		{@const child = shown}
		{@const elided = isElidedBefore(child.name)}
		<SettingsPanel
			settings={child.settings}
			saveState={settingsSave}
			title={elided
				? m.adult_settings_title_elided({ name: child.name })
				: m.adult_settings_title({ name: child.name })}
			backLabel={elided
				? m.adult_settings_back_elided({ name: child.name })
				: m.adult_settings_back({ name: child.name })}
			adult
			onchange={(patch) => changeSettings(child, patch)}
			onback={() => show({ name: 'child', id: child.id })}
		/>
	{:else}
		<AdultHome
			profiles={children}
			{memoryOnly}
			codeLength={ADULT_RULES.codeLength}
			{format}
			{lastBackupAt}
			{storageProtected}
			maxBackupFileBytes={ADULT_RULES.maxBackupFileBytes}
			{fileStatus}
			{childrenStatus}
			onopen={(child) => show({ name: 'child', id: child.id })}
			onmeasures={() => downloadMeasures(null)}
			onbackup={() => downloadBackup(null)}
			onimport={importProfiles}
			onleave={leave}
		/>
	{/if}
</main>

<style>
	/*
	 * The title and the way out name the child: a long nickname without a space is cut rather than
	 * wider than the page (320 pixels).
	 */
	main :global(h1),
	main :global([data-screen-back] button) {
		overflow-wrap: anywhere;
	}

	.loading {
		padding: var(--dd-space-xl);
		text-align: center;
	}
</style>
