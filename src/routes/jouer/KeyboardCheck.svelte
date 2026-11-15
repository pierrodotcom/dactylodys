<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { LAYOUT_IDS, type LayoutId } from '$lib/keyboard/layout-ids';
	import { createInputNormalizer } from '$lib/keyboard/input-adapter';
	import { loadLayout } from '$lib/keyboard/registry';
	import type { RawInputEvent } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import KeyboardCaptureField from '$lib/ui/keyboard-capture/KeyboardCaptureField.svelte';
	import { keepTyping } from '$lib/ui/keyboard-capture/typing-focus';
	import {
		chooseCheckSteps,
		currentStep,
		needsAdultHelp,
		reduceCheck,
		startCheck,
		type CheckAction,
		type CheckState
	} from './keyboard-check';
	import { LAYOUT_LABELS } from './labels';

	interface Props {
		layoutId: LayoutId;
		codes: readonly string[];
		/** Remembers the layout the child chose. */
		onlayout: (layoutId: LayoutId) => Promise<void>;
		ondone: () => void;
		onchangeplayer: () => void;
	}

	let { layoutId, codes, onlayout, ondone, onchangeplayer }: Props = $props();

	const INPUT_ID = 'keyboard-check-input';
	const WAY_OUT = '[data-screen-back] button';
	/** What the result says, read with the button the screen opens on. */
	const RESULT_TITLE_ID = 'keyboard-check-result-title';
	const RESULT_TEXT_ID = 'keyboard-check-result-text';
	const RESULT_IDS = `${RESULT_TITLE_ID} ${RESULT_TEXT_ID}`;
	const ANYWAY_NOTE_ID = 'keyboard-check-anyway-note';

	let selected = $state<LayoutId>(untrack(() => layoutId));
	/** `null` until the layout is chosen; then the keys asked for, then the result. */
	let check = $state.raw<CheckState | null>(null);
	let capsLock = $state(false);
	let loadFailed = $state(false);
	let field: KeyboardCaptureField | undefined = $state();

	const normalizer = createInputNormalizer();
	const options = LAYOUT_IDS.map((id) => ({ value: id, label: LAYOUT_LABELS[id]() }));
	const step = $derived(check === null ? undefined : currentStep(check));
	const position = $derived((check?.answers.length ?? 0) + 1);
	const total = $derived(check?.steps.length ?? 0);
	const ready = $derived(check?.outcome === 'match');
	const askAdult = $derived(check !== null && needsAdultHelp(check));
	const resultTitle = $derived(ready ? m.play_check_ok_title() : m.play_check_diff_title());
	// The way out is at the top of the three steps, and Escape takes it (ADR-046).
	const back = $derived({ label: m.play_change_player(), onclick: onchangeplayer });

	async function focusField() {
		await tick();
		field?.focus();
	}

	async function chooseLayout() {
		loadFailed = false;
		try {
			const layout = await loadLayout(selected);
			const steps = chooseCheckSteps(layout, codes);
			if (selected !== layoutId) await onlayout(selected);
			check = startCheck(steps);
		} catch {
			loadFailed = true;
			return;
		}
		await focusField();
	}

	function answer(action: CheckAction) {
		if (check === null) return;
		check = reduceCheck(check, action);
		field?.clear();
	}

	function onRawEvent(event: RawInputEvent) {
		if (event.capsLock !== undefined) capsLock = event.capsLock;
		for (const keystroke of normalizer.push(event)) answer({ type: 'typed', keystroke });
	}

	/** The next key is asked for in the field again, wherever the button was pressed from. */
	async function skipKey() {
		answer({ type: 'not-found' });
		await focusField();
	}

	async function retry() {
		answer({ type: 'retry' });
		normalizer.reset();
		await focusField();
	}

	function keepFocus(event: MouseEvent) {
		if (step !== undefined && !(event.target as Element).closest('button')) field?.focus();
	}

	// The key asked for is taken wherever the focus is, and Tab from the field goes to the way out
	// instead of out of the page; Enter and Space on a button stay the keys of that button.
	function onWindowKeydown(event: KeyboardEvent) {
		if (step === undefined) return;
		keepTyping(event, INPUT_ID, field, document.querySelector<HTMLElement>(WAY_OUT));
	}
</script>

<svelte:window onclick={keepFocus} onkeydown={onWindowKeydown} />

