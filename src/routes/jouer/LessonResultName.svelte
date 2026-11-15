<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import CompanionName from './CompanionName.svelte';

	interface Props {
		/** The name the companion has now; empty while it has none. */
		name: string;
		/** Ideas of the catalogue: one click names the companion. */
		suggestions: readonly string[];
		onname: (name: string) => void;
		/** "Later": the question is not asked again during this visit. */
		onlater: () => void;
		oncontinue: () => void;
		onmap: () => void;
	}

	let { name, suggestions, onname, onlater, oncontinue, onmap }: Props = $props();

	let answer = $state<HTMLElement | null>(null);
	/** Once named, the companion thanks the child, here, before the result. */
	const named = $derived(name.trim() !== '');

	async function give(given: string) {
		onname(given);
		// The form gives way to the thanks: the keyboard goes on to the only way left.
		await tick();
		answer?.querySelector<HTMLElement>('[data-result-continue]')?.focus();
	}
</script>

<ScreenFrame
	title={m.play_reward_name_question()}
	wide
	back={{ label: m.play_result_map(), onclick: onmap }}
>
	<div class="step" data-result-step="name">
		<div class="companion">
			<Companion mood={named ? 'cheer' : 'happy'} />
		</div>
		<div class="answer" bind:this={answer}>
			<p class="dd-visually-hidden" role="status">
				{named ? m.play_companion_named({ name }) : ''}
			</p>
			{#if named}
				<p class="thanks" aria-hidden="true">{m.play_companion_named({ name })}</p>
				<Button onclick={oncontinue} data-result-continue>{m.play_result_continue()}</Button>
			{:else}
				<CompanionName id="result-name" name="" {suggestions} onname={give} {onlater} wide />
			{/if}
		</div>
	</div>
</ScreenFrame>

<style>
	.step {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-lg);
		inline-size: 100%;
	}

	.answer {
		display: grid;
		flex: 1 1 var(--dd-size-panel-max);
		gap: var(--dd-space-md);
		justify-items: center;
	}

	.thanks {
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
