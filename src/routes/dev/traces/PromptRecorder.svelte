<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { replayEvents } from '$lib/keyboard/trace';
	import type { RawInputEvent } from '$lib/keyboard/types';
	import KeyboardCaptureField from '$lib/ui/keyboard-capture/KeyboardCaptureField.svelte';
	import { isRecorded, type TracePrompt } from './recording';

	interface Props {
		prompt: TracePrompt;
		position: number;
		total: number;
		events: RawInputEvent[];
	}

	let { prompt, position, total, events = $bindable() }: Props = $props();

	let field: KeyboardCaptureField | undefined = $state();

	const rebuilt = $derived(replayEvents(events));
	const status = $derived(
		!isRecorded(events) ? 'idle' : rebuilt === prompt.text ? 'same' : 'different'
	);
	const MARKS = { idle: '○', same: '✓', different: '✗' } as const;

	function restart() {
		events = [];
		field?.clear();
		field?.focus();
	}
</script>

<article class="prompt" aria-labelledby="prompt-{position}-title">
	<h3 id="prompt-{position}-title">
		{m.traces_prompt_heading({ position, total, title: prompt.title })}
	</h3>
	<p class="instruction">{prompt.instruction}</p>

	<dl>
		<div>
			<dt>{m.traces_prompt_expected_label()}</dt>
			<dd class="text">{prompt.text}</dd>
		</div>
	</dl>

	<label class="input-label" for="prompt-{position}-input">
		{m.traces_prompt_input_label({ position })}
	</label>
	<KeyboardCaptureField
		bind:this={field}
		id="prompt-{position}-input"
		onevent={(event) => events.push(event)}
	/>

	<dl>
		<div>
			<dt>{m.traces_prompt_rebuilt_label()}</dt>
			<dd class="text" data-testid="rebuilt-text">{rebuilt}</dd>
		</div>
	</dl>

	<div class="footer">
		<p class="status {status}" role="status">
			<span class="mark" aria-hidden="true">{MARKS[status]}</span>
			<span>
				{#if status === 'same'}
					{m.traces_status_same()}
				{:else if status === 'different'}
					{m.traces_status_different()}
				{:else}
					{m.traces_status_idle()}
				{/if}
			</span>
		</p>
		<button
			type="button"
			onclick={restart}
			aria-label={m.traces_prompt_restart_label({ position })}
		>
			{m.traces_prompt_restart()}
		</button>
	</div>
</article>

<style>
	.prompt {
		display: grid;
		gap: var(--dd-space-md);
		padding: var(--dd-space-lg);
		border-width: var(--dd-border-width-thin);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
	}

	h3 {
		font-size: var(--dd-font-size-xl);
	}

	.instruction {
		color: var(--dd-color-text-secondary);
	}

	dl {
		margin: 0;
	}

	dt {
		font-weight: var(--dd-font-weight-bold);
	}

	dd {
		margin: 0;
	}

	.text {
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
		font-family: var(--dd-font-family-mono);
		font-size: var(--dd-font-size-lg);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.input-label {
		font-weight: var(--dd-font-weight-bold);
	}

	.footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-md);
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-radius: var(--dd-radius-pill);
		font-weight: var(--dd-font-weight-bold);
	}

	.status.idle {
		border-color: var(--dd-color-border-strong);
		color: var(--dd-color-text-secondary);
	}

	.status.same {
		border-color: var(--dd-color-success-text);
		background-color: var(--dd-color-success-surface);
		color: var(--dd-color-success-text);
	}

	.status.different {
		border-color: var(--dd-color-error-text);
		background-color: var(--dd-color-error-surface);
		color: var(--dd-color-error-text);
	}

	.mark {
		font-size: var(--dd-font-size-lg);
	}

	button {
		min-block-size: var(--dd-size-touch-target-min);
		min-inline-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-accent-base);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-accent-base);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
		font-weight: var(--dd-font-weight-bold);
		cursor: pointer;
	}

	button:hover {
		border-color: var(--dd-color-accent-hover);
		color: var(--dd-color-accent-hover);
	}
</style>
