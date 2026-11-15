<script lang="ts">
	import { tick } from 'svelte';
	import type { RewardDefinition } from '$lib/engine/rewards';
	import { m } from '$lib/paraglide/messages.js';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import { trophyKeys } from '$lib/ui/companion/items';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';

	interface Props {
		/** The reward this step shows, alone. */
		reward: RewardDefinition;
		/** Its place among the rewards of the play, from 0, and how many there are. */
		index: number;
		total: number;
		/** Identifiers of the items the companion wears now. */
		wornIds: readonly string[];
		onwear: (item: RewardDefinition) => void;
		oncontinue: () => void;
		onmap: () => void;
	}

	let { reward, index, total, wornIds, onwear, oncontinue, onmap }: Props = $props();

	/** Put on from this step: the companion next to the item shows it, and so does a sentence. */
	let wornHere = $state(false);
	let actions = $state<HTMLElement | null>(null);

	const isItem = $derived(reward.kind === 'item');
	const canWear = $derived(isItem && !wornIds.includes(reward.id));

	async function wear() {
		onwear(reward);
		wornHere = true;
		// "Le mettre" is gone: the keyboard goes on to the only way left, on the same screen.
		await tick();
		actions?.querySelector<HTMLElement>('[data-result-continue]')?.focus();
	}
</script>

<ScreenFrame title={m.play_reward_new()} back={{ label: m.play_result_map(), onclick: onmap }}>
	<div class="step" data-result-step="reward" data-reward-card={reward.id}>
		<!-- An item to wear sits next to the companion: "Wear it" shows on it, right here (ADR-046). -->
		<div class="pictures">
			<div class="picture">
				<RewardPicture
					artId={reward.artId}
					keys={trophyKeys(reward)}
					kind={reward.kind}
					owned={true}
					label={reward.title}
				/>
			</div>
			{#if isItem}
				<div class="wearer" data-reward-wearer>
					<Companion mood={wornHere ? 'cheer' : 'happy'} />
				</div>
			{/if}
		</div>
		<p class="won">
			{m.play_reward_won()}
			<strong class="title">{reward.title}</strong>
		</p>
		{#if total > 1}
			<p class="count">{m.play_reward_count({ index: index + 1, total })}</p>
		{/if}
		<div class="actions" bind:this={actions}>
			{#if isItem && (canWear || wornHere)}
				<!-- The sentence takes the place of the button it answers; it is there from the start, so
				that a screen reader says it when it is written. -->
				<div class="wear">
					{#if canWear}
						<Button onclick={wear}>{m.play_reward_wear()}</Button>
					{/if}
					<p class="worn" role="status">{wornHere ? m.play_reward_worn() : ''}</p>
				</div>
			{/if}
			<Button variant={canWear ? 'secondary' : 'primary'} onclick={oncontinue} data-result-continue>
				{m.play_result_continue()}
			</Button>
		</div>
	</div>
</ScreenFrame>

<style>
	.step {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
		inline-size: 100%;
	}

	.pictures {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-lg);
	}

	.picture {
		inline-size: var(--dd-size-reward-picture-large);
	}

	.won {
		font-size: var(--dd-font-size-lg);
	}

	.title {
		font-size: var(--dd-font-size-xl);
	}

	.count {
		color: var(--dd-color-text-secondary);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.wear {
		display: grid;
		align-items: center;
		justify-items: center;
	}

	/* The button and the sentence that answers it share one place: nothing moves when it is worn. */
	.wear > :global(*) {
		grid-area: 1 / 1;
	}

	.worn {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
