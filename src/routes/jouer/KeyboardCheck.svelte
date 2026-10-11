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
	import { checkOutcome, chooseCheckSteps, stepMatches, type CheckStep } from './keyboard-check';
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

	let stage = $state<'layout' | 'keys' | 'result'>('layout');
	let selected = $state<LayoutId>(untrack(() => layoutId));
	let steps = $state.raw<readonly CheckStep[]>([]);
	let matches = $state.raw<readonly boolean[]>([]);
	let loadFailed = $state(false);
	let field: KeyboardCaptureField | undefined = $state();

	const normalizer = createInputNormalizer();
	const options = LAYOUT_IDS.map((id) => ({ value: id, label: LAYOUT_LABELS[id]() }));
	const step = $derived(steps[matches.length]);
	const outcome = $derived(checkOutcome(matches));

	async function chooseLayout() {
		loadFailed = false;
		try {
			const layout = await loadLayout(selected);
			steps = chooseCheckSteps(layout, codes);
			if (selected !== layoutId) await onlayout(selected);
		} catch {
			loadFailed = true;
			return;
		}
		matches = [];
		stage = steps.length === 0 ? 'result' : 'keys';
		await tick();
		field?.focus();
	}

	function onRawEvent(event: RawInputEvent) {
		for (const keystroke of normalizer.push(event)) {
			if (keystroke.kind !== 'char' || step === undefined) continue;
			matches = [...matches, stepMatches(step, keystroke)];
			field?.clear();
			if (matches.length === steps.length) stage = 'result';
		}
	}

	function keepFocus(event: MouseEvent) {
		if (stage === 'keys' && !(event.target as Element).closest('button')) field?.focus();
	}
</script>

<svelte:window onclick={keepFocus} />

{#if stage === 'layout'}
	<ScreenFrame title={m.play_check_title()}>
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
		<div class="actions">
			<Button onclick={chooseLayout}>{m.play_check_continue()}</Button>
			<Button variant="quiet" onclick={onchangeplayer}>{m.play_change_player()}</Button>
		</div>
	</ScreenFrame>
{:else if stage === 'keys' && step !== undefined}
	<ScreenFrame title={m.play_check_prompt({ key: step.label })} focusHeading={false}>
		<p class="progress" role="status">
			{m.play_check_step({ position: matches.length + 1, total: steps.length })}
		</p>
		<div class="tile-zone">
			<span class="tile" aria-hidden="true">{step.label}</span>
		</div>
		<p class="intro">{m.play_check_prompt_hint()}</p>
		<div class="dd-visually-hidden">
			<label for={INPUT_ID}>{m.play_check_prompt({ key: step.label })}</label>
			<KeyboardCaptureField bind:this={field} id={INPUT_ID} rows={1} onevent={onRawEvent} />
		</div>
	</ScreenFrame>
{:else}
	<ScreenFrame title={outcome === 'match' ? m.play_check_ok_title() : m.play_check_diff_title()}>
		<Companion mood={outcome === 'match' ? 'cheer' : 'happy'} />
		<p class="intro">
			{outcome === 'match' ? m.play_check_ok_text() : m.play_check_diff_text()}
		</p>
		<Button {@attach focusOnMount} onclick={ondone}>{m.play_check_continue()}</Button>
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

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.tile-zone {
		padding: var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: transparent;
		border-radius: var(--dd-radius-lg);
	}

	.tile-zone:focus-within {
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
</style>
