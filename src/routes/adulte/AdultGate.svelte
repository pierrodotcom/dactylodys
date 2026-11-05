<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { isCodeAnswer, type StoredCode } from './adult-storage';
	import { isGateAnswer, pickGateNumber, type GateNumber } from './gate';

	interface Props {
		numbers: readonly GateNumber[];
		/** Injected so that the number asked for can be chosen in tests. */
		rng: () => number;
		code: StoredCode;
		codeLength: number;
		onenter: () => void;
		onleave: () => void;
	}

	let { numbers, rng, code, codeLength, onenter, onleave }: Props = $props();

	// The first number is drawn once, when the gate opens; another one only after a wrong answer.
	// svelte-ignore state_referenced_locally
	let asked = $state.raw<GateNumber>(pickGateNumber(numbers, rng, null));
	let answer = $state('');
	/** Wrong answers so far: each one is told again, even with the same words. */
	let wrongCount = $state(0);
	let input = $state<HTMLInputElement | null>(null);

	const useCode = $derived(code.status === 'set');

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const right = useCode ? isCodeAnswer(code, answer) : isGateAnswer(asked, answer);
		if (right) {
			onenter();
			return;
		}
		wrongCount += 1;
		answer = '';
		if (!useCode) asked = pickGateNumber(numbers, rng, asked.value);
		input?.focus();
	}
</script>

<ScreenFrame title={m.adult_title()} back={{ label: m.adult_back_to_players(), onclick: onleave }}>
	<form class="gate" onsubmit={submit} data-adult-gate>
		{#if useCode}
			<p>{m.adult_code_intro({ length: codeLength })}</p>
			<label class="field">
				<span>{m.adult_code_label()}</span>
				<input
					bind:this={input}
					bind:value={answer}
					type="password"
					inputmode="numeric"
					autocomplete="off"
					maxlength={codeLength}
					data-adult-code
				/>
			</label>
		{:else}
			<p id="gate-intro">{m.adult_gate_intro()}</p>
			<p class="words" id="gate-words" data-gate-words>{asked.words}</p>
			<label class="field">
				<span>{m.adult_gate_answer_label()}</span>
				<input
					bind:this={input}
					bind:value={answer}
					type="text"
					inputmode="numeric"
					autocomplete="off"
					aria-describedby="gate-words"
					data-gate-answer
				/>
			</label>
		{/if}
		<Button type="submit">{m.adult_gate_enter()}</Button>
		<p class="status" role="status">
			{#key wrongCount}
				{#if wrongCount > 0}
					<span>{useCode ? m.adult_code_wrong() : m.adult_gate_wrong()}</span>
				{/if}
			{/key}
		</p>
		{#if useCode}
			<details class="forgotten">
				<summary>{m.adult_code_forgotten_title()}</summary>
				<p>{m.adult_code_forgotten_text()}</p>
			</details>
		{/if}
	</form>
</ScreenFrame>

<style>
	.gate {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
		max-inline-size: var(--dd-size-panel-max);
	}

	.words {
		font-size: var(--dd-font-size-2xl);
		font-weight: var(--dd-font-weight-bold);
	}

	.field {
		display: grid;
		gap: var(--dd-space-xs);
		justify-items: center;
		font-weight: var(--dd-font-weight-bold);
	}

	input {
		min-block-size: var(--dd-size-touch-target-min);
		inline-size: var(--dd-size-control-min);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-xl);
		text-align: center;
	}

	.status {
		min-block-size: var(--dd-size-touch-target-min);
	}

	.forgotten {
		text-align: start;
	}

	summary {
		display: flex;
		align-items: center;
		justify-content: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
		cursor: pointer;
	}
</style>
