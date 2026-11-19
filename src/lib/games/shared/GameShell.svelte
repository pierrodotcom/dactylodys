<script lang="ts">
	import { onMount, tick, untrack, type Snippet } from 'svelte';
	import { createInputNormalizer } from '$lib/keyboard/input-adapter';
	import type { KeyPress, RawInputEvent } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import TargetText from '$lib/ui/components/TargetText.svelte';
	import { focusOnMount, focusSoon } from '$lib/ui/focus';
	import KeyboardCaptureField from '$lib/ui/keyboard-capture/KeyboardCaptureField.svelte';
	import { keepTyping } from '$lib/ui/keyboard-capture/typing-focus';
	import type { GameOutcome, GameProps } from '../types';
	import { readDurationToken } from '$lib/ui/motion';
	import {
		createGame,
		exerciseOutcome,
		reduce,
		type GameAction,
		type GameState
	} from './game-state';
	import { viewOf, type GameView } from './game-view';
	import { shellAnnouncement, typingAnnouncement, type TypingWords } from './announce';
	import { pauseRequests } from './pause-request';
	import { leaveFocusInField } from './leave-focus';
	import { spokenGrapheme } from '$lib/ui/components/spoken';
	import { isGuided } from '$lib/engine/progression/guide';
	import { isLookReminderDue, needsCapsLockHelp } from './help';
	import { targetKeyPress } from './target';
	import { fadedKeysShown, litTarget } from './keyboard-fade';
	import { ghostShare, raceWinner } from '$lib/engine/ghost/race';
	import GhostTrack from './GhostTrack.svelte';
	import {
		STOPPED_CLOCK,
		clockMs,
		exerciseCharCount,
		followGame,
		typedCharCount,
		type RaceClock
	} from './race';

	interface Props extends GameProps {
		/** Name of the game, for screen readers. */
		title: string;
		/** One kind sentence shown while the game is paused. */
		pauseText: string;
		/**
		 * `side`: scene, text and aside on one line; `wide`: a wider scene beside the text, above it when
		 * the room is short; `stacked`: the scene across the page, as tall as the screen allows, the text
		 * below it and the keyboard at the bottom. Each one holds on one screen: the scene follows the
		 * height of the screen, the text shows two lines (one across the page) and follows the typing.
		 */
		arrangement?: 'side' | 'wide' | 'stacked';
		/** Next to the pause button: how far the exercise has gone. */
		progress: Snippet<[GameView]>;
		/** The picture of the game. */
		scene: Snippet<[GameView]>;
		aside?: Snippet<[GameView]>;
		/** A final picture shown once the last reward is over; the child goes on with a button. */
		finale?: Snippet<[GameView]>;
		/** What a screen reader says about the state of the game; empty for nothing. */
		announce: (view: GameView) => string;
	}

	const CELEBRATION_TOKEN = '--dd-duration-celebration';
	const REWARD_DELAY_TOKEN = '--dd-duration-reward-delay';
	const REWARD_TOKEN = '--dd-duration-reward';
	const SCENE_TOKEN = '--dd-duration-scene';
	const REMINDER_TOKEN = '--dd-duration-reminder';
	const NOTICE_TOKEN = '--dd-duration-notice';
	const FINALE_FOCUS_TOKEN = '--dd-duration-base';
	const INPUT_ID = 'game-input';
	/** Lines of the text in view: across the page, one line holds as much as two beside a scene. */
	const TEXT_LINES = { side: 2, wide: 2, stacked: 1 } as const;
	/** What a press of the mouse is meant for: it keeps its own way of taking the focus. */
	const PRESSABLE = 'button, a, input, select, textarea, label';
	/** The physical key that erases, whatever the layout: `KeyboardEvent.code` names it the same everywhere. */
	const BACKSPACE_PRESS: KeyPress = { code: 'Backspace', level: 'base' };
	const TYPING_WORDS: TypingWords = {
		group: (text) => m.game_shared_announce_group({ text }),
		error: (char) => m.game_shared_announce_error({ char }),
		erase: (char) => m.game_shared_announce_erase({ char }),
		repair: (text, char) => m.game_shared_announce_repair({ text, char }),
		spoken: spokenGrapheme
	};

	let {
		exercise,
		layout,
		charIndex,
		geometry,
		fingering,
		settings,
		sounds,
		ghost,
		ghostGreeting = 0,
		playCount = 0,
		suspended = false,
		onComplete,
		onQuit,
		onSettings,
		onPauseChange,
		voice,
		title,
		pauseText,
		arrangement = 'side',
		progress,
		scene,
		aside,
		finale,
		announce
	}: Props = $props();

	/** The clock of the keystrokes (`attachKeyboardCapture` reads the same one). */
	function now(): number {
		return performance.now();
	}

	let game = $state.raw<GameState>(
		untrack(() =>
			createGame(exercise.groups, settings.errorPolicy, {
				finale: finale !== undefined,
				starts: exercise.starts,
				at: now(),
				charIndex
			})
		)
	);
	let capsLock = $state(false);
	let field: KeyboardCaptureField | undefined = $state();
	let pauseButton: HTMLElement | undefined;
	let reported = false;
	const offerPause = pauseRequests();

	// The race against the ghost: its clock runs only while a group is typed (`followGame`).
	const charCount = untrack(() => exerciseCharCount(exercise.groups));
	let racing = $state(untrack(() => ghost !== undefined));
	let raceClock = $state.raw<RaceClock>(STOPPED_CLOCK);
	let raceNow = $state(0);

	const normalizer = createInputNormalizer();

	const view = $derived(viewOf(game, settings.reducedMotion, settings.scenes, playCount));
	const phase = $derived(game.phase);
	const paused = $derived(game.paused);
	const mood = $derived(game.mood);
	const typing = $derived(phase === 'typing');
	const inFinale = $derived(phase === 'finale');
	const expected = $derived(view.group[view.position]);
	// A wrong character is written (`backspace` policy): Backspace is the key to press first.
	const erasing = $derived(typing && view.pending.length > 0);
	const target = $derived(
		erasing ? BACKSPACE_PRESS : typing ? targetKeyPress(charIndex, expected) : null
	);
	const capsHelp = $derived(typing && !erasing && needsCapsLockHelp(capsLock, expected));
	let speaking = $state(false);
	let fieldFocused = $state(false);
	// The keys no longer reach the field (Tab, a press on the page): the child is told how to go on.
	const away = $derived(speaking && !fieldFocused && !paused && !suspended && !inFinale);
	// A new node for each key: the same mistake twice in a row is said twice.
	const announcementKey = $derived(game.session.records.length);
	// A group typed without a single mistake sends a music note out of its last key.
	const noteCode = $derived.by(() => {
		if (phase !== 'celebrating') return null;
		const done = game.finished[game.finished.length - 1];
		if (done === undefined || done.errorCount > 0) return null;
		return targetKeyPress(charIndex, view.group[view.group.length - 1])?.code ?? null;
	});
	// A key the child knows well loses its letter; a mistake on it writes it again until the end.
	// Decided once for the game: the results saved at its end change nothing on screen.
	const fadedAtStart = untrack(() => settings.fadedKeys ?? []);
	const faded = $derived(fadedKeysShown(fadedAtStart, charIndex, game.missedChars));
	// The key expected is one the child knows well: it stays dark until the child hesitates (P-07).
	const fadedTarget = $derived(target !== null && faded.includes(target.code));
	const lookReminder = $derived(
		phase === 'celebrating' &&
			isLookReminderDue(view.completed, view.total, settings.lookReminderEvery)
	);
	const lookReminderText = m.game_shared_look_reminder();
	const capsLockText = m.game_shared_caps_lock();
	// The one live region of the game: its reward, else the text to type or the key expected after a
	// mistake, then the help about Caps Lock. The reminder to look at the screen is left to the
	// recorded voice: each thing is heard once. Empty until the game is on screen: a live region
	// only speaks what changes after it appeared.
	const announcement = $derived(
		speaking
			? shellAnnouncement(announce(view) || typingAnnouncement(view, TYPING_WORDS), {
					away: away ? m.game_shared_keep_typing() : null,
					capsLock: capsHelp ? m.game_shared_caps_lock() : null
				})
			: ''
	);
	const guide = $derived(settings.guide);
	// A child who waits long on a key is helped: the hand shows it, then goes back to the new keys.
	let hesitated = $state(false);
	const guided = $derived(
		erasing ||
			(typing &&
				isGuided(guide.mode, expected, guide.freshChars, game.errorIndex !== null, hesitated))
	);
	// What lights, and what the finger hint names: a faded key only while the hand shows it or
	// would show it, a missed one until the end of the game; Shift and AltGr keep their light.
	const lit = $derived(litTarget(target, faded, guided || hesitated, fingering));
	// Each keystroke shows the expected key again, so that a mistake brings the finger back.
	const hands = $derived(
		guide.mode === 'none'
			? null
			: {
					presses: guided && target ? [target] : [],
					trigger: `${game.groupIndex}:${game.session.records.length}:${hesitated}`
				}
	);

	function dispatch(action: GameAction) {
		// Read once: the time of a group, its pauses and the race are counted from the same moment.
		const at = action.type === 'keystroke' ? action.keystroke.timestamp : now();
		const timed =
			action.type === 'advance' || action.type === 'pause' || action.type === 'resume'
				? { ...action, at }
				: action;
		const step = reduce(game, timed);
		if (step.state === game) return;
		const groupChanged = step.state.groupIndex !== game.groupIndex;
		game = step.state;
		raceClock = followGame(raceClock, step.state, at);
		raceNow = at;
		for (const sound of step.sounds) sounds.play(sound);
		if (groupChanged) field?.clear();
		if (step.state.phase === 'complete' && !reported) {
			reported = true;
			onComplete(withRace(exerciseOutcome(step.state)));
		}
	}

	/** The child raced the ghost to the end: who was done first. */
	function withRace(outcome: GameOutcome): GameOutcome {
		if (!ghost || !racing) return outcome;
		return { ...outcome, race: raceWinner(ghost, clockMs(raceClock, raceNow), charCount, 1) };
	}

	async function leaveRace() {
		racing = false;
		await resume();
	}

	function onRawEvent(event: RawInputEvent) {
		if (event.capsLock !== undefined) capsLock = event.capsLock;
		for (const keystroke of normalizer.push(event)) dispatch({ type: 'keystroke', keystroke });
	}

	async function resume() {
		// The field takes the focus back in a moment: nothing says it is lost meanwhile.
		fieldFocused = true;
		dispatch({ type: 'resume' });
		normalizer.reset();
		await tick();
		field?.focus();
		readFocus();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (suspended) return;
		if (event.key === 'Escape') {
			if (event.repeat) return;
			if (paused) void resume();
			else dispatch({ type: 'pause' });
			return;
		}
		// The game never lets go of the child: a key typed beside the field is typed in it, and Tab
		// from the field goes to "Pause" instead of out of the page.
		if (!paused && !inFinale) keepTyping(event, INPUT_ID, field, pauseButton);
	}

	function readFocus() {
		fieldFocused = document.activeElement?.id === INPUT_ID;
	}

	// A focus that moves to another element is read when it arrives there; one that goes nowhere
	// leaves the field for the page, or stays in the field while the window is in the background.
	function onFocusOut(event: FocusEvent) {
		if (event.relatedTarget === null) readFocus();
	}

	// A hidden page is not being typed on: the game pauses, and waits for the child to resume it.
	function onVisibilityChange() {
		if (document.visibilityState === 'hidden') dispatch({ type: 'pause' });
	}

	function keepFocus(event: MouseEvent) {
		if (paused || suspended) return;
		if (!(event.target as Element).closest('button')) field?.focus();
	}

	/** A press on the picture or beside it does not take the focus out of the field. */
	function keepFocusOnPress(event: MouseEvent) {
		if (paused || suspended || inFinale) return;
		if (!(event.target as Element).closest(PRESSABLE)) event.preventDefault();
	}

	onMount(() => {
		field?.focus();
		readFocus();
		speaking = true;
		return offerPause(() => dispatch({ type: 'pause' }));
	});

	// The ghost moves on its own while the clock runs; nothing ticks when it is stopped.
	$effect(() => {
		if (!racing || raceClock.since === null) return;
		let frame = requestAnimationFrame(function tickRace(time) {
			raceNow = time;
			frame = requestAnimationFrame(tickRace);
		});
		return () => cancelAnimationFrame(frame);
	});

	$effect(() => {
		if (phase !== 'celebrating' || paused) return;
		// The reminder stays long enough to be read, whatever the reward lasts.
		const stay = Math.max(
			readDurationToken(CELEBRATION_TOKEN),
			lookReminder ? readDurationToken(REMINDER_TOKEN) : 0
		);
		const timer = setTimeout(() => dispatch({ type: 'advance' }), stay);
		return () => clearTimeout(timer);
	});

	// A key skips the reward only once it has been seen: the child is still typing when it starts.
	$effect(() => {
		if (phase !== 'celebrating' || paused) return;
		const seen =
			readDurationToken(REWARD_DELAY_TOKEN) +
			readDurationToken(view.scene.kind === 'scene' ? SCENE_TOKEN : REWARD_TOKEN);
		const timer = setTimeout(
			() => dispatch({ type: 'settle' }),
			lookReminder ? Math.max(seen, readDurationToken(REMINDER_TOKEN)) : seen
		);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		// Each key (or a new group) starts the wait again.
		void game.groupIndex;
		void game.session.records.length;
		hesitated = false;
		// The hand waits in the new-keys mode; without a hand, a faded key still lights again.
		const waits = guide.mode === 'new-keys' || (guide.mode === 'none' && fadedTarget);
		if (!typing || paused || !waits || guide.hesitationMs <= 0) return;
		const timer = setTimeout(() => (hesitated = true), guide.hesitationMs);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!lookReminder || !voice) return;
		const speaker = voice;
		void speaker.speak(lookReminderText);
		return () => speaker.stop();
	});

	// The route stops the background sound during the pause.
	$effect(() => {
		onPauseChange?.(paused);
	});

	$effect(() => {
		if (mood !== 'oops') return;
		const timer = setTimeout(() => dispatch({ type: 'calm' }), readDurationToken(NOTICE_TOKEN));
		return () => clearTimeout(timer);
	});
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={keepFocus} onmousedown={keepFocusOnPress} />
<svelte:document
	onvisibilitychange={onVisibilityChange}
	onfocusin={readFocus}
	onfocusout={onFocusOut}
