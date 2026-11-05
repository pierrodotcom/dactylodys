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
	import { localDay, updateSettings, withAdultWords, withOpenedWorld } from '$lib/state/profile';
	import { createIndexedDbProfileStore, createMemoryProfileStore } from '$lib/state/stores';
	import type { Profile, ProfileStore, Settings } from '$lib/state/types';
	import { downloadTextFile } from '$lib/ui/download';
	import { progressionFor } from '../jouer/content';
	import { FREE_PRACTICE_RULES } from '../jouer/free-practice';
	import { forgetLastPlayerId } from '../jouer/last-player';
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
	import ChildReport from './ChildReport.svelte';
	import { gateNumbersFor } from './content';
	import { CSV_FILE_EXTENSION, measuresCsv, type CsvFormat } from './csv';
	import { createFormatters } from './format';
	import { sortChildren } from './report';
	import { withHandwritingSample } from './target';

	type View =
		| { readonly name: 'loading' }
		| { readonly name: 'gate' }
		| { readonly name: 'home' }
		| { readonly name: 'child'; readonly id: string }
		/** The settings of one child, the same screen as in the game. */
		| { readonly name: 'settings'; readonly id: string };

	const JSON_TYPE = 'application/json';
	const CSV_TYPE = 'text/csv;charset=utf-8';

	const locale = getLocale();
	const format = createFormatters(locale);
	const collator = new Intl.Collator(locale);
	const gateNumbers = gateNumbersFor(locale).numbers;

	let view = $state.raw<View>({ name: 'loading' });
	let store: ProfileStore = createMemoryProfileStore();
	let profiles = $state.raw<readonly Profile[]>([]);
	let memoryOnly = $state(false);
	let code = $state.raw<StoredCode>({ status: 'none' });
	let lastBackupAt = $state<number | null>(null);
	let fileStatus = $state('');
	let today = $state('');
	let settingsSave = $state<'idle' | 'saved' | 'error'>('idle');

	const children = $derived(sortChildren(profiles, collator.compare));
	const shown = $derived.by(() => {
		const current = view;
		if (current.name !== 'child' && current.name !== 'settings') return null;
		return profiles.find((profile) => profile.id === current.id) ?? null;
	});

	onMount(async () => {
		code = readAdultCode(ADULT_RULES.codeLength);
		lastBackupAt = readLastBackupAt();
		const now = Date.now();
		today = localDay(now, utcOffsetAt(now));
		view = { name: 'gate' };
		store = createIndexedDbProfileStore();
		try {
			profiles = await store.list();
		} catch {
			store = createMemoryProfileStore();
			memoryOnly = true;
		}
	});

	/** Back on the player screen, nobody chosen: the last player is not opened again on its own. */
	function leave() {
		forgetLastPlayerId();
		void goto(resolve('/jouer'));
	}

	async function show(next: View) {
		fileStatus = '';
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

	/** Kept in memory first, then stored: `false` when the device refused one of them. */
	async function saveProfiles(saved: readonly Profile[]): Promise<boolean> {
		const ids = new Set(saved.map((profile) => profile.id));
		profiles = [...profiles.filter((profile) => !ids.has(profile.id)), ...saved];
		try {
			for (const profile of saved) await store.save(profile);
			return true;
		} catch {
			return false;
		}
	}

	async function openWorld(child: Profile, worldId: string): Promise<boolean> {
		return saveProfiles([withOpenedWorld(child, worldId)]);
	}

	async function saveWords(child: Profile, words: readonly string[]): Promise<boolean> {
		return saveProfiles([withAdultWords(child, words)]);
	}

	async function changeSettings(child: Profile, patch: Partial<Settings>) {
		settingsSave = (await saveProfiles([updateSettings(child, patch)])) ? 'saved' : 'error';
	}

	async function measure(child: Profile, wordsPerMinute: number): Promise<boolean> {
		const next = withHandwritingSample(child, { measuredAt: Date.now(), wordsPerMinute });
		return saveProfiles([next]);
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
			onenter={() => show({ name: 'home' })}
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
			onmeasures={() => downloadMeasures(child)}
			onbackup={() => downloadBackup(child)}
			onback={() => show({ name: 'home' })}
		/>
	{:else if view.name === 'settings' && shown}
		{@const child = shown}
		<SettingsPanel
			settings={child.settings}
			saveState={settingsSave}
			title={m.adult_settings_title({ name: child.name })}
			backLabel={m.adult_settings_back({ name: child.name })}
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
			{fileStatus}
			onopen={(child) => show({ name: 'child', id: child.id })}
			onmeasures={() => downloadMeasures(null)}
			onbackup={() => downloadBackup(null)}
			onimport={saveProfiles}
			onleave={leave}
		/>
	{/if}
</main>

<style>
	.loading {
		padding: var(--dd-space-xl);
		text-align: center;
	}
</style>
