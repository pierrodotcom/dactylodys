<script lang="ts">
	import { onMount } from 'svelte';
	import {
		evaluateLesson,
		applyLessonResult,
		isLessonUnlocked
	} from '$lib/engine/progression/progress';
	import { findLesson, lessonIds } from '$lib/engine/progression/definition';
	import { generateExercise } from '$lib/engine/progression/exercise';
	import type { Exercise, StarCount } from '$lib/engine/progression/types';
	import { Hatching } from '$lib/games/hatching';
	import type { GameOutcome } from '$lib/games/types';
	import type { LayoutId } from '$lib/keyboard/layout-ids';
	import { m } from '$lib/paraglide/messages.js';
	import { applySettings } from '$lib/state/apply-settings';
	import {
		createProfile,
		defaultSettings,
		markCalibrated,
		updateSettings,
		withProgress
	} from '$lib/state/profile';
	import { createIndexedDbProfileStore, createMemoryProfileStore } from '$lib/state/stores';
	import type { Profile, ProfileStore, Settings } from '$lib/state/types';
	import { loadKeyboardAssets, type KeyboardAssets } from './assets';
	import BreakScreen from './BreakScreen.svelte';
	import {
		createPlayClock,
		playedMsAt,
		shouldSuggestBreak,
		startPlaying,
		stopPlaying
	} from './break';
	import { progressionFor } from './content';
	import { INITIAL_SCREEN, transition, type FlowEvent, type Screen } from './flow';
	import { toGameSettings } from './game-settings';
	import KeyboardCheck from './KeyboardCheck.svelte';
	import { forgetLastPlayerId, readLastPlayerId, writeLastPlayerId } from './last-player';
	import LessonIntro from './LessonIntro.svelte';
	import LessonResult from './LessonResult.svelte';
	import { nextLessonId } from './map';
	import NewPlayer from './NewPlayer.svelte';
	import { platformFromUserAgent } from './player';
	import PlayerSelect from './PlayerSelect.svelte';
	import { PLAY_RULES } from './play-rules';
	import SettingsPanel from './SettingsPanel.svelte';
	import { createProfileSounds } from './sounds';
	import { summarizeMetrics, type ResultSummary } from './summary';
	import WorldMap from './WorldMap.svelte';

	interface ResultView {
		readonly lessonId: string;
		readonly stars: StarCount;
		readonly summary: ResultSummary;
		readonly hasOpenNext: boolean;
		readonly worldDone: boolean;
		readonly suggestBreak: boolean;
		readonly saveFailed: boolean;
	}

	let screen = $state.raw<Screen>(INITIAL_SCREEN);
	let store: ProfileStore = createMemoryProfileStore();
	let profiles = $state.raw<readonly Profile[]>([]);
	let profile = $state.raw<Profile | null>(null);
	let assets = $state.raw<KeyboardAssets | null>(null);
	let exercise = $state.raw<Exercise | null>(null);
	let result = $state.raw<ResultView | null>(null);
	let playClock = createPlayClock();
	let memoryOnly = $state(false);
	let loadFailed = $state(false);
	let saveState = $state<'idle' | 'saved' | 'error'>('idle');
	let systemPrefersReduced = $state(false);

	const sounds = createProfileSounds(() => profile?.settings ?? null);
	const progression = $derived(profile ? progressionFor(profile.settings.layoutId) : undefined);

	function go(event: FlowEvent) {
		screen = transition(screen, event);
	}

	function now(): number {
		return performance.now();
	}

	onMount(async () => {
		systemPrefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		store = createIndexedDbProfileStore();
		try {
			profiles = await store.list();
		} catch {
			store = createMemoryProfileStore();
			memoryOnly = true;
		}
		if (!(await resumeLastPlayer())) go({ type: 'profiles-loaded' });
	});

	onMount(() => () => sounds.dispose());

	async function resumeLastPlayer(): Promise<boolean> {
		const lastId = readLastPlayerId();
		if (lastId === null) return false;
		const last = profiles.find((item) => item.id === lastId);
		if (!last) {
			forgetLastPlayerId();
			return false;
		}
		return enter(last);
	}

	$effect(() => {
		applySettings(profile?.settings ?? defaultSettings('pc'), document.documentElement);
	});

	/** Keeps the new version in memory first, so that the game goes on even if the device refuses to store it. */
	async function commit(next: Profile): Promise<boolean> {
		profile = next;
		profiles = profiles.some((item) => item.id === next.id)
			? profiles.map((item) => (item.id === next.id ? next : item))
			: [...profiles, next];
		try {
			await store.save(next);
			return true;
		} catch {
			return false;
		}
	}

	async function enter(chosen: Profile): Promise<boolean> {
		loadFailed = false;
		try {
			assets = await loadKeyboardAssets(chosen.settings);
		} catch {
			loadFailed = true;
			return false;
		}
		profile = chosen;
		writeLastPlayerId(chosen.id);
		go({ type: 'player-chosen', calibrated: chosen.calibrated });
		return true;
	}

	async function createPlayer(name: string): Promise<boolean> {
		const created = createProfile({
			id: crypto.randomUUID(),
			name,
			now: Date.now(),
			platform: platformFromUserAgent(navigator.userAgent)
		});
		if (!(await commit(created))) return false;
		return enter(created);
	}

	function changePlayer() {
		profile = null;
		assets = null;
		saveState = 'idle';
		go({ type: 'change-player' });
	}

	async function changeSettings(patch: Partial<Settings>) {
		if (!profile) return;
		const next = updateSettings(profile, patch);
		if (patch.layoutId !== undefined || patch.fingeringProfileId !== undefined) {
			try {
				assets = await loadKeyboardAssets(next.settings);
			} catch {
				loadFailed = true;
				return;
			}
		}
		saveState = (await commit(next)) ? 'saved' : 'error';
	}

	async function chooseKeyboardLayout(layoutId: LayoutId) {
		await changeSettings({ layoutId });
	}

	async function finishKeyboardCheck() {
		if (profile) await commit(markCalibrated(profile));
		go({ type: 'keyboard-checked' });
	}

	function openSettings() {
		saveState = 'idle';
		go({ type: 'open-settings' });
	}

	function openLesson(lessonId: string) {
		if (!profile || !progression) return;
		go({
			type: 'open-lesson',
			lessonId,
			unlocked: isLessonUnlocked(progression, profile.progress, lessonId)
		});
	}

	function beginGame(lessonId: string, event: FlowEvent) {
		if (!progression) return;
		exercise = generateExercise(progression, lessonId, Math.random);
		playClock = startPlaying(playClock, now());
		go(event);
	}

	function quitGame() {
		playClock = stopPlaying(playClock, now());
		go({ type: 'quit' });
	}

	async function finishGame(lessonId: string, outcome: GameOutcome) {
		if (!profile || !progression) return;
		playClock = stopPlaying(playClock, now());
		const evaluation = evaluateLesson(progression.rules, outcome.metrics);
		const progress = applyLessonResult(profile.progress, {
			lessonId,
			metrics: outcome.metrics,
			evaluation,
			completedAt: Date.now()
		});
		const next = withProgress(profile, progress);
		const followingId = nextLessonId(progression, lessonId);
		const hasOpenNext =
			followingId !== null && isLessonUnlocked(progression, progress, followingId);
		const ids = lessonIds(progression);
		result = {
			lessonId,
			stars: evaluation.stars,
			summary: summarizeMetrics(outcome.metrics),
			hasOpenNext,
			worldDone: followingId === null && ids.includes(lessonId) && evaluation.unlocksNext,
			suggestBreak: shouldSuggestBreak(playedMsAt(playClock, now()), PLAY_RULES),
			saveFailed: false
		};
		go({ type: 'completed' });
		if (!(await commit(next)) && result) result = { ...result, saveFailed: true };
	}

	function takeBreak() {
		playClock = createPlayClock();
		go({ type: 'take-break' });
	}

	function playNext() {
		if (!progression || !result) return;
		const followingId = nextLessonId(progression, result.lessonId);
		if (followingId !== null) go({ type: 'next-lesson', lessonId: followingId });
	}
