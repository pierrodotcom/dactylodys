<script lang="ts">
	import { onMount, tick, type Component } from 'svelte';
	import { resolve } from '$app/paths';
	import { createVoicePlayer, loadVoiceManifest, type VoicePlayer } from '$lib/audio';
	import { voiceLocale } from '$lib/audio/voice-texts';
	import { almostNextStar, isLessonUnlocked } from '$lib/engine/progression/progress';
	import { findLesson, freshChars, lessonIds } from '$lib/engine/progression/definition';
	import { guideMode } from '$lib/engine/progression/guide';
	import { passedLessonCount, unlockedScenes } from '$lib/engine/rewards/scenes';
	import { generateExercise } from '$lib/engine/progression/exercise';
	import {
		storyAfterLesson,
		storyBeforeLesson,
		storySoFar,
		type StoryMoment
	} from '$lib/engine/story';
	import {
		generateHelpExercise,
		helpQuestFor,
		ownedRewards,
		resolveCompanion,
		type CompanionChoice,
		type HelpQuest,
		type RewardDefinition
	} from '$lib/engine/rewards';
	import type {
		Exercise,
		ProgressionDefinition,
		StarCount,
		WorldDefinition
	} from '$lib/engine/progression/types';
	import type { GameDefinition, GameGuide, GameOutcome, GameProps } from '$lib/games/types';
	import type { LayoutId } from '$lib/keyboard/layout-ids';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { applySettings } from '$lib/state/apply-settings';
	import {
		createProfile,
		defaultSettings,
		markCalibrated,
		updateSettings,
		withCompanion,
		withLastGame
	} from '$lib/state/profile';
	import { createIndexedDbProfileStore, createMemoryProfileStore } from '$lib/state/stores';
	import type { Profile, ProfileStore, Settings } from '$lib/state/types';
	import { provideCompanionAppearance } from '$lib/ui/companion/appearance';
	import { loadKeyboardAssets, type KeyboardAssets } from './assets';
	import { loadBanks, settleWithin, type LoadedBanks } from './banks';
	import BreakScreen from './BreakScreen.svelte';
	import {
		createPlayClock,
		finishPlaying,
		shouldSuggestBreak,
		startPlaying,
		stopPlaying
	} from './break';
	import {
		appearanceOf,
		earnRewards,
		keyLabel,
		prizeOfLesson,
		recordHelpOutcome,
		shouldAskName,
		wearItem
	} from './companion';
	import CompanionPanel from './CompanionPanel.svelte';
	import { progressionFor } from './content';
	import {
		INITIAL_SCREEN,
		transition,
		type FlowEvent,
		type Screen,
		type StoryDestination
	} from './flow';
	import { gameForLesson, gameOptions } from './game-choice';
	import HelpThanks from './HelpThanks.svelte';
	import { isMotionReduced, toGameSettings } from './game-settings';
	import { SCENE_SCHEDULE } from './scenes';
	import { findGame } from '$lib/games/registry';
	import KeyboardCheck from './KeyboardCheck.svelte';
	import { forgetLastPlayerId, readLastPlayerId, writeLastPlayerId } from './last-player';
	import LessonIntro from './LessonIntro.svelte';
	import { recordLessonOutcome } from './lesson-outcome';
	import LessonResult from './LessonResult.svelte';
	import { nextLessonId, worldOfLesson } from './map';
	import NewPlayer from './NewPlayer.svelte';
	import { platformFromUserAgent } from './player';
	import PlayerSelect from './PlayerSelect.svelte';
	import { PLAY_RULES } from './play-rules';
	import RewardNews from './RewardNews.svelte';
	import { HELP_QUEST_RULES, rewardCatalogueFor } from './rewards';
	import SettingsPanel from './SettingsPanel.svelte';
	import { createProfileSounds } from './sounds';
	import { storyFor } from './story';
	import StoryScreen from './StoryScreen.svelte';
	import StorySoFar from './StorySoFar.svelte';
	import { summarizeMetrics, type ResultSummary } from './summary';
	import TopBar from './TopBar.svelte';
	import WorldMap from './WorldMap.svelte';

	/** Screens with the bar of the player and the settings at the top: never during a game. */
	const TOP_BAR_SCREENS: ReadonlySet<Screen['name']> = new Set([
		'map',
		'intro',
		'result',
		'break',
		'help-done'
	]);
	const NO_REWARDS: ReadonlySet<string> = new Set();

	interface ResultView {
		readonly lessonId: string;
		readonly stars: StarCount;
		readonly summary: ResultSummary;
		readonly hasOpenNext: boolean;
		readonly worldDone: boolean;
		readonly suggestBreak: boolean;
		/** Stopped just short of the next star. */
		readonly almost: boolean;
		readonly saveFailed: boolean;
		/** What this play earned, announced one card after the other. */
		readonly rewards: readonly RewardDefinition[];
		/** The lesson is passed and the companion has no name yet. */
		readonly askName: boolean;
		/** What this play won of the story, told when the child leaves the result (ADR-042). */
		readonly story: readonly StoryMoment[];
	}

	interface HelpDoneView {
		readonly rewards: readonly RewardDefinition[];
		readonly dance: number;
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
	let ActiveGame = $state.raw<Component<GameProps> | null>(null);
	let activeGameId = $state('');
	let gameLoadFailed = $state(false);
	/** The help quest being played. */
	let helpRun = $state.raw<HelpQuest | null>(null);
	let helpDone = $state.raw<HelpDoneView | null>(null);
	/** "Later" to the name of the companion: not asked again during this visit. */
	let nameLater = $state(false);
	let companionSaveFailed = $state(false);

	const sounds = createProfileSounds(() => profile?.settings ?? null);
	const progression = $derived(profile ? progressionFor(profile.settings.layoutId) : undefined);
	const catalogue = $derived(progression ? rewardCatalogueFor(progression) : undefined);
	const story = $derived(progression ? storyFor(progression) : undefined);
	/** What the child owns: what the profile kept, and what the progress earns (ADR-027). */
	const owned = $derived(
		profile && progression && catalogue
			? ownedRewards(catalogue, progression, profile.progress, profile.earnedRewardIds)
			: NO_REWARDS
	);
	const look = $derived(
		profile && catalogue ? resolveCompanion(catalogue, owned, profile.companion) : null
	);
	const wornIds = $derived(look?.items.map((item) => item.id) ?? []);
	const appearance = $derived(appearanceOf(look));
	// Every companion of the route, on every screen and in every game, wears the same things.
	provideCompanionAppearance(() => appearance);
	const helpQuest = $derived(
		profile && progression
			? helpQuestFor(progression, profile.progress, HELP_QUEST_RULES, profile.helpQuest)
			: null
	);
	const askNameNow = $derived(
		result !== null &&
			result.askName &&
			profile !== null &&
			shouldAskName(true, profile.companion.name, nameLater)
	);

	let banksRequest: { progression: ProgressionDefinition; ready: Promise<LoadedBanks> } | null =
		null;

	/** Starts loading the banks of the progression once; they are awaited only when a game starts. */
	function requestBanks(source: ProgressionDefinition): Promise<LoadedBanks> {
		if (banksRequest?.progression !== source) {
			banksRequest = { progression: source, ready: loadBanks(source) };
		}
		return banksRequest.ready;
	}

	$effect(() => {
		if (progression) void requestBanks(progression);
	});

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

	const SILENT_VOICE = createVoicePlayer({ manifest: null, baseUrl: '', isEnabled: () => false });
	/** The recorded voice of the language of the lessons; silent until its files are found, or without them. */
	let voice = $state.raw<VoicePlayer>(SILENT_VOICE);

	$effect(() => {
		if (!progression) return;
		const baseUrl = `${resolve('/')}voice/${voiceLocale(progression)}/`;
		let cancelled = false;
		let created: VoicePlayer | undefined;
		void loadVoiceManifest(fetch, baseUrl)
			.catch(() => null)
			.then((manifest) => {
				if (cancelled) return;
				created = createVoicePlayer({
					manifest,
					baseUrl,
					isEnabled: () => profile?.settings.voiceEnabled ?? false
				});
				voice = created;
			});
		return () => {
			cancelled = true;
			created?.dispose();
			voice = SILENT_VOICE;
		};
	});

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
		profile = withEarnedSoFar(chosen);
		writeLastPlayerId(chosen.id);
		go({ type: 'player-chosen', calibrated: chosen.calibrated });
		return true;
	}

	/**
	 * What the progress already earns goes into the profile without being announced. It is kept
	 * in memory and stored with the next change: opening a profile never rewrites its record.
	 */
	function withEarnedSoFar(chosen: Profile): Profile {
		const source = progressionFor(chosen.settings.layoutId);
		if (!source) return chosen;
		return earnRewards(chosen, rewardCatalogueFor(source), source).profile;
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
		nameLater = false;
		helpRun = null;
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

	/**
	 * Where the screen was scrolled when the settings opened. The settings start at their top and,
	 * once closed, give the screen back its own position: neither scroll leaks into the other.
	 */
	let scrollBeforeSettings = 0;

	async function openSettings() {
		saveState = 'idle';
		// A game left for the settings comes back to its lesson screen, which starts at the top.
		scrollBeforeSettings = screen.name === 'game' ? 0 : window.scrollY;
		if (screen.name === 'game') playClock = stopPlaying(playClock, now());
		go({ type: 'open-settings' });
		await tick();
		window.scrollTo(0, 0);
	}

	async function closeSettings() {
		go({ type: 'close-settings' });
		await tick();
		window.scrollTo(0, scrollBeforeSettings);
	}

	function openCompanion() {
		companionSaveFailed = false;
		go({ type: 'open-companion' });
	}

	/** Every choice about the companion is kept at once. */
	async function saveCompanion(choice: CompanionChoice) {
		if (!profile) return;
		let next: Profile;
		try {
			next = withCompanion(profile, choice);
		} catch {
			return;
		}
		companionSaveFailed = !(await commit(next));
	}

	function wear(item: RewardDefinition) {
		if (profile && catalogue) void saveCompanion(wearItem(profile.companion, catalogue, item.id));
	}

	function nameCompanion(name: string) {
		if (profile) void saveCompanion({ ...profile.companion, name });
	}

	function openLesson(lessonId: string) {
		if (!profile || !progression) return;
		gameLoadFailed = false;
		if (!isLessonUnlocked(progression, profile.progress, lessonId)) return;
		go({ type: 'tell', moments: openingOf(lessonId), then: { name: 'intro', lessonId } });
	}

	/** The opening of the world of the lesson, while the child has played none of its lessons. */
	function openingOf(lessonId: string): readonly StoryMoment[] {
		if (!profile || !progression || !story) return [];
		return storyBeforeLesson(story, progression, profile.progress, lessonId);
	}

	/** Leaves the result: what the play won of the story is told first. */
	function leaveResult(then: StoryDestination) {
		const moments = result?.story ?? [];
		if (then.name === 'replay' && moments.length === 0) {
			void beginGame(then.lessonId, { type: 'replay' });
			return;
		}
		if (then.name === 'break') playClock = createPlayClock();
		go({ type: 'tell', moments, then });
	}

	function continueStory() {
		if (screen.name !== 'story') return;
		// "Continue" may have scrolled a small screen: the next screen starts from its top.
		window.scrollTo({ top: 0 });
		const last = screen.index + 1 >= screen.moments.length;
		if (last && screen.then.name === 'replay') {
			void beginGame(screen.then.lessonId, { type: 'replay' });
			return;
		}
		go({ type: 'story-next' });
	}

	function worldTitle(worldId: string): string {
		return progression?.worlds.find((world) => world.id === worldId)?.title ?? '';
	}

	/** The choice is kept in the profile, so that the child finds the same game at the next visit. */
	function chooseGame(worldId: string, lessonId: string, gameId: string) {
		gameLoadFailed = false;
		if (profile) void commit(withGames(profile, worldId, lessonId, gameId));
	}

	/** A picture of a game was chosen on the lesson screen: it is kept, and the lesson starts with it. */
	function playLesson(worldId: string, lessonId: string, gameId: string) {
		chooseGame(worldId, lessonId, gameId);
		void beginGame(lessonId, { type: 'start' }, gameId);
	}

	/** The game is kept for the world and for the lesson, so that a return finds it. */
	function withGames(current: Profile, worldId: string, lessonId: string, gameId: string): Profile {
		return withLastGame(withLastGame(current, worldId, gameId), lessonId, gameId);
	}

	function gameFor(world: WorldDefinition, lessonId: string, current: Profile) {
		return gameForLesson(world, lessonId, current.lastGameByWorld);
	}

	/** What the hand on the keyboard shows in this lesson, for this child. */
	function guideFor(current: Profile, lessonId: string): GameGuide {
		if (!progression) return { mode: 'none', freshChars: [], hesitationMs: 0 };
		const number = lessonIds(progression).indexOf(lessonId) + 1;
		return {
			mode: guideMode(progression.rules, number, current.settings.handGuide),
			freshChars: freshChars(progression, lessonId),
			hesitationMs: progression.rules.handGuide?.hesitationMs ?? 0
		};
	}

	/** Loads the game and the banks; `null` when the game could not be loaded. */
	async function loadGame(
		definition: GameDefinition,
		source: ProgressionDefinition
	): Promise<LoadedBanks | null> {
		try {
			const [module, loaded] = await Promise.all([
				definition.load(),
				settleWithin(requestBanks(source), PLAY_RULES.bankLoadTimeoutMs, {})
			]);
			ActiveGame = module.default;
			activeGameId = definition.id;
			gameLoadFailed = false;
			return loaded;
		} catch {
			gameLoadFailed = true;
			return null;
		}
	}

	/** `gameId`: the picture the child took; without it (a replay) the game proposed for the lesson. */
	async function beginGame(lessonId: string, event: FlowEvent, gameId?: string) {
		if (!profile || !progression) return;
		const world = worldOfLesson(progression, lessonId);
		const definition = world
			? ((gameId === undefined ? undefined : findGame(gameId)) ?? gameFor(world, lessonId, profile))
			: undefined;
		if (!world || !definition) return;
		if (
			profile.lastGameByWorld[world.id] !== definition.id ||
			profile.lastGameByWorld[lessonId] !== definition.id
		) {
			void commit(withGames(profile, world.id, lessonId, definition.id));
		}
		const banks = await loadGame(definition, progression);
		if (banks === null) {
			if (event.type === 'replay') go({ type: 'back-to-map' });
			return;
		}
		exercise = generateExercise(progression, lessonId, Math.random, {
			...banks,
			progress: profile.progress,
			themeId: world.themeId,
			maxLevel: PLAY_RULES.maxWordLevel
		});
		playClock = startPlaying(playClock, now());
		go(event);
	}

	function quitGame() {
		playClock = stopPlaying(playClock, now());
		go({ type: 'quit' });
	}

	async function finishGame(lessonId: string, outcome: GameOutcome) {
		if (!profile || !progression) return;
		playClock = finishPlaying(playClock, now());
		const recorded = recordLessonOutcome(profile, progression.rules, lessonId, outcome, Date.now());
		const { evaluation } = recorded;
		const { profile: next, announced } = earnRewards(recorded.profile, catalogue, progression);
		const progress = next.progress;
		const told = story
			? storyAfterLesson(story, progression, profile.progress, progress, lessonId)
			: [];
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
			suggestBreak: shouldSuggestBreak(playClock, now(), PLAY_RULES),
			almost: almostNextStar(
				progression.rules,
				(100 * outcome.metrics.correctKeystrokes) / Math.max(1, outcome.metrics.totalKeystrokes),
				evaluation.stars
			),
			saveFailed: false,
			rewards: announced,
			askName: shouldAskName(evaluation.unlocksNext, next.companion.name, nameLater),
			story: told
		};
		go({ type: 'completed' });
		if (!(await commit(next)) && result) result = { ...result, saveFailed: true };
	}

	/** "Yes!" to the companion: a short game on the key it lost, in the game of the lesson of that key. */
	async function startHelp() {
		if (!profile || !progression || !helpQuest) return;
		const quest = helpQuest;
		const world = worldOfLesson(progression, quest.lessonId);
		const definition = world ? gameFor(world, quest.lessonId, profile) : undefined;
		if (!world || !definition) return;
		const banks = await loadGame(definition, progression);
		if (banks === null) return;
		try {
			exercise = generateHelpExercise(progression, quest, HELP_QUEST_RULES, Math.random, {
				...banks,
				progress: profile.progress,
				themeId: world.themeId,
				maxLevel: PLAY_RULES.maxWordLevel
			});
		} catch {
			return;
		}
		helpRun = quest;
		playClock = startPlaying(playClock, now());
		go({ type: 'start-help' });
	}

	/** Whatever the result, the companion thanks the child: no stars, no lesson, no ghost. */
	async function finishHelp(outcome: GameOutcome) {
		if (!profile || !progression || !helpRun) return;
		const quest = helpRun;
		playClock = stopPlaying(playClock, now());
		const { profile: next, announced } = recordHelpOutcome(
			profile,
			progression,
			catalogue,
			quest,
			outcome.metrics
		);
		helpDone = {
			rewards: announced,
			dance: lessonIds(progression).indexOf(quest.lessonId),
			saveFailed: false
		};
		go({ type: 'completed' });
		if (!(await commit(next)) && helpDone) helpDone = { ...helpDone, saveFailed: true };
	}

	function playNext() {
		if (!progression || !result) return;
		const followingId = nextLessonId(progression, result.lessonId);
		if (followingId === null) return;
		// The ending of a world leads into the opening of the next one.
		go({
			type: 'tell',
			moments: [...result.story, ...openingOf(followingId)],
			then: { name: 'intro', lessonId: followingId }
		});
	}
