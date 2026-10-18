<script lang="ts">
	import { onMount, tick, untrack, type Snippet } from 'svelte';
	import { createInputNormalizer } from '$lib/keyboard/input-adapter';
	import type { RawInputEvent } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import TargetText from '$lib/ui/components/TargetText.svelte';
	import { focusOnMount, focusSoon } from '$lib/ui/focus';
	import KeyboardCaptureField from '$lib/ui/keyboard-capture/KeyboardCaptureField.svelte';
	import type { GameProps } from '../types';
	import { readDurationToken } from '$lib/ui/motion';
	import {
		createGame,
		exerciseOutcome,
		reduce,
		type GameAction,
		type GameState
	} from './game-state';
	import { viewOf, type GameView } from './game-view';
	import { isGuided } from '$lib/engine/progression/guide';
	import { isLookReminderDue, needsCapsLockHelp } from './help';
	import { targetKeyPress } from './target';

	interface Props extends GameProps {
		/** Name of the game, for screen readers. */
		title: string;
		/** One kind sentence shown while the game is paused. */
		pauseText: string;
		/**
		 * `side`: scene, text and aside on one line; `wide`: a wider scene beside the text, above it when
		 * the room is short; `stacked`: the scene across the page, as tall as the screen allows, the text
		 * below it and the keyboard at the bottom, all on one screen.
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

	let {
		exercise,
		layout,
		charIndex,
		geometry,
		fingering,
		settings,
		sounds,
		onComplete,
		onQuit,
		onSettings,
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

	let game = $state.raw<GameState>(
		untrack(() =>
			createGame(exercise.groups, settings.errorPolicy, { finale: finale !== undefined })
		)
	);
	let capsLock = $state(false);
	let field: KeyboardCaptureField | undefined = $state();
	let reported = false;

	const normalizer = createInputNormalizer();

	const view = $derived(viewOf(game, settings.reducedMotion, settings.scenes));
	const phase = $derived(game.phase);
	const paused = $derived(game.paused);
	const mood = $derived(game.mood);
	const typing = $derived(phase === 'typing');
	const inFinale = $derived(phase === 'finale');
	const expected = $derived(view.group[view.position]);
	const target = $derived(typing ? targetKeyPress(charIndex, expected) : null);
	const capsHelp = $derived(typing && needsCapsLockHelp(capsLock, expected));
	const announcement = $derived(announce(view));
	// A group typed without a single mistake sends a music note out of its last key.
	const noteCode = $derived.by(() => {
		if (phase !== 'celebrating') return null;
		const done = game.finished[game.finished.length - 1];
		if (done === undefined || done.errorCount > 0) return null;
		return targetKeyPress(charIndex, view.group[view.group.length - 1])?.code ?? null;
	});
	const lookReminder = $derived(
		phase === 'celebrating' &&
			isLookReminderDue(view.completed, view.total, settings.lookReminderEvery)
	);
	const lookReminderText = m.game_shared_look_reminder();
	const guide = $derived(settings.guide);
	// A child who waits long on a key is helped: the hand shows it, then goes back to the new keys.
	let hesitated = $state(false);
	const guided = $derived(
		typing && isGuided(guide.mode, expected, guide.freshChars, game.errorIndex !== null, hesitated)
	);
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
		const step = reduce(game, action);
		if (step.state === game) return;
		const groupChanged = step.state.groupIndex !== game.groupIndex;
		game = step.state;
		for (const sound of step.sounds) sounds.play(sound);
		if (groupChanged) field?.clear();
		if (step.state.phase === 'complete' && !reported) {
			reported = true;
			onComplete(exerciseOutcome(step.state));
		}
	}

	function onRawEvent(event: RawInputEvent) {
		if (event.capsLock !== undefined) capsLock = event.capsLock;
		for (const keystroke of normalizer.push(event)) dispatch({ type: 'keystroke', keystroke });
	}

	async function resume() {
		dispatch({ type: 'resume' });
		normalizer.reset();
		await tick();
		field?.focus();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.repeat) return;
		if (paused) void resume();
		else dispatch({ type: 'pause' });
	}

	function keepFocus(event: MouseEvent) {
		if (paused) return;
		if (!(event.target as Element).closest('button')) field?.focus();
	}

	onMount(() => {
		field?.focus();
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
		if (!typing || paused || guide.mode !== 'new-keys' || guide.hesitationMs <= 0) return;
		const timer = setTimeout(() => (hesitated = true), guide.hesitationMs);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (!lookReminder || !voice) return;
		const speaker = voice;
		void speaker.speak(lookReminderText);
		return () => speaker.stop();
	});

	$effect(() => {
		if (mood !== 'oops') return;
		const timer = setTimeout(() => dispatch({ type: 'calm' }), readDurationToken(NOTICE_TOKEN));
		return () => clearTimeout(timer);
	});
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={keepFocus} />

<div
	class="game"
	inert={paused}
	data-arrangement={arrangement}
	data-reduced-motion={settings.reducedMotion || undefined}
>
	<h1 class="dd-visually-hidden">{title}</h1>

	<header class="top">
		{@render progress(view)}
		{#if !inFinale}
			<Button variant="secondary" onclick={() => dispatch({ type: 'pause' })}>
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
				/>
				<!-- One place for what comes and goes (finger, reminder, Caps Lock): nothing below it moves. -->
				<div class="slot">
					{#if settings.showKeyboard}
						<div class="hint">
							{#if typing && !capsHelp}
								<FingerHint {target} {layout} {fingering} />
							{/if}
						</div>
					{/if}
					<div role="status" class="alert">
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
						{:else if capsHelp}
							<p class="notice">{m.game_shared_caps_lock()}</p>
						{/if}
					</div>
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
				{target}
				wrongCode={game.wrongCode}
				showFingers={true}
				{hands}
				still={settings.reducedMotion}
				{noteCode}
			/>
		</div>
	{/if}

	<div class="dd-visually-hidden" role="status">{announcement}</div>
</div>

{#if paused}
	<div class="backdrop">
		<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="game-pause-title">
			<h2 id="game-pause-title">{m.game_shared_pause_title()}</h2>
			<p>{pauseText}</p>
			<div class="actions">
				<Button {@attach focusOnMount} onclick={resume}>{m.game_shared_resume()}</Button>
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
	.game {
		display: grid;
		gap: var(--dd-space-lg);
		max-inline-size: var(--dd-size-page-wide);
		margin: auto;
		padding: var(--dd-space-lg);
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-md);
	}

	.stage {
		display: grid;
		align-items: center;
		gap: var(--dd-space-xl);
	}

	.stage[data-arrangement='side'] {
		grid-template-columns: auto 1fr;
	}

	.stage[data-arrangement='side'][data-aside] {
		grid-template-columns: auto 1fr auto;
	}

	.stage[data-arrangement='wide'] {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	.stage[data-arrangement='wide'] .scene {
		flex: 0 1 var(--dd-size-scene-max);
	}

	/* One screen, without scrolling: the scene takes the height left by the text and the keyboard. */
	.game[data-arrangement='stacked'] {
		grid-template-rows: auto minmax(
				var(--dd-size-scene-stacked-min),
				var(--dd-size-scene-stacked-max)
			);
		align-content: center;
		gap: var(--dd-space-sm);
		block-size: var(--dd-size-viewport-full);
		padding-block: var(--dd-space-sm);
	}

	.stage[data-arrangement='stacked'] {
		display: contents;
	}

	/* A definite row, so that the picture can take the whole height of its cell. */
	.stage[data-arrangement='stacked'] .scene {
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		min-block-size: 0;
	}

	/* The finger hint goes beside the text: the line saved goes to the scene. */
	.stage[data-arrangement='stacked'] .text-zone {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		padding-block: var(--dd-space-sm);
	}

	.text-zone,
	.finale {
		position: relative;
		display: grid;
		gap: var(--dd-space-md);
		align-content: center;
		padding: var(--dd-space-md);
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

	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
		font-weight: var(--dd-font-weight-bold);
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

	.look-reminder {
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