{#if check === null}
	<ScreenFrame title={m.play_check_title()} {back}>
		<p class="intro">{m.play_check_layout_intro()}</p>
		<ChoiceGroup
			legend={m.play_check_layout_legend()}
			name="keyboard-layout"
			{options}
			value={selected}
			onchange={(value) => (selected = value as LayoutId)}
		/>
		{#if loadFailed}
			<p class="error" role="alert">{m.play_error_load()}</p>
		{/if}
		<Button onclick={chooseLayout}>{m.play_check_continue()}</Button>
	</ScreenFrame>
{:else if step !== undefined}
	{@const prompt = m.play_check_prompt({ key: step.label })}
	<ScreenFrame title={prompt} focusHeading={false} {back}>
		<div class="keys">
			<!-- The one live region of the screen: it says each new key, and the help about Caps Lock. -->
			<p class="progress" role="status">
				{m.play_check_step({ position, total })}
				<span class="dd-visually-hidden">
					{prompt}
					{#if capsLock}{m.game_shared_caps_lock()}{/if}
				</span>
			</p>
			<div class="tile-zone">
				<!-- The key as it is printed: one with two characters shows both, the one asked for below. -->
				<span class="tile" aria-hidden="true" data-two={step.above !== null || undefined}>
					{#if step.above !== null}
						<span class="above">{step.above}</span>
					{/if}
					<span>{step.label}</span>
				</span>
			</div>
			<p class="intro">{m.play_check_prompt_hint()}</p>
			{#if capsLock}
				<p class="notice" aria-hidden="true" data-caps-lock>{m.game_shared_caps_lock()}</p>
			{/if}
			<!-- Before the field: Tab reaches it from the way out, and goes back to the field from it. -->
			<Button variant="quiet" onclick={skipKey}>{m.play_check_not_found()}</Button>
			<div class="dd-visually-hidden">
				<label for={INPUT_ID}>{prompt}</label>
				<KeyboardCaptureField bind:this={field} id={INPUT_ID} rows={1} onevent={onRawEvent} />
			</div>
		</div>
	</ScreenFrame>
{:else}
	<ScreenFrame title={resultTitle} focusHeading={false} {back}>
		<Companion mood={ready ? 'cheer' : 'happy'} />
		<!-- The screen opens on its button: what happened is read with it. -->
		<p id={RESULT_TITLE_ID} hidden>{resultTitle}</p>
		<div class="result" id={RESULT_TEXT_ID}>
			<p class="intro">{ready ? m.play_check_ok_text() : m.play_check_diff_text()}</p>
			{#if askAdult}
				<p class="notice" data-ask-adult>{m.play_check_diff_adult()}</p>
			{/if}
		</div>
		{#if ready}
			<Button {@attach focusOnMount} aria-describedby={RESULT_IDS} onclick={ondone}>
				{m.play_check_continue()}
			</Button>
		{:else}
			<Button {@attach focusOnMount} aria-describedby={RESULT_IDS} onclick={retry}>
				{m.play_check_retry()}
			</Button>
			<!-- Nothing locks the game: the child can play, and knows what the help on screen will do. -->
			<div class="anyway">
				<Button variant="quiet" aria-describedby={ANYWAY_NOTE_ID} onclick={ondone}>
					{m.play_check_play_anyway()}
				</Button>
				<p class="note" id={ANYWAY_NOTE_ID}>{m.play_check_play_anyway_note()}</p>
			</div>
		{/if}
	</ScreenFrame>
{/if}

<style>
	.intro {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.progress {
		font-weight: var(--dd-font-weight-bold);
	}

	.error {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}

	/* The children take their place in the screen; the wrapper only tells where the focus is. */
	.keys {
		display: contents;
	}

	.tile-zone {
		padding: var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: transparent;
		border-radius: var(--dd-radius-lg);
	}

	/* The field is hidden: the key asked for shows that the keyboard writes in it. */
	.keys:has(:global(textarea:focus)) .tile-zone {
		border-color: var(--dd-color-focus-ring);
	}

	.tile {
		display: grid;
		place-items: center;
		inline-size: calc(var(--dd-size-key-unit) * 2);
		block-size: calc(var(--dd-size-key-unit) * 2);
		border-width: var(--dd-border-width-target);
		border-style: solid;
		border-color: var(--dd-color-key-target-outline);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-key-surface);
		color: var(--dd-color-key-text);
		font-size: var(--dd-font-size-3xl);
		font-weight: var(--dd-font-weight-bold);
	}

	/* As on the key: the character written with Shift above, the one asked for below, on the left. */
	.tile[data-two] {
		place-items: start;
		align-content: center;
		padding-inline-start: var(--dd-space-md);
		font-size: var(--dd-font-size-2xl);
		line-height: var(--dd-line-height-tight);
	}

	.above {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-regular);
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

	.result,
	.anyway {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.note {
		color: var(--dd-color-text-secondary);
	}
</style>
