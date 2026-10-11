<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { createSoundPlayer } from '$lib/audio';
	import { createInputNormalizer } from '$lib/keyboard/input-adapter';
	import type { RawInputEvent } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import TargetText from '$lib/ui/components/TargetText.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import KeyboardCaptureField from '$lib/ui/keyboard-capture/KeyboardCaptureField.svelte';
	import type { GameProps } from '../types';
	import { readDurationToken } from './duration';
	import EggRow from './EggRow.svelte';
	import HatchEgg from './HatchEgg.svelte';
	import { needsCapsLockHelp } from './help';
	import { CRACK_COUNT } from './shapes';
	import {
		createHatching,
		crackStage,
		exerciseMetrics,
		hatchedCount,
		reduce,
		type HatchingAction,
		type HatchingState
	} from './state';
	import { targetKeyPress } from './target';

	const CRIES = [
		m.game_hatching_cry_1,
		m.game_hatching_cry_2,
		m.game_hatching_cry_3,
		m.game_hatching_cry_4,
		m.game_hatching_cry_5,
		m.game_hatching_cry_6,
		m.game_hatching_cry_7,
		m.game_hatching_cry_8,
		m.game_hatching_cry_9,
		m.game_hatching_cry_10
	];
	const CELEBRATION_TOKEN = '--dd-duration-celebration';
	const NOTICE_TOKEN = '--dd-duration-notice';
	const INPUT_ID = 'hatching-input';

	let {
		exercise,
		layout,
		charIndex,
		geometry,
		fingering,
		settings,
		onComplete,
		onQuit
	}: GameProps = $props();

	let game = $state.raw<HatchingState>(
		untrack(() => createHatching(exercise.groups, settings.errorPolicy))
	);
	let capsLock = $state(false);
	let field: KeyboardCaptureField | undefined = $state();
	let reported = false;

	const normalizer = createInputNormalizer();
	const player = createSoundPlayer({ isEnabled: () => settings.soundEnabled });

	const phase = $derived(game.phase);
	const paused = $derived(game.paused);
	const mood = $derived(game.mood);
	const group = $derived(game.session.target);
	const position = $derived(game.session.position);
	const hatched = $derived(phase !== 'typing');
	const cry = $derived(CRIES[game.groupIndex % CRIES.length]?.() ?? '');
	const target = $derived(phase === 'typing' ? targetKeyPress(charIndex, group[position]) : null);
	const stage = $derived(hatched ? 0 : crackStage(position, group.length, CRACK_COUNT));
	const capsHelp = $derived(phase === 'typing' && needsCapsLockHelp(capsLock, group[position]));
	const announcement = $derived.by(() => {
		if (phase === 'typing') return '';
		return game.groupIndex === game.groups.length - 1
			? m.game_hatching_announce_last()
			: m.game_hatching_announce_hatched({ cry });
	});

	function dispatch(action: HatchingAction) {
		const step = reduce(game, action);
		if (step.state === game) return;
		const groupChanged = step.state.groupIndex !== game.groupIndex;
		game = step.state;
		for (const sound of step.sounds) player.play(sound);
		if (groupChanged) field?.clear();
		if (step.state.phase === 'complete' && !reported) {
			reported = true;
			onComplete({ metrics: exerciseMetrics(step.state) });
		}
	}

	function onRawEvent(event: RawInputEvent) {
		for (const keystroke of normalizer.push(event)) dispatch({ type: 'keystroke', keystroke });
	}

	async function resume() {
		dispatch({ type: 'resume' });
		normalizer.reset();
		await tick();
		field?.focus();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		capsLock = event.getModifierState('CapsLock');
		if (event.key !== 'Escape' || event.repeat) return;
		if (paused) void resume();
		else dispatch({ type: 'pause' });
	}

	function onWindowKeyup(event: KeyboardEvent) {
		capsLock = event.getModifierState('CapsLock');
	}

	function keepFocus(event: MouseEvent) {
		if (paused) return;
		if (!(event.target as Element).closest('button')) field?.focus();
	}

	onMount(() => {
		field?.focus();
		return () => player.dispose();
	});

	$effect(() => {
		if (phase !== 'hatched' || paused) return;
		const timer = setTimeout(
			() => dispatch({ type: 'advance' }),
			readDurationToken(CELEBRATION_TOKEN)
		);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		if (mood !== 'oops') return;
		const timer = setTimeout(() => dispatch({ type: 'calm' }), readDurationToken(NOTICE_TOKEN));
		return () => clearTimeout(timer);
	});