/>

<div
	class="game"
	inert={paused}
	data-arrangement={arrangement}
	data-reduced-motion={settings.reducedMotion || undefined}
>
	<h1 class="dd-visually-hidden">{title}</h1>

	<header class="top">
		{@render progress(view)}
		{#if ghost && racing}
			<div class="race">
				<GhostTrack
					childShare={typedCharCount(game) / charCount}
					ghostShare={ghostShare(ghost, clockMs(raceClock, raceNow), charCount, 1)}
					arrived={phase !== 'typing' && game.groupIndex === game.groups.length - 1}
					greeting={ghostGreeting}
					still={settings.reducedMotion}
					label={m.game_shared_race_label()}
				/>
			</div>
		{/if}
		{#if !inFinale}
			<Button
				variant="secondary"
				{@attach (node: HTMLElement) => {
					pauseButton = node;
					return () => (pauseButton = undefined);
				}}
				onclick={() => dispatch({ type: 'pause' })}
			>
				{m.game_shared_pause()}
			</Button>
		{/if}
	</header>

	<div class="stage" data-arrangement={arrangement} data-aside={aside !== undefined || undefined}>
		<div class="scene">
			{@render scene(view)}
		</div>

		{#if inFinale && finale}
			<div class="finale">
				{@render finale(view)}
				<Button
					size="lg"
					{@attach focusSoon(readDurationToken(FINALE_FOCUS_TOKEN))}
					onclick={() => dispatch({ type: 'finish' })}
				>
					{m.game_shared_finale_continue()}
				</Button>
			</div>
		{:else}
			<div class="text-zone">
				<TargetText
					graphemes={view.group}
					position={typing ? view.position : view.group.length}
					errorIndex={view.errorIndex}
					pending={typing ? view.pending : []}
					lines={TEXT_LINES[arrangement]}
					still={settings.reducedMotion}
				/>
				<!--
					One place for what comes and goes (finger, reminder, Caps Lock, lost focus): nothing below
					it moves. None of it is a live region: the announcement of the game says it, once.
				-->
				<div class="slot">
					{#if settings.showKeyboard}
						<div class="hint">
							{#if typing && !capsHelp && !erasing && !away && lit.target}
								<FingerHint target={lit.target} {layout} {fingering} />
							{/if}
						</div>
					{/if}
					<div class="notes">
						{#if lookReminder}
							<p class="look-reminder" data-reward data-reward-variant="1">
								<svg class="eyes" viewBox="0 0 48 24" focusable="false" aria-hidden="true">
									<ellipse cx="12" cy="12" rx="10" ry="8" />
									<ellipse cx="36" cy="12" rx="10" ry="8" />
									<circle class="pupil" cx="13" cy="10" r="4" />
									<circle class="pupil" cx="37" cy="10" r="4" />
								</svg>
								<span>{lookReminderText}</span>
							</p>
						{:else if away}
							<p class="notice" data-keep-typing>{m.game_shared_keep_typing()}</p>
						{:else if capsHelp}
							{#if voice?.has(capsLockText)}
								<!-- Once recorded, the help can be heard (audit P-12); the keys stay in the field. -->
								<div class="caps-help">
									<p class="notice">{capsLockText}</p>
									<span {@attach leaveFocusInField}>
										<ListenButton text={capsLockText} player={voice} />
									</span>
								</div>
							{:else}
								<p class="notice">{capsLockText}</p>
							{/if}
						{/if}
					</div>
					<!-- Said by the announcement of the game already, which names the character to erase. -->
					{#if erasing && !away}
						<p class="notice" aria-hidden="true" data-erase-reminder>
							{m.game_shared_erase_reminder()}
						</p>
					{/if}
				</div>
				<div class="dd-visually-hidden">
					<label for={INPUT_ID}>{m.game_shared_input_label()}</label>
					<KeyboardCaptureField bind:this={field} id={INPUT_ID} rows={1} onevent={onRawEvent} />
				</div>
			</div>
		{/if}

		{#if aside}
			<div class="aside">
				{@render aside(view)}
			</div>
		{/if}
	</div>

	{#if settings.showKeyboard && !inFinale}
		<div class="bottom">
			<KeyboardView
				{layout}
				{geometry}
				{fingering}
				target={lit.target}
				marked={lit.modifiers}
				wrongCode={game.wrongCode}
				showFingers={true}
				colors={settings.keyboardColors}
				{hands}
				still={settings.reducedMotion}
				{noteCode}
				{faded}
			/>
		</div>
	{/if}

	<div class="dd-visually-hidden" role="status" data-game-announcement>
		{#key announcementKey}<span>{announcement}</span>{/key}
	</div>
</div>

<!-- Hidden behind the settings: back from them, it opens again with the focus on "Resume". -->
{#if paused && !suspended}
	<div class="backdrop">
		<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="game-pause-title">
			<h2 id="game-pause-title">{m.game_shared_pause_title()}</h2>
			<p>{pauseText}</p>
			<div class="actions">
				<Button {@attach focusOnMount} onclick={resume}>{m.game_shared_resume()}</Button>
				{#if ghost && racing}
					<Button variant="secondary" onclick={leaveRace}>{m.game_shared_race_leave()}</Button>
				{/if}
				<Button variant="secondary" onclick={onQuit}>{m.game_shared_quit()}</Button>
				{#if onSettings}
					<Button variant="quiet" onclick={onSettings}>{m.play_settings_open()}</Button>
				{/if}
			</div>
			<p class="note">{m.game_shared_quit_note()}</p>
		</div>
	</div>
{/if}

<style>
	/*
	 * One screen: the game is as tall as the screen. The first and last rows share what is left of
	 * the height, so that the game sits in the middle of a tall screen; on a short one they are empty
	 * and the game starts at the top, Pause in view (centring the rows would push it out of reach).
	 */
	.game {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: 1fr auto auto auto 1fr;
		block-size: var(--dd-size-viewport-full);
		max-inline-size: var(--dd-size-page-game);
		margin-inline: auto;
		padding: var(--dd-space-sm) var(--dd-space-lg);
	}

	.top {
		grid-row: 2;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-md);
	}

	/* The race takes the room left between the progress of the game and the pause button. */
	.race {
		flex: 1 1 var(--dd-size-race-track-min);
		min-inline-size: 0;
	}

	/* On one line when there is room; on a narrow page, the text goes below the scene. */
	.stage {
		grid-row: 3;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-lg) var(--dd-space-xl);
		margin-block: var(--dd-space-sm);
	}

	.stage[data-arrangement='side'] .text-zone {
		flex: 1 1 var(--dd-size-text-zone-side-min);
	}

	/*
	 * The scene grows first, up to the widest the height of the screen allows (`scene-fit`); the
	 * text takes the rest, never less than its longest word: a long word narrows the scene rather
	 * than sending the text under it.
	 */
	.stage[data-arrangement='wide'] .scene {
		display: grid;
		flex: 999 1 var(--dd-size-scene-min);
		justify-items: center;
		max-inline-size: var(--dd-size-scene-fit);
	}

	/* The scene takes the height left by the text and the keyboard, between its two sizes. */
	.game[data-arrangement='stacked'] {
		grid-template-rows:
			1fr auto minmax(var(--dd-size-scene-stacked-min), var(--dd-size-scene-stacked-max))
			auto auto 1fr;
	}

	.stage[data-arrangement='stacked'] {
		display: contents;
	}

	/* A definite row, so that the picture can take the whole height of its cell. */
	.stage[data-arrangement='stacked'] .scene {
		grid-row: 3;
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		min-block-size: 0;
		margin-block-start: var(--dd-space-sm);
	}

	/* The finger hint goes beside the text: the line saved goes to the scene. */
	.stage[data-arrangement='stacked'] .text-zone,
	.stage[data-arrangement='stacked'] .finale {
		grid-row: 4;
		margin-block: var(--dd-space-sm);
	}

	.stage[data-arrangement='stacked'] .text-zone {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
	}

	.game[data-arrangement='stacked'] .bottom {
		grid-row: 5;
	}

	.text-zone,
	.finale {
		position: relative;
		display: grid;
		gap: var(--dd-space-sm);
		align-content: center;
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: transparent;
		border-radius: var(--dd-radius-lg);
	}

	.stage[data-arrangement='wide'] .text-zone,
	.stage[data-arrangement='wide'] .finale {
		flex: 1 1 var(--dd-size-text-zone-min);
	}

	.finale {
		justify-items: center;
		text-align: center;
	}

	.text-zone:focus-within {
		border-color: var(--dd-color-focus-ring);
	}

	/* Tight lines: a notice on two lines (what to erase first) keeps the game on a short laptop. */
	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	.caps-help {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
	}

	/* The hint, the reminder and the Caps Lock notice share one cell, as tall as the tallest. */
	.slot {
		display: grid;
		justify-items: center;
		align-items: center;
		min-block-size: calc(
			var(--dd-font-size-xl) * 1.3 + var(--dd-space-sm) * 2 + var(--dd-border-width-thick) * 2
		);
	}

	.slot > * {
		grid-area: 1 / 1;
	}

	.hint {
		min-block-size: calc(var(--dd-font-size-xl) * 1.3);
	}

	/*
	 * Over the bottom of the text zone, growing upwards: on two lines (a narrow text zone) it covers
	 * the group just typed instead of pushing the keyboard down.
	 */
	.look-reminder {
		position: absolute;
		inset-inline: var(--dd-space-md);
		inset-block-end: var(--dd-space-md);
		justify-content: center;
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-accent-base);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
	}

	.eyes {
		inline-size: calc(var(--dd-size-icon) * 2.5);
		block-size: auto;
		flex: none;
	}

	.eyes ellipse {
		fill: var(--dd-color-companion-eye);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.eyes .pupil {
		fill: var(--dd-color-companion-line);
	}

	.bottom {
		grid-row: 4;
		display: grid;
		justify-items: center;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--dd-z-index-modal);
		display: grid;
		place-content: center;
		padding: var(--dd-space-lg);
		background-color: var(--dd-color-surface-base);
	}

	.dialog {
		display: grid;
		gap: var(--dd-space-lg);
		justify-items: center;
		max-inline-size: var(--dd-size-panel-max);
		padding: var(--dd-space-2xl);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		text-align: center;
	}

	.dialog h2 {
		font-size: var(--dd-font-size-2xl);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.note {
		color: var(--dd-color-text-secondary);
	}
</style>
