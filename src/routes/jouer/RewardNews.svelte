<script lang="ts">
	import { tick } from 'svelte';
	import type { RewardDefinition } from '$lib/engine/rewards';
	import { m } from '$lib/paraglide/messages.js';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import CompanionName from './CompanionName.svelte';

	interface Props {
		/** What was just earned, in the order of the catalogue: one card after the other. */
		rewards: readonly RewardDefinition[];
		/** Identifiers of the items the companion wears now. */
		wornIds: readonly string[];
		/** The companion asks for its name, after the cards. */
		askName: boolean;
		suggestions: readonly string[];
		onwear: (item: RewardDefinition) => void;
		onname: (name: string) => void;
		onlater: () => void;
	}

	let { rewards, wornIds, askName, suggestions, onwear, onname, onlater }: Props = $props();

	let index = $state(0);
	let status = $state('');
	let named = $state(false);
	let cardHeading = $state<HTMLElement | null>(null);
	let statusLine = $state<HTMLElement | null>(null);

	const current = $derived(rewards[Math.min(index, rewards.length - 1)]);
	const hasNext = $derived(index < rewards.length - 1);
	const showQuestion = $derived(askName && !named && !hasNext);
	const shown = $derived(rewards.length > 0 || showQuestion || status !== '');

	async function wear(item: RewardDefinition) {
		onwear(item);
		status = m.play_reward_worn();
		await tick();
		cardHeading?.focus();
	}

	async function next() {
		index += 1;
		status = '';
		await tick();
		cardHeading?.focus();
	}

	async function name(given: string) {
		onname(given);
		named = true;
		status = m.play_companion_named({ name: given });
		await tick();
		statusLine?.focus();
	}

	async function later() {
		onlater();
		await tick();
		cardHeading?.focus();
	}
</script>

{#if shown}
	<section class="news" aria-label={m.play_reward_news_label()}>
		{#if current}
			{#key current.id}
				<article class="card" data-reward-card={current.id}>
					<h2 class="new" tabindex="-1" bind:this={cardHeading}>{m.play_reward_new()}</h2>
					<div class="picture">
						<RewardPicture
							artId={current.artId}
							kind={current.kind}
							owned={true}
							label={current.title}
						/>
					</div>
					<p class="won">
						{m.play_reward_won()}
						<strong class="title">{current.title}</strong>
					</p>
					{#if rewards.length > 1}
						<p class="count">
							{m.play_reward_count({ index: index + 1, total: rewards.length })}
						</p>
					{/if}
					<div class="actions">
						{#if current.kind === 'item' && !wornIds.includes(current.id)}
							<Button onclick={() => wear(current)}>{m.play_reward_wear()}</Button>
						{/if}
						{#if hasNext}
							<Button variant="secondary" onclick={next}>{m.play_reward_next()}</Button>
						{/if}
					</div>
				</article>
			{/key}
		{/if}

		<p class="status" role="status" tabindex="-1" bind:this={statusLine}>{status}</p>

		{#if showQuestion}
			<div class="question">
				<h2>{m.play_reward_name_question()}</h2>
				<CompanionName id="news-name" name="" {suggestions} onname={name} onlater={later} />
			</div>
		{/if}
	</section>
{/if}

<style>
	.news {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
		inline-size: 100%;
	}

	.card,
	.question {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		inline-size: 100%;
		padding: var(--dd-space-lg);
		border-width: var(--dd-border-width-target);
		border-style: solid;
		border-color: var(--dd-color-accent-base);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		box-shadow: var(--dd-shadow-md);
	}

	.new {
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-accent-base);
		color: var(--dd-color-text-on-accent);
		font-size: var(--dd-font-size-xl);
	}

	.new:focus,
	.status:focus {
		outline: none;
	}

	.picture {
		inline-size: var(--dd-size-reward-picture-large);
	}

	.won {
		font-size: var(--dd-font-size-lg);
	}

	.title {
		display: block;
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
	}

	.count {
		color: var(--dd-color-text-secondary);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.status {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.question h2 {
		font-size: var(--dd-font-size-2xl);
	}
</style>