</script>

<svelte:head>
	<title>{m.play_page_title()}</title>
</svelte:head>

<main>
	{#if screen.name === 'loading'}
		<p class="loading" role="status">{m.play_loading()}</p>
	{:else if screen.name === 'players'}
		<PlayerSelect
			{profiles}
			{memoryOnly}
			{loadFailed}
			onchoose={enter}
			onnew={() => go({ type: 'new-player' })}
		/>
	{:else if screen.name === 'new-player'}
		<NewPlayer oncreate={createPlayer} onback={() => go({ type: 'cancel-new-player' })} />
	{:else if !profile || !assets || !progression}
		<p class="loading" role="alert">{m.play_error_content()}</p>
	{:else if screen.name === 'keyboard-check'}
		<KeyboardCheck
			layoutId={profile.settings.layoutId}
			codes={PLAY_RULES.keyboardCheckCodes}
			onlayout={chooseKeyboardLayout}
			ondone={finishKeyboardCheck}
			onchangeplayer={changePlayer}
		/>
	{:else if screen.name === 'map'}
		<WorldMap
			{profile}
			{progression}
			onopen={openLesson}
			onsettings={openSettings}
			onchangeplayer={changePlayer}
		/>
	{:else if screen.name === 'settings'}
		<SettingsPanel
			settings={profile.settings}
			{saveState}
			onchange={changeSettings}
			onback={() => go({ type: 'close-settings' })}
		/>
	{:else if screen.name === 'intro'}
		{@const lesson = findLesson(progression, screen.lessonId)}
		{@const lessonId = screen.lessonId}
		{#if lesson}
			<LessonIntro
				{lesson}
				number={lessonIds(progression).indexOf(lessonId) + 1}
				{assets}
				onstart={() => beginGame(lessonId, { type: 'start' })}
				onback={() => go({ type: 'back-to-map' })}
			/>
		{/if}
	{:else if screen.name === 'game'}
		{@const lessonId = screen.lessonId}
		{#if exercise}
			<Hatching
				{exercise}
				layout={assets.layout}
				charIndex={assets.charIndex}
				geometry={assets.geometry}
				fingering={assets.fingering}
				settings={toGameSettings(profile.settings, systemPrefersReduced)}
				{sounds}
				onComplete={(outcome) => finishGame(lessonId, outcome)}
				onQuit={quitGame}
			/>
		{/if}
	{:else if screen.name === 'result' && result}
		{@const lessonId = screen.lessonId}
		<LessonResult
			stars={result.stars}
			summary={result.summary}
			hasOpenNext={result.hasOpenNext}
			worldDone={result.worldDone}
			suggestBreak={result.suggestBreak}
			saveFailed={result.saveFailed}
			onnext={playNext}
			onreplay={() => beginGame(lessonId, { type: 'replay' })}
			onmap={() => go({ type: 'back-to-map' })}
			onbreak={takeBreak}
		/>
	{:else if screen.name === 'break'}
		<BreakScreen onreturn={() => go({ type: 'back-to-map' })} />
	{/if}
</main>

<style>
	main {
		min-block-size: var(--dd-size-viewport-full);
	}

	.loading {
		display: grid;
		place-content: center;
		min-block-size: var(--dd-size-viewport-full);
		font-size: var(--dd-font-size-xl);
	}
</style>
