<script lang="ts">
	import { onMount, tick, untrack, type Component } from 'svelte';
	import { beforeNavigate, pushState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		createAmbiencePlayer,
		createVoicePlayer,
		loadVoiceManifest,
		withSpeakingSignal,
		type VoicePlayer
	} from '$lib/audio';
	import { voiceLocale } from '$lib/audio/voice-texts';
	import { almostNextStar, isLessonUnlocked } from '$lib/engine/progression/progress';
	import {
		findLesson,
		freshChars,
		isTour,
		lessonIds,
		lessonNumber
	} from '$lib/engine/progression/definition';
	import { keysToTame } from '$lib/engine/progression/consolidation';
	import { errorPolicyFor, isErasingNew } from '$lib/engine/progression/error-policy';
	import { guideMode } from '$lib/engine/progression/guide';
	import {
		aidedContext,
		isCloseToPassing,
		supportLevel,
		type SupportLevel
	} from '$lib/engine/progression/support';
	import { passedLessonCount, unlockedScenes } from '$lib/engine/rewards/scenes';
	import { generateExercise } from '$lib/engine/progression/exercise';
	import { keyNeighbors } from '$lib/engine/progression/repair';
	import { wordLimits } from '$lib/engine/progression/word-limits';
	import { generateFreeExercise } from '$lib/engine/free-practice/exercise';
	import type { ErrorPolicy } from '$lib/engine/types';
	import type { RaceWinner } from '$lib/engine/ghost/race';
	import type { GhostRun } from '$lib/engine/ghost/types';
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
		ExerciseContext,
		ProgressionDefinition,
		StarCount,
		WorldDefinition
	} from '$lib/engine/progression/types';
	import { providePauseRequests } from '$lib/games/shared/pause-request';
	import type { GameDefinition, GameGuide, GameOutcome, GameProps } from '$lib/games/types';
	import type { LayoutId } from '$lib/keyboard/layout-ids';
	import type { KeyCode } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { applySettings } from '$lib/state/apply-settings';
	import {
		createProfile,
		defaultSettings,
		localDay,
		markCalibrated,
		updateSettings,
		withCompanion,
		withHideout,
		withGamePlayed,
		withLastGame
	} from '$lib/state/profile';
	import {
		sessionPaces,
		toSessionRecord,
		utcOffsetAt,
		withPracticeDay,
		withSessionRecorded
	} from '$lib/state/journal';
	import { JOURNAL_RULES } from '$lib/state/journal-rules';
	import {
		createProfileNotices,
		withNotices,
		type ProfileNotices
	} from '$lib/state/profile-notices';
	import { isSameData } from '$lib/state/same-data';
	import { requestStorageProtectionOnce } from '$lib/state/storage-persistence';
	import { createIndexedDbProfileStore, createMemoryProfileStore } from '$lib/state/stores';
	import type {
		AgeBand,
		Profile,
		ProfileStore,
		Settings,
		UnreadableProfile
	} from '$lib/state/types';
	import { provideCompanionAppearance } from '$lib/ui/companion/appearance';
	import { loadKeyboardAssets, type KeyboardAssets } from './assets';
	import { loadBanks, settleWithin, type LoadedBanks } from './banks';
	import BreakScreen from './BreakScreen.svelte';
	import {
		createPlayClock,
		finishPlaying,
		isEarlyLesson,
		shouldSuggestBreak,
		startPlaying,
		stopPlaying,
		withTyping
	} from './break';
	import {
		appearanceOf,
		earnRewards,
		keyLabel,
		prizeOfLesson,
		recordHelpOutcome,
		shouldAskName,
		tourPrizes,
		wearItem
	} from './companion';
	import CompanionPanel from './CompanionPanel.svelte';
	import HideoutPanel from './HideoutPanel.svelte';
	import type { HideoutLayout } from './hideout';
	import { progressionFor } from './content';
	import { INITIAL_SCREEN, transition, type FlowEvent, type Screen } from './flow';
	import FreeIntro from './FreeIntro.svelte';
	import {
		FREE_PRACTICE_RULES,
		freePracticeWorld,
		freeWordsFor,
		recordFreePractice
	} from './free-practice';
	import { gameForLesson, gameOptions, selectedGame } from './game-choice';
	import HelpThanks from './HelpThanks.svelte';
	import { answerToBrowser, isPlayGuard, needsEntry, PLAY_GUARD, wayBackOf } from './history';
	import { fadedKeysFor, hesitationFor, isMotionReduced, toGameSettings } from './game-settings';
	import { SCENE_SCHEDULE } from './scenes';
	import { findGame } from '$lib/games/registry';
	import KeyboardCheck from './KeyboardCheck.svelte';
	import {
		forgetLastPlayerId,
		readLastPlayerId,
		returningPlayer,
		writeLastPlayerId
	} from './last-player';
	import LessonIntro from './LessonIntro.svelte';
	import {
		asAccurateAsGhost,
		evaluationOrNone,
		recordLessonOutcome,
		RESULT_RULES
	} from './lesson-outcome';
	import { ghostGreetingFor, raceGhostFor } from './race';
	import LessonResult from './LessonResult.svelte';
	import { focusLessonId, followingLessonId, worldOfLesson } from './map';
	import NewPlayer from './NewPlayer.svelte';
	import { platformFromUserAgent } from './player';
	import PlayerSelect from './PlayerSelect.svelte';
	import { PLAY_RULES } from './play-rules';
	import RewardNews from './RewardNews.svelte';
	import { HELP_QUEST_RULES, rewardCatalogueFor } from './rewards';
	import SettingsPanel from './SettingsPanel.svelte';
	import { createProfileSounds } from './sounds';
	import { isAmbienceScreen } from './ambience';
	import { notYetTold, storyFor } from './story';
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
		'help-done',
		'free-intro',
		'free-done'
	]);
	const NO_WORDS: readonly string[] = [];
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
		/** Who was done first, when the child raced the ghost to the end. */
		readonly race: RaceWinner | null;
		/** The play reached the accuracy that opens the next lesson. */
		readonly passed: boolean;
		/** Under that accuracy by a few points only. */
		readonly close: boolean;
		/** New keys of the lesson still to tame (`keysToTame`). */
		readonly tame: readonly string[];
		/** Typed at least as accurately as the play the ghost copies: a race is praised for that. */
		readonly asAccurateAsGhost: boolean;
		/** This play opened the grand tour of its world: one sentence says so, nothing more. */
		readonly tourOpened: boolean;
	}

	interface HelpDoneView {
		readonly rewards: readonly RewardDefinition[];
		readonly dance: number;
		readonly saveFailed: boolean;
	}

	let screen = $state.raw<Screen>(INITIAL_SCREEN);
	/** Pictures of the story already told during this visit (ADR-051). */
	let toldThisVisit: ReadonlySet<string> = new Set();
	let store: ProfileStore = createMemoryProfileStore();
	/** What the other pages of the app say of the profiles (the adult space in another tab). */
	let notices: ProfileNotices | null = null;
	/** Changes on their way to the device, and how many were ever started. */
	let pendingWrites = 0;
	let startedWrites = 0;
	let profiles = $state.raw<readonly Profile[]>([]);
	/** The player who played last on this device: offered first when the game asks who plays. */
	let lastPlayerId = $state<string | null>(null);
	let profile = $state.raw<Profile | null>(null);
	let assets = $state.raw<KeyboardAssets | null>(null);
	// The keys next to each key of the layout of the child: where a lesson of repairs takes its mistakes.
	const neighbors = $derived(assets ? keyNeighbors(assets.layout, assets.geometry) : undefined);
	let exercise = $state.raw<Exercise | null>(null);
	/** The ghost of the game being played, when the child chose to race it; never kept for a replay. */
	let raceGhost = $state.raw<GhostRun | null>(null);
	let raceGreeting = $state(0);
	let result = $state.raw<ResultView | null>(null);
	/** The step of the result on screen (E-04), kept while the settings are open over it. */
	let resultStep = $state(0);
	/** The game on screen is an aided play of its lesson (P-11): decided when it starts. */
	let gameSupport = $state<SupportLevel>('none');
	/** What a play won of the story and a replay put off: told on the way to the next lesson. */
	let storyPutOff: { readonly lessonId: string; readonly moments: readonly StoryMoment[] } | null =
		null;
	let playClock = createPlayClock();
	let memoryOnly = $state(false);
	/** Records the app cannot open: listed on the player screen, deleted only on request. */
	let unreadable = $state.raw<readonly UnreadableProfile[]>([]);
	let forgetFailed = $state(false);
	let loadFailed = $state(false);
	let saveState = $state<'idle' | 'saved' | 'error'>('idle');
	let systemPrefersReduced = $state(false);
	let ActiveGame = $state.raw<Component<GameProps> | null>(null);
	let activeGameId = $state('');
	let gameLoadFailed = $state(false);
	/** The help quest being played. */
	let helpRun = $state.raw<HelpQuest | null>(null);
	let helpDone = $state.raw<HelpDoneView | null>(null);
	/** The end of a free practice: the same as the thanks of a help quest. */
	let freeDone = $state.raw<HelpDoneView | null>(null);
	/** "Later" to the name of the companion: not asked again during this visit. */
	let nameLater = $state(false);
	let companionSaveFailed = $state(false);
	let hideoutSaveFailed = $state(false);

	const sounds = createProfileSounds(() => profile?.settings ?? null);
	/** The soft background sound, when the profile asks for it (ADR-057). */
	const ambience = createAmbiencePlayer();
	/** The game on screen is paused by the child. */
	let gamePaused = $state(false);
	let pageVisible = $state(true);
	/** A recorded instruction is being said: the background sound goes down under it. */
	let voiceSpeaking = $state(false);
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
	/** The words of the adult that this keyboard types; none: no free practice on the map. */
	const freeWords = $derived(
		profile && assets ? freeWordsFor(profile, assets.charIndex) : NO_WORDS
	);
	const freeWorld = $derived(
		profile && progression ? freePracticeWorld(progression, profile) : undefined
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
		const next = transition(screen, event);
		if (next === screen) return;
		screen = next;
		// Each screen opens at its top, whatever the one before was scrolled to; the map and the
		// lesson screen then bring the lesson to play and its games into view themselves.
		window.scrollTo(0, 0);
		syncHistory();
	}

	/** The history of the browser is on the entry added for a screen with a way out (`history.ts`). */
	let guarded = false;
	/** How to pause the game on screen, handed over by its shell. */
	let pauseGame: (() => void) | null = null;

	providePauseRequests((pause) => {
		pauseGame = pause;
		return () => {
			if (pauseGame === pause) pauseGame = null;
		};
	});

	function syncHistory() {
		if (!needsEntry(screen, guarded)) return;
		guarded = true;
		pushState('', PLAY_GUARD);
	}

	// The Back and Forward buttons of the browser: the address stays the same, only the entry changes.
	$effect(() => {
		const onGuard = isPlayGuard(page.state);
		untrack(() => {
			const answer = answerToBrowser(screen, guarded, onGuard);
			guarded = onGuard;
			if (answer === 'leave') {
				leave();
			} else if (answer === 'exit') {
				history.back();
			} else if (answer === 'undo') {
				guarded = false;
				history.back();
			}
		});
	});

	// Back by more than one entry would leave the route (a browser skips an entry added without a
	// gesture of the child, and its history menu reaches any page): the way out of the screen is
	// taken instead, so that a game is never lost. Leaving the site itself is never held back.
	beforeNavigate((navigation) => {
		if (navigation.type !== 'popstate' || navigation.willUnload || navigation.delta >= 0) return;
		if (navigation.to?.route.id === navigation.from?.route.id) return;
		if (wayBackOf(screen) === null) return;
		navigation.cancel();
		leave();
	});

	/**
	 * Back does what the way out at the top of the screen does. In a game it opens the pause: the
	 * game is not lost, and the child chooses to go on or to quit.
	 */
	function leave() {
		switch (wayBackOf(screen)) {
			case 'cancel-new-player':
				go({ type: 'cancel-new-player' });
				break;
			case 'change-player':
				changePlayer();
				break;
			case 'close-settings':
				void closeSettings();
				break;
			case 'close-companion':
				go({ type: 'close-companion' });
				break;
			case 'close-hideout':
				go({ type: 'close-hideout' });
				break;
			case 'back-to-map':
				leaveStoryUntold();
				go({ type: 'back-to-map' });
				break;
			case 'pause-game':
				pauseGame?.();
				break;
			case null:
				break;
		}
		// A screen that stays (a game, now paused) takes its entry of the history again.
		syncHistory();
	}

	/** A story left before its end is told again on the way to the next lesson. */
	function leaveStoryUntold() {
		if (screen.name !== 'story') return;
		const left = new Set(screen.moments.map((moment) => moment.art));
		toldThisVisit = new Set([...toldThisVisit].filter((art) => !left.has(art)));
	}

	function now(): number {
		return performance.now();
	}

	onMount(async () => {
		systemPrefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		notices = createProfileNotices();
		notices.listen(() => void readAgain());
		store = withNotices(createIndexedDbProfileStore(), notices);
		try {
			profiles = await store.list();
			unreadable = await store.listUnreadable();
		} catch {
			store = createMemoryProfileStore();
			memoryOnly = true;
		}
		if (!(await resumeLastPlayer())) go({ type: 'profiles-loaded' });
	});

	onMount(() => () => sounds.dispose());
	onMount(() => () => notices?.close());
	onMount(() => {
		pageVisible = document.visibilityState === 'visible';
		return () => ambience.dispose();
	});

	$effect(() => {
		ambience.update({
			ambience: profile?.settings.ambience ?? 'none',
			audible: pageVisible && isAmbienceScreen(screen, gamePaused),
			voiceSpeaking
		});
	});

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
				voice = withSpeakingSignal(created, (speaking) => (voiceSpeaking = speaking));
			});
		return () => {
			cancelled = true;
			created?.dispose();
			voice = SILENT_VOICE;
			voiceSpeaking = false;
		};
	});

	async function resumeLastPlayer(): Promise<boolean> {
		const { last, resume, gone } = returningPlayer(profiles, readLastPlayerId());
		if (gone) forgetLastPlayerId();
		lastPlayerId = last?.id ?? null;
		return last !== null && resume ? enter(last) : false;
	}

	$effect(() => {
		applySettings(profile?.settings ?? defaultSettings('pc'), document.documentElement);
	});

	function showProfile(next: Profile) {
		profile = next;
		profiles = profiles.map((item) => (item.id === next.id ? next : item));
	}

	/**
	 * Shows the change at once, so that the game goes on even if the device refuses to store it,
	 * then stores it from the profile as the device holds it now, never from the copy kept here:
	 * what another page stored meanwhile (the adult space in another tab) is not written over.
	 */
	async function commit(change: (current: Profile) => Profile): Promise<boolean> {
		if (!profile) return false;
		const { id } = profile;
		try {
			showProfile(change(profile));
		} catch {
			return false;
		}
		pendingWrites += 1;
		startedWrites += 1;
		let stored: Profile | null;
		try {
			stored = await store.update(id, (current) => change(withEarnedSoFar(current)));
		} catch {
			return false;
		} finally {
			pendingWrites -= 1;
		}
		if (stored === null) return false;
		// The last change on its way gives the profile as the device holds it, the others included.
		if (pendingWrites === 0) void showStored(stored);
		return true;
	}

	/**
	 * The profile as the device holds it takes the place of the one on screen, with its keyboard
	 * when another page changed it. The screen is drawn again only when the two differ.
	 */
	async function showStored(stored: Profile) {
		const shown = profile;
		if (!shown || shown.id !== stored.id) return;
		const next = withEarnedSoFar(stored);
		if (isSameData(next, shown)) return;
		const { layoutId, fingeringProfileId } = next.settings;
		if (
			layoutId !== shown.settings.layoutId ||
			fingeringProfileId !== shown.settings.fingeringProfileId
		) {
			try {
				const loaded = await loadKeyboardAssets(next.settings);
				// A change made meanwhile will bring its own stored profile.
				if (profile !== shown) return;
				assets = loaded;
			} catch {
				return;
			}
		}
		showProfile(next);
	}

	/** Another page of the app changed the profiles: they are read again, the one on screen too. */
	async function readAgain() {
		const writesBefore = startedWrites;
		let fresh: readonly Profile[];
		try {
			fresh = await store.list();
			unreadable = await store.listUnreadable();
		} catch {
			return;
		}
		// A change of this page stored meanwhile gave, or will give, a more recent profile.
		const outdated = pendingWrites > 0 || startedWrites !== writesBefore;
		const shown = profile;
		profiles = fresh.map((item) => (outdated && item.id === shown?.id ? shown : item));
		if (!shown || outdated) return;
		const stored = fresh.find((item) => item.id === shown.id);
		if (!stored) {
			leaveRemovedPlayer();
			return;
		}
		await showStored(stored);
	}

	/** The player on screen was deleted from the adult space: back to the players, whatever the screen. */
	function leaveRemovedPlayer() {
		if (isGame(screen)) playClock = stopPlaying(playClock, now());
		nameLater = false;
		helpRun = null;
		profile = null;
		assets = null;
		saveState = 'idle';
		go({ type: 'player-removed' });
	}

	async function enter(chosen: Profile): Promise<boolean> {
		loadFailed = false;
		toldThisVisit = new Set();
		try {
			assets = await loadKeyboardAssets(chosen.settings);
		} catch {
			loadFailed = true;
			return false;
		}
		profile = withEarnedSoFar(chosen);
		writeLastPlayerId(chosen.id);
		lastPlayerId = chosen.id;
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

	async function createPlayer(name: string, ageBand: AgeBand | null): Promise<boolean> {
		const blank = createProfile({
			id: crypto.randomUUID(),
			name,
			now: Date.now(),
			platform: platformFromUserAgent(navigator.userAgent)
		});
		const created = ageBand === null ? blank : updateSettings(blank, { ageBand });
		try {
			await store.save(created);
		} catch {
			return false;
		}
		profiles = [...profiles, created];
		return enter(created);
	}

	/** Deletes, after the confirmation of the person, a record the app cannot open. */
	async function forgetUnreadable(id: string) {
		forgetFailed = false;
		try {
			await store.removeUnreadable(id);
			unreadable = await store.listUnreadable();
		} catch {
			forgetFailed = true;
		}
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
		saveState = (await commit((current) => updateSettings(current, patch))) ? 'saved' : 'error';
	}

	async function chooseKeyboardLayout(layoutId: LayoutId) {
		await changeSettings({ layoutId });
	}

	async function finishKeyboardCheck() {
		if (profile) await commit(markCalibrated);
		go({ type: 'keyboard-checked' });
	}

	/**
	 * Where the screen was scrolled when the settings opened. The settings start at their top and,
	 * once closed, give the screen back its own position: neither scroll leaks into the other.
	 */
	let scrollBeforeSettings = 0;

	async function openSettings() {
		saveState = 'idle';
		const fromGame = isGame(screen);
		scrollBeforeSettings = fromGame ? 0 : window.scrollY;
		if (fromGame) playClock = stopPlaying(playClock, now());
		go({ type: 'open-settings' });
		await tick();
		window.scrollTo(0, 0);
	}

	async function closeSettings() {
		go({ type: 'close-settings' });
		// The paused game is given back as it was: its play time goes on.
		if (isGame(screen)) {
			playClock = startPlaying(playClock, now());
		}
		await tick();
		window.scrollTo(0, scrollBeforeSettings);
	}

	function isGame(current: Screen): boolean {
		return current.name === 'game' || current.name === 'help-game' || current.name === 'free-game';
	}

	function openCompanion() {
		companionSaveFailed = false;
		go({ type: 'open-companion' });
	}

	/** Every choice about the companion is kept at once. */
	async function saveCompanion(choice: CompanionChoice) {
		if (!profile) return;
		try {
			withCompanion(profile, choice);
		} catch {
			return;
		}
		companionSaveFailed = !(await commit((current) => withCompanion(current, choice)));
	}

	function openHideout() {
		hideoutSaveFailed = false;
		go({ type: 'open-hideout' });
	}

	/** Every change in the hideout is kept at once. */
	async function saveHideout(layout: HideoutLayout) {
		if (!profile) return;
		try {
			withHideout(profile, layout);
		} catch {
			return;
		}
		hideoutSaveFailed = !(await commit((current) => withHideout(current, layout)));
	}

	function wear(item: RewardDefinition) {
		if (profile && catalogue) void saveCompanion(wearItem(profile.companion, catalogue, item.id));
	}

	function nameCompanion(name: string) {
		if (profile) void saveCompanion({ ...profile.companion, name });
	}

	function isOpenFor(current: Profile, lessonId: string): boolean {
		return (
			progression !== undefined &&
			isLessonUnlocked(
				progression,
				current.progress,
				lessonId,
				current.openedWorldIds,
				current.keptOpenLessonIds
			)
		);
	}

	/** Where "next lesson" leads this child after a lesson; `null` after the last one. */
	function followingFor(current: Profile, lessonId: string): string | null {
		if (!progression) return null;
		return followingLessonId(
			progression,
			current.progress,
			lessonId,
			current.openedWorldIds,
			current.keptOpenLessonIds
		);
	}

	function openLesson(lessonId: string) {
		if (!profile || !progression) return;
		gameLoadFailed = false;
		if (!isOpenFor(profile, lessonId)) return;
		tellOnTheWay(openingOf(lessonId), lessonId);
	}

	/** Each moment is told once per visit: back to the map and in again, the child is not told twice. */
	function tellOnTheWay(moments: readonly StoryMoment[], lessonId: string) {
		const fresh = notYetTold(moments, toldThisVisit);
		toldThisVisit = new Set([...toldThisVisit, ...fresh.map((moment) => moment.art)]);
		go({ type: 'tell', moments: fresh, then: { name: 'intro', lessonId } });
	}

	/** The opening of the world of the lesson, while the child has played none of its lessons. */
	function openingOf(lessonId: string): readonly StoryMoment[] {
		if (!profile || !progression || !story) return [];
		return storyBeforeLesson(story, progression, profile.progress, lessonId);
	}

	/** A break starts the play time again. */
	function takeBreak() {
		playClock = createPlayClock();
		go({ type: 'take-break' });
	}

	function continueStory() {
		if (screen.name !== 'story') return;
		go({ type: 'story-next' });
	}

	function worldTitle(worldId: string): string {
		return progression?.worlds.find((world) => world.id === worldId)?.title ?? '';
	}

	/** The choice is kept in the profile, so that the child finds the same game at the next visit. */
	function chooseGame(worldId: string, lessonId: string, gameId: string) {
		gameLoadFailed = false;
		if (profile) void commit((current) => withGames(current, worldId, lessonId, gameId));
	}

	/** A picture of a game was chosen on the lesson screen: it is kept, and the lesson starts with it. */
	function playLesson(worldId: string, lessonId: string, gameId: string, race: boolean) {
		chooseGame(worldId, lessonId, gameId);
		void beginGame(lessonId, { type: 'start' }, gameId, race);
	}

	/** The game is kept for the world and for the lesson, so that a return finds it. */
	function withGames(current: Profile, worldId: string, lessonId: string, gameId: string): Profile {
		return withLastGame(withLastGame(current, worldId, gameId), lessonId, gameId);
	}

	function gameFor(world: WorldDefinition, lessonId: string, current: Profile) {
		return gameForLesson(world, lessonId, current.lastGameByWorld);
	}

	/**
	 * The hand of the free practice: that of the lesson the map proposes, with no key new to it.
	 */
	function freeGuideFor(current: Profile): GameGuide {
		if (!progression) return { mode: 'none', freshChars: [], hesitationMs: 0 };
		const focus = focusLessonId(
			progression,
			current.progress,
			current.openedWorldIds,
			current.keptOpenLessonIds
		);
		return { ...guideFor(current, focus ?? ''), freshChars: [] };
	}

	/** The keys whose letter fades in a game of this lesson, for this child (ADR-057). */
	function fadedFor(current: Profile, lessonId: string): readonly KeyCode[] {
		if (!progression || !assets) return [];
		return fadedKeysFor(
			current.settings,
			progression,
			current.progress,
			lessonId,
			assets.charIndex
		);
	}

	/** The keys that fade in the free practice: those of the lesson the map proposes. */
	function freeFadedFor(current: Profile): readonly KeyCode[] {
		if (!progression) return [];
		const focus = focusLessonId(
			progression,
			current.progress,
			current.openedWorldIds,
			current.keptOpenLessonIds
		);
		return focus === null ? [] : fadedFor(current, focus);
	}

	/**
	 * What the hand on the keyboard shows in this lesson, for this child; every key in an aided play.
	 * The wait before it helps a child who hesitates follows the time this child takes (P-07).
	 */
	function guideFor(current: Profile, lessonId: string, support: SupportLevel = 'none'): GameGuide {
		if (!progression) return { mode: 'none', freshChars: [], hesitationMs: 0 };
		const number = lessonIds(progression).indexOf(lessonId) + 1;
		return {
			mode: guideMode(progression.rules, number, current.settings.handGuide, support),
			freshChars: freshChars(progression, lessonId),
			hesitationMs: hesitationFor(progression, current.progress, assets?.charIndex)
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
	async function beginGame(lessonId: string, event: FlowEvent, gameId?: string, race = false) {
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
			const worldId = world.id;
			const gameChosen = definition.id;
			void commit((current) => withGames(current, worldId, lessonId, gameChosen));
		}
		const banks = await loadGame(definition, progression);
		if (banks === null) {
			if (event.type === 'replay') go({ type: 'back-to-map' });
			return;
		}
		// After plays under the threshold, this one is aided: every key shown, the simplest words,
		// never longer than the lesson (audit P-11). Read from the plays kept, nothing is stored.
		const support = supportLevel(profile.sessions, lessonId, RESULT_RULES.support);
		try {
			const context: ExerciseContext = {
				...banks,
				progress: profile.progress,
				themeId: world.themeId,
				...wordLimits(PLAY_RULES, progression, lessonId, profile.settings.ageBand),
				ageBand: profile.settings.ageBand,
				neighbors,
				// The exercise grows with the pace of the latest plays; nothing on screen says so.
				paces: sessionPaces(profile.sessions)
			};
			exercise = generateExercise(
				progression,
				lessonId,
				Math.random,
				support === 'aided' ? aidedContext(context, RESULT_RULES.support) : context
			);
		} catch {
			// No exercise could be made: the child is told, as when the game itself does not load.
			gameLoadFailed = true;
			if (event.type === 'replay') go({ type: 'back-to-map' });
			return;
		}
		raceGhost = race
			? raceGhostFor(profile, progression.rules, lessonId, PLAY_RULES.ghostPaceFactor)
			: null;
		raceGreeting = ghostGreetingFor(profile, lessonId);
		gameSupport = support;
		if (storyPutOff?.lessonId !== lessonId) storyPutOff = null;
		gamePaused = false;
		playClock = startPlaying(playClock, now());
		go(event);
	}

	function quitGame() {
		playClock = stopPlaying(playClock, now());
		storyPutOff = null;
		go({ type: 'quit' });
	}

	/**
	 * The same lesson again, from its result. What the play won of the story waits for the next
	 * lesson, as when the child goes on at once (ADR-051): one more play to tame keys is often
	 * proposed first, and the story must not be lost to it.
	 */
	function replayLesson(lessonId: string) {
		if (result?.lessonId === lessonId && result.story.length > 0) {
			storyPutOff = { lessonId, moments: result.story };
		}
		void beginGame(lessonId, { type: 'replay' });
	}

	async function finishGame(lessonId: string, outcome: GameOutcome) {
		if (!profile || !progression) return;
		playClock = finishPlaying(playClock, now(), outcome.metrics.elapsedMs);
		const source = progression;
		const rewards = catalogue;
		const gameId = activeGameId;
		let record: ((current: Profile) => Profile) | null = null;
		try {
			record = showResult(profile, source, rewards, gameId, lessonId, outcome);
		} catch {
			// The child is never left on a finished game: the result is shown, said not to be kept.
			result = unrecordedResult(source, lessonId, outcome);
		}
		resultStep = 0;
		go({ type: 'completed' });
		if (record !== null && !(await commit(record)) && result) {
			result = { ...result, saveFailed: true };
		}
		// Asked once, after a first lesson: never on the first screen, and nothing waits for the answer.
		if (!memoryOnly) void requestStorageProtectionOnce();
	}

	/** What is shown of a play that could not be recorded: its stars and its numbers, nothing won. */
	function unrecordedResult(
		source: ProgressionDefinition,
		lessonId: string,
		outcome: GameOutcome
	): ResultView {
		const { stars, unlocksNext } = evaluationOrNone(source.rules, outcome.metrics);
		return {
			lessonId,
			stars,
			summary: summarizeMetrics(outcome.metrics),
			hasOpenNext: false,
			worldDone: false,
			suggestBreak: false,
			almost: false,
			saveFailed: true,
			rewards: [],
			askName: false,
			story: [],
			race: outcome.race ?? null,
			passed: unlocksNext,
			close: isCloseToPassing(source.rules, RESULT_RULES.support, outcome.metrics.accuracy),
			tame: [],
			asAccurateAsGhost: false,
			tourOpened: false
		};
	}

	/**
	 * Prepares the result of a finished play and gives how the play changes a profile: the one on
	 * screen now, then the one the device holds when it is stored.
	 */
	function showResult(
		before: Profile,
		source: ProgressionDefinition,
		rewards: typeof catalogue,
		gameId: string,
		lessonId: string,
		outcome: GameOutcome
	): (current: Profile) => Profile {
		const finishedAt = Date.now();
		const played = (current: Profile) => {
			const recorded = recordLessonOutcome(current, source.rules, lessonId, outcome, finishedAt);
			const earned = earnRewards(recorded.profile, rewards, source);
			const session = toSessionRecord({
				lessonId,
				gameId,
				finishedAt,
				utcOffsetMinutes: utcOffsetAt(finishedAt),
				metrics: outcome.metrics,
				evaluation: recorded.evaluation
			});
			return {
				evaluation: recorded.evaluation,
				announced: earned.announced,
				profile: withSessionRecorded(withGamePlayed(earned.profile, gameId), session, JOURNAL_RULES)
			};
		};
		const { evaluation, announced, profile: next } = played(before);
		const progress = next.progress;
		const putOff = storyPutOff?.lessonId === lessonId ? storyPutOff.moments : [];
		storyPutOff = null;
		const told = [
			...putOff,
			...(story ? storyAfterLesson(story, source, before.progress, progress, lessonId) : [])
		];
		const followingId = followingFor(next, lessonId);
		const hasOpenNext = followingId !== null && isOpenFor(next, followingId);
		const ids = lessonIds(source);
		// The end of a world opens its grand tour: the result says it once, nothing proposes it.
		const tour = worldOfLesson(source, lessonId)?.lessons.find(isTour);
		const tourOpened =
			tour !== undefined &&
			tour.id !== lessonId &&
			!isOpenFor(before, tour.id) &&
			isOpenFor(next, tour.id);
		result = {
			lessonId,
			stars: evaluation.stars,
			summary: summarizeMetrics(outcome.metrics),
			hasOpenNext,
			worldDone: followingId === null && ids.includes(lessonId) && evaluation.unlocksNext,
			suggestBreak: shouldSuggestBreak(
				playClock,
				now(),
				PLAY_RULES.sessionLengths[before.settings.sessionLength],
				isEarlyLesson(PLAY_RULES, source, lessonId)
			),
			almost: almostNextStar(
				source.rules,
				(100 * outcome.metrics.correctKeystrokes) / Math.max(1, outcome.metrics.totalKeystrokes),
				evaluation.stars
			),
			saveFailed: false,
			rewards: announced,
			askName: shouldAskName(evaluation.unlocksNext, next.companion.name, nameLater),
			story: told,
			race: outcome.race ?? null,
			passed: evaluation.unlocksNext,
			close: isCloseToPassing(source.rules, RESULT_RULES.support, outcome.metrics.accuracy),
			tame: keysToTame(source, progress, lessonId, RESULT_RULES.consolidation),
			// The ghost raced is the one of the profile before this play: a play passed replaces it.
			asAccurateAsGhost:
				outcome.race === 'child' && asAccurateAsGhost(before, lessonId, outcome.metrics.accuracy),
			tourOpened
		};
		return (current) => played(current).profile;
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
				...wordLimits(PLAY_RULES, progression, quest.lessonId, profile.settings.ageBand),
				ageBand: profile.settings.ageBand
			});
		} catch {
			return;
		}
		helpRun = quest;
		raceGhost = null;
		gamePaused = false;
		playClock = startPlaying(playClock, now());
		go({ type: 'start-help' });
	}

	/** Whatever the result, the companion thanks the child: no stars, no lesson, no ghost. */
	async function finishHelp(outcome: GameOutcome) {
		if (!profile || !progression || !helpRun) return;
		const quest = helpRun;
		playClock = withTyping(stopPlaying(playClock, now()), outcome.metrics.elapsedMs);
		const source = progression;
		const rewards = catalogue;
		const gameId = activeGameId;
		const helped = (current: Profile) =>
			recordHelpOutcome(current, source, rewards, quest, outcome.metrics);
		// Not a play of a lesson (no stars, one key): its day is counted, the journal does not keep it.
		const finishedAt = Date.now();
		const day = localDay(finishedAt, utcOffsetAt(finishedAt));
		const { announced } = helped(profile);
		helpDone = {
			rewards: announced,
			dance: lessonIds(progression).indexOf(quest.lessonId),
			saveFailed: false
		};
		go({ type: 'completed' });
		const stored = await commit((current) =>
			withPracticeDay(withGamePlayed(helped(current).profile, gameId), day)
		);
		if (!stored && helpDone) helpDone = { ...helpDone, saveFailed: true };
	}

	/** The words of the adult, in the game the child took: no lesson, no stars, no ghost. */
	async function startFree(gameId: string) {
		if (!profile || !progression || freeWords.length === 0) return;
		const definition = findGame(gameId);
		if (!definition) return;
		const words = freeWords;
		if ((await loadGame(definition, progression)) === null) return;
		exercise = generateFreeExercise(words, FREE_PRACTICE_RULES, Math.random);
		raceGhost = null;
		gamePaused = false;
		playClock = startPlaying(playClock, now());
		go({ type: 'start' });
	}

	/** Whatever the result, the child is told well done: the keys and the day count, nothing else. */
	async function finishFree(outcome: GameOutcome) {
		if (!profile || !progression) return;
		playClock = withTyping(stopPlaying(playClock, now()), outcome.metrics.elapsedMs);
		const finishedAt = Date.now();
		const source = progression;
		const rewards = catalogue;
		const play = {
			metrics: outcome.metrics,
			gameId: activeGameId,
			finishedAt,
			utcOffsetMinutes: utcOffsetAt(finishedAt)
		};
		const practised = (current: Profile) => recordFreePractice(current, source, rewards, play);
		freeDone = {
			rewards: practised(profile).announced,
			dance: freeWorld ? progression.worlds.indexOf(freeWorld) : 0,
			saveFailed: false
		};
		go({ type: 'completed' });
		const stored = await commit((current) => practised(current).profile);
		if (!stored && freeDone) freeDone = { ...freeDone, saveFailed: true };
	}

	function openFree() {
		gameLoadFailed = false;
		go({ type: 'open-free' });
	}

	function playNext() {
		if (!profile || !result) return;
		const followingId = followingFor(profile, result.lessonId);
		if (followingId === null) return;
		// The ending of a world leads into the opening of the next one.
		tellOnTheWay([...result.story, ...openingOf(followingId)], followingId);
	}