</script>

<svelte:window onkeydown={onWindowKeydown} onkeyup={onWindowKeyup} onclick={keepFocus} />

<div class="game" inert={paused} data-reduced-motion={settings.reducedMotion || undefined}>
	<h1 class="dd-visually-hidden">{m.game_hatching_title()}</h1>

	<header class="top">
		<EggRow
			total={game.groups.length}
			hatched={hatchedCount(game)}
			current={phase === 'typing' ? game.groupIndex : -1}
			{stage}
		/>
		<Button variant="secondary" onclick={() => dispatch({ type: 'pause' })}>
			{m.game_hatching_pause()}
		</Button>
	</header>

	<div class="stage">
		<div class="egg-zone">
			<div class="bubble-row">
				{#if phase !== 'typing'}
					<p class="bubble" aria-hidden="true">{cry}</p>
				{/if}
			</div>
			<div class="egg">
				<HatchEgg {stage} {hatched} variant={game.groupIndex} big />
			</div>
		</div>

		<div class="text-zone">
			<TargetText
				graphemes={group}
				position={hatched ? group.length : position}
				errorIndex={game.errorIndex}
			/>
			{#if settings.showKeyboard}
				<div class="hint">
					{#if phase === 'typing'}
						<FingerHint {target} {layout} {fingering} />
					{/if}
				</div>
			{/if}
			<div role="status">
				{#if capsHelp}
					<p class="notice">{m.game_hatching_caps_lock()}</p>
				{/if}
			</div>
			<div class="dd-visually-hidden">
				<label for={INPUT_ID}>{m.game_hatching_input_label()}</label>
				<KeyboardCaptureField bind:this={field} id={INPUT_ID} rows={1} onevent={onRawEvent} />
			</div>
		</div>

		<Companion {mood} />
	</div>

	{#if settings.showKeyboard}
		<div class="bottom">
			<KeyboardView
				{layout}
				{geometry}
				{fingering}
				{target}
				wrongCode={game.wrongCode}
				showFingers={true}
			/>
		</div>
	{/if}

	<div class="dd-visually-hidden" role="status">{announcement}</div>
</div>

{#if paused}
	<div class="backdrop">
		<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="hatching-pause-title">
			<h2 id="hatching-pause-title">{m.game_hatching_pause_title()}</h2>
			<p>{m.game_hatching_pause_text()}</p>
			<div class="actions">
				<Button {@attach focusOnMount} onclick={resume}>{m.game_hatching_resume()}</Button>
				<Button variant="secondary" onclick={onQuit}>{m.game_hatching_quit()}</Button>
			</div>
			<p class="note">{m.game_hatching_quit_note()}</p>
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
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--dd-space-xl);
	}

	.egg-zone {
		display: grid;
		justify-items: center;
		gap: var(--dd-space-sm);
	}

	.egg {
		inline-size: var(--dd-size-egg);
	}

	.bubble-row {
		display: grid;
		align-items: end;
		min-block-size: calc(var(--dd-font-size-xl) * 2);
	}

	.bubble {
		position: relative;
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-bubble-border);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-bubble-surface);
		color: var(--dd-color-bubble-text);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
		animation-name: pop;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	.text-zone {
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

	.hint {
		min-block-size: calc(var(--dd-font-size-xl) * 1.3);
	}

	.bottom {
		display: grid;
		justify-items: center;
	}

	[data-reduced-motion] .bubble {
		animation-name: none;
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

	@keyframes pop {
		0% {
			scale: 0.6;
		}

		100% {
			scale: 1;
		}
	}
</style>