</script>

{#snippet playing(current: Profile, lessonId: string, oncomplete: (outcome: GameOutcome) => void)}
	{#if exercise && ActiveGame && assets && progression}
		<ActiveGame
			{exercise}
			layout={assets.layout}
			charIndex={assets.charIndex}
			geometry={assets.geometry}
			fingering={assets.fingering}
			settings={toGameSettings(
				current.settings,
				systemPrefersReduced,
				guideFor(current, lessonId),
				PLAY_RULES.lookReminderEveryGroups,
				unlockedScenes(
					SCENE_SCHEDULE,
					activeGameId,
					passedLessonCount(progression, current.progress)
				)
			)}
			{sounds}
			onComplete={oncomplete}
			onSettings={openSettings}
			{voice}
			onQuit={quitGame}
		/>
	{/if}
{/snippet}

{#snippet rewardNews(rewards: readonly RewardDefinition[], askName: boolean)}
	<RewardNews
		{rewards}
		{wornIds}
		{askName}
		suggestions={catalogue?.nameSuggestions ?? []}
		onwear={wear}
		onname={nameCompanion}
		onlater={() => (nameLater = true)}
	/>
{/snippet}

<svelte:head>
	<title>{m.play_page_title()}</title>
</svelte:head>

{#if profile && TOP_BAR_SCREENS.has(screen.name)}
	<TopBar
		name={profile.name}
		oncompanion={catalogue ? openCompanion : undefined}
		onsettings={openSettings}
		onchangeplayer={changePlayer}
	/>
{/if}
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
			helpKey={helpQuest ? keyLabel(helpQuest.char, m.ui_key_space(), getLocale()) : null}
			onopen={openLesson}
			onhelp={startHelp}
			onstory={story ? () => go({ type: 'open-story-so-far' }) : undefined}
			onchangeplayer={changePlayer}
		/>
	{:else if screen.name === 'settings'}
		<SettingsPanel
			settings={profile.settings}
			{saveState}
			onchange={changeSettings}
			onback={closeSettings}
		/>
	{:else if screen.name === 'companion'}
		{#if catalogue}
			<CompanionPanel
				{catalogue}
				{owned}
				choice={profile.companion}
				{wornIds}
				saveFailed={companionSaveFailed}
				onchange={saveCompanion}
				onback={() => go({ type: 'close-companion' })}
			/>
		{/if}
	{:else if screen.name === 'intro'}
		{@const lesson = findLesson(progression, screen.lessonId)}
		{@const lessonId = screen.lessonId}
		{@const world = worldOfLesson(progression, lessonId)}
		{#if lesson && world}
			<LessonIntro
				{lesson}
				number={lessonIds(progression).indexOf(lessonId) + 1}
				{assets}
				games={gameOptions(world)}
				gameId={gameFor(world, lessonId, profile)?.id ?? ''}
				guide={guideFor(profile, lessonId).mode}
				still={isMotionReduced(profile.settings, systemPrefersReduced)}
				{voice}
				loadFailed={gameLoadFailed}
				prize={prizeOfLesson(catalogue, lessonId, owned)}
				onplay={(gameId) => playLesson(world.id, lessonId, gameId)}
				onback={() => go({ type: 'back-to-map' })}
			/>
		{/if}
	{:else if screen.name === 'game'}
		{@const lessonId = screen.lessonId}
		{@render playing(profile, lessonId, (outcome) => finishGame(lessonId, outcome))}
	{:else if screen.name === 'help-game'}
		{#if helpRun}
			{@render playing(profile, helpRun.lessonId, finishHelp)}
		{/if}
	{:else if screen.name === 'result' && result}
		{@const lessonId = screen.lessonId}
		{@const view = result}
		<LessonResult
			stars={result.stars}
			summary={result.summary}
			hasOpenNext={result.hasOpenNext}
			worldDone={result.worldDone}
			suggestBreak={result.suggestBreak}
			almost={result.almost}
			saveFailed={result.saveFailed}
			dance={lessonIds(progression).indexOf(lessonId)}
			date={new Date()}
			worldLessons={worldOfLesson(progression, lessonId)?.lessons.length ?? 0}
			still={isMotionReduced(profile.settings, systemPrefersReduced)}
			{sounds}
			onnext={playNext}
			onreplay={() => leaveResult({ name: 'replay', lessonId })}
			onmap={() => leaveResult({ name: 'map' })}
			onbreak={() => leaveResult({ name: 'break' })}
		>
			{#snippet news()}
				{@render rewardNews(view.rewards, askNameNow)}
			{/snippet}
		</LessonResult>
	{:else if screen.name === 'story'}
		{@const moment = screen.moments[screen.index]}
		{#if moment}
			{#key `${screen.index}-${moment.art}`}
				<StoryScreen
					{moment}
					worldTitle={worldTitle(moment.worldId)}
					{voice}
					oncontinue={continueStory}
				/>
			{/key}
		{/if}
	{:else if screen.name === 'story-so-far' && story}
		<StorySoFar
			moments={storySoFar(story, progression, profile.progress)}
			{progression}
			{voice}
			onback={() => go({ type: 'back-to-map' })}
		/>
	{:else if screen.name === 'break'}
		<BreakScreen onreturn={() => go({ type: 'back-to-map' })} />
	{:else if screen.name === 'help-done' && helpDone}
		{@const done = helpDone}
		<HelpThanks
			dance={done.dance}
			saveFailed={done.saveFailed}
			onmap={() => go({ type: 'back-to-map' })}
		>
			{#snippet news()}
				{@render rewardNews(done.rewards, false)}
			{/snippet}
		</HelpThanks>
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