</script>

{#snippet playing(
	current: Profile,
	guide: GameGuide,
	oncomplete: (outcome: GameOutcome) => void,
	suspended: boolean,
	faded: readonly KeyCode[],
	errorPolicy: ErrorPolicy
)}
	{#if exercise && ActiveGame && assets && progression}
		<ActiveGame
			{suspended}
			{exercise}
			layout={assets.layout}
			charIndex={assets.charIndex}
			geometry={assets.geometry}
			fingering={assets.fingering}
			settings={toGameSettings(
				current.settings,
				systemPrefersReduced,
				guide,
				PLAY_RULES.lookReminder,
				unlockedScenes(
					SCENE_SCHEDULE,
					activeGameId,
					passedLessonCount(progression, current.progress)
				),
				faded,
				errorPolicy
			)}
			{sounds}
			playCount={Object.hasOwn(current.gamePlays, activeGameId)
				? current.gamePlays[activeGameId]
				: 0}
			ghost={raceGhost ?? undefined}
			ghostGreeting={raceGreeting}
			onComplete={oncomplete}
			onSettings={openSettings}
			onPauseChange={(paused) => (gamePaused = paused)}
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

<svelte:document
	onvisibilitychange={() => {
		pageVisible = document.visibilityState === 'visible';
		// Back on this page: what another page stored meanwhile is read, even if it could not say so.
		if (pageVisible) void readAgain();
	}}
/>

<svelte:head>
	<title>{m.play_page_title({ appName: m.app_name() })}</title>
</svelte:head>

{#if profile && TOP_BAR_SCREENS.has(screen.name)}
	<TopBar
		name={profile.name}
		oncompanion={catalogue ? openCompanion : undefined}
		onhideout={catalogue && screen.name === 'map' ? openHideout : undefined}
		onsettings={openSettings}
		onchangeplayer={changePlayer}
		sticky={screen.name === 'map' || screen.name === 'intro'}
	/>
{/if}
<main>
	{#if screen.name === 'loading'}
		<p class="loading" role="status">{m.play_loading()}</p>
	{:else if screen.name === 'players'}
		<PlayerSelect
			{profiles}
			{lastPlayerId}
			{memoryOnly}
			{loadFailed}
			onchoose={enter}
			onnew={() => go({ type: 'new-player' })}
			{unreadable}
			{forgetFailed}
			onforget={forgetUnreadable}
		/>
	{:else if screen.name === 'new-player'}
		<NewPlayer
			oncreate={createPlayer}
			onback={() => go({ type: 'cancel-new-player' })}
			takenNames={profiles.map((profile) => profile.name)}
		/>
	{:else if !profile || !assets || !progression}
		<p class="loading" role="alert">{m.play_error_content()}</p>
	{:else if screen.name === 'keyboard-check'}
		<KeyboardCheck
			layoutId={profile.settings.layoutId}
			codes={PLAY_RULES.keyboardCheckCodes}
			{voice}
			onlayout={chooseKeyboardLayout}
			ondone={finishKeyboardCheck}
			onchangeplayer={changePlayer}
		/>
	{:else if screen.name === 'map'}
		<WorldMap
			{profile}
			{progression}
			helpKey={helpQuest
				? keyLabel(helpQuest.char, m.ui_key_space(), getLocale(), m.ui_key_enter())
				: null}
			{voice}
			onopen={openLesson}
			onhelp={startHelp}
			onstory={story ? () => go({ type: 'open-story-so-far' }) : undefined}
			onfree={freeWords.length > 0 && freeWorld ? openFree : undefined}
			onchangeplayer={changePlayer}
			tourPrizes={tourPrizes(catalogue, owned)}
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
	{:else if screen.name === 'hideout'}
		{#if catalogue}
			<HideoutPanel
				{catalogue}
				{owned}
				layout={profile.hideout}
				saveFailed={hideoutSaveFailed}
				onchange={saveHideout}
				onback={() => go({ type: 'close-hideout' })}
			/>
		{/if}
	{:else if screen.name === 'intro'}
		{@const lesson = findLesson(progression, screen.lessonId)}
		{@const lessonId = screen.lessonId}
		{@const world = worldOfLesson(progression, lessonId)}
		{#if lesson && world}
			<LessonIntro
				{lesson}
				fresh={freshChars(progression, lessonId)}
				number={lessonNumber(progression, lessonId)}
				{assets}
				games={gameOptions(world)}
				gameId={gameFor(world, lessonId, profile)?.id ?? ''}
				guide={guideFor(profile, lessonId).mode}
				handDrawing={profile.settings.handDrawing}
				still={isMotionReduced(profile.settings, systemPrefersReduced)}
				{voice}
				loadFailed={gameLoadFailed}
				prize={prizeOfLesson(catalogue, lessonId, owned)}
				erasingNew={isErasingNew(
					profile.settings.errorPolicy,
					progression,
					profile.progress,
					lessonId
				)}
				canRace={raceGhostFor(profile, progression.rules, lessonId, PLAY_RULES.ghostPaceFactor) !==
					null}
				onplay={(gameId, race) => playLesson(world.id, lessonId, gameId, race)}
				onback={() => go({ type: 'back-to-map' })}
			/>
		{/if}
	{:else if screen.name === 'result' && result}
		{@const lessonId = screen.lessonId}
		{@const view = result}
		<LessonResult
			stars={view.stars}
			summary={view.summary}
			facts={{
				passed: view.passed,
				close: view.close,
				hasOpenNext: view.hasOpenNext,
				suggestBreak: view.suggestBreak,
				tameKeys: view.tame,
				worldDone: view.worldDone,
				race: view.race,
				asAccurateAsGhost: view.asAccurateAsGhost,
				almost: view.almost,
				perfect: view.summary.total > 0 && view.summary.correct === view.summary.total
			}}
			saveFailed={view.saveFailed}
			tourOpened={view.tourOpened}
			dance={lessonIds(progression).indexOf(lessonId)}
			date={new Date()}
			worldLessons={worldOfLesson(progression, lessonId)?.lessons.length ?? 0}
			still={isMotionReduced(profile.settings, systemPrefersReduced)}
			{sounds}
			{voice}
			rewards={view.rewards}
			{wornIds}
			askName={view.askName}
			companionName={profile.companion.name}
			suggestions={catalogue?.nameSuggestions ?? []}
			bind:step={resultStep}
			onwear={wear}
			onname={nameCompanion}
			onlater={() => (nameLater = true)}
			onnext={playNext}
			onreplay={() => replayLesson(lessonId)}
			onmap={() => go({ type: 'back-to-map' })}
			onbreak={takeBreak}
		/>
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
		<BreakScreen {voice} onreturn={() => go({ type: 'back-to-map' })} />
	{:else if screen.name === 'help-done' && helpDone}
		{@const done = helpDone}
		<HelpThanks
			dance={done.dance}
			saveFailed={done.saveFailed}
			{voice}
			onmap={() => go({ type: 'back-to-map' })}
		>
			{#snippet news()}
				{@render rewardNews(done.rewards, false)}
			{/snippet}
		</HelpThanks>
	{:else if screen.name === 'free-intro' && freeWorld}
		<FreeIntro
			games={gameOptions(freeWorld)}
			gameId={selectedGame(freeWorld, profile.lastGameByWorld)?.id ?? ''}
			loadFailed={gameLoadFailed}
			onplay={startFree}
			onback={() => go({ type: 'back-to-map' })}
		/>
	{:else if screen.name === 'free-done' && freeDone}
		{@const done = freeDone}
		<HelpThanks
			title={m.play_free_done()}
			dance={done.dance}
			saveFailed={done.saveFailed}
			{voice}
			onmap={() => go({ type: 'back-to-map' })}
		>
			{#snippet news()}
				{@render rewardNews(done.rewards, false)}
			{/snippet}
		</HelpThanks>
	{/if}

	<!--
		Outside the chain of screens: a game paused for the settings stays mounted, hidden, and comes
		back as it was when they close.
	-->
	{#if profile && progression}
		{@const settingsOver = screen.name === 'settings'}
		{@const shown = settingsOver && screen.name === 'settings' ? screen.back : screen}
		{#if shown.name === 'game'}
			{@const lessonId = shown.lessonId}
			<div hidden={settingsOver}>
				{@render playing(
					profile,
					guideFor(profile, lessonId, gameSupport),
					(outcome) => finishGame(lessonId, outcome),
					settingsOver,
					fadedFor(profile, lessonId),
					errorPolicyFor(profile.settings.errorPolicy, progression, lessonId)
				)}
			</div>
		{:else if shown.name === 'help-game' && helpRun}
			<div hidden={settingsOver}>
				{@render playing(
					profile,
					guideFor(profile, helpRun.lessonId),
					finishHelp,
					settingsOver,
					fadedFor(profile, helpRun.lessonId),
					errorPolicyFor(profile.settings.errorPolicy, progression, helpRun.lessonId)
				)}
			</div>
		{:else if shown.name === 'free-game'}
			<div hidden={settingsOver}>
				{@render playing(
					profile,
					freeGuideFor(profile),
					finishFree,
					settingsOver,
					freeFadedFor(profile),
					errorPolicyFor(profile.settings.errorPolicy, progression)
				)}
			</div>
		{/if}
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
