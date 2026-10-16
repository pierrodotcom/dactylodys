<script lang="ts">
	import type {
		CompanionChoice,
		RewardCatalogue,
		RewardDefinition,
		RewardKind
	} from '$lib/engine/rewards';
	import { m } from '$lib/paraglide/messages.js';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import { trophyKeys } from '$lib/ui/companion/items';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { chosenColorId, groupBySlot, takeOffItem, wearItem } from './companion';
	import CompanionName from './CompanionName.svelte';

	interface Props {
		catalogue: RewardCatalogue;
		/** Identifiers of what the child owns (`ownedRewards`). */
		owned: ReadonlySet<string>;
		choice: CompanionChoice;
		/** Identifiers of the items the companion really wears. */
		wornIds: readonly string[];
		saveFailed: boolean;
		/** Every change is kept at once. */
		onchange: (choice: CompanionChoice) => void;
		onback: () => void;
	}

	let { catalogue, owned, choice, wornIds, saveFailed, onchange, onback }: Props = $props();

	/** The slots in the order of the body, from the head to the feet; another slot goes in "Others". */
	const SLOT_LABELS: Readonly<Record<string, () => string>> = {
		head: m.play_companion_slot_head,
		face: m.play_companion_slot_face,
		neck: m.play_companion_slot_neck,
		body: m.play_companion_slot_body,
		back: m.play_companion_slot_back,
		hand: m.play_companion_slot_hand,
		feet: m.play_companion_slot_feet
	};
	const SLOT_ORDER = Object.keys(SLOT_LABELS);

	let status = $state('');
	/** The trick on show; a new `run` draws the companion again, which plays it once more. */
	let shown = $state<{ readonly artId: string; readonly run: number } | null>(null);

	const slots = $derived(groupBySlot(catalogue.rewards, SLOT_ORDER));
	const colorId = $derived(chosenColorId(catalogue, choice.colorId));
	const tricks = $derived(ofKind('skill'));
	const trophies = $derived(ofKind('trophy'));

	function ofKind(kind: RewardKind): readonly RewardDefinition[] {
		return catalogue.rewards.filter((reward) => reward.kind === kind);
	}

	function slotLabel(slot: string | null): string {
		return (slot === null ? undefined : SLOT_LABELS[slot])?.() ?? m.play_companion_slot_other();
	}

	function toggle(item: RewardDefinition) {
		onchange(
			wornIds.includes(item.id)
				? takeOffItem(choice, item.id)
				: wearItem(choice, catalogue, item.id)
		);
	}

	function rename(name: string) {
		onchange({ ...choice, name });
		status = m.play_companion_named({ name });
	}

	function showTrick(artId: string) {
		shown = { artId, run: (shown?.run ?? 0) + 1 };
	}
</script>

{#snippet locked(reward: RewardDefinition)}
	<li class="entry" data-locked>
		<div class="picture">
			<RewardPicture
				artId={reward.artId}
				kind={reward.kind}
				owned={false}
				label={m.play_companion_locked({ title: reward.title })}
				keys={trophyKeys(reward)}
			/>
		</div>
		<span class="how">{reward.description}</span>
	</li>
{/snippet}

<ScreenFrame title={m.play_companion_title()} wide>
	<div class="stage">
		{#key shown?.run}
			<Companion mood="happy" trick={shown?.artId ?? null} />
		{/key}
	</div>

	<CompanionName
		id="companion-name"
		name={choice.name}
		suggestions={catalogue.nameSuggestions}
		onname={rename}
	/>
	<p class="status" role="status">{status}</p>

	<fieldset class="colors">
		<legend>{m.play_companion_colors()}</legend>
		<div class="swatches">
			{#each catalogue.colors as color (color.id)}
				<label class="swatch" data-checked={colorId === color.id || undefined}>
					<input
						type="radio"
						name="companion-color"
						value={color.id}
						checked={colorId === color.id}
						onchange={() => onchange({ ...choice, colorId: color.id })}
					/>
					<span class="mini" aria-hidden="true">
						<Companion mood="idle" colorId={color.id} itemArtIds={[]} />
					</span>
					<span>{color.title}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<section class="collection" aria-labelledby="companion-items">
		<h2 id="companion-items">{m.play_companion_items()}</h2>
		{#each slots as group (group.slot)}
			<section class="slot" aria-labelledby="slot-{group.slot ?? 'other'}">
				<h3 id="slot-{group.slot ?? 'other'}">{slotLabel(group.slot)}</h3>
				<ul class="entries">
					{#each group.items as item (item.id)}
						{#if owned.has(item.id)}
							<li class="entry">
								<button
									type="button"
									class="item"
									aria-pressed={wornIds.includes(item.id)}
									onclick={() => toggle(item)}
								>
									<div class="picture" aria-hidden="true">
										<RewardPicture
											artId={item.artId}
											kind={item.kind}
											owned={true}
											label={item.title}
										/>
									</div>
									<span class="title">{item.title}</span>
									{#if wornIds.includes(item.id)}
										<svg class="check" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
											<path d="M4 12.5L9.5 18L20 6.5" />
										</svg>
									{/if}
								</button>
							</li>
						{:else}
							{@render locked(item)}
						{/if}
					{/each}
				</ul>
			</section>
		{/each}
	</section>

	{#if tricks.length > 0}
		<section class="collection" aria-labelledby="companion-tricks">
			<h2 id="companion-tricks">{m.play_companion_tricks()}</h2>
			<ul class="entries">
				{#each tricks as trick, index (trick.id)}
					{#if owned.has(trick.id)}
						<li class="entry">
							<div class="picture">
								<RewardPicture
									artId={trick.artId}
									kind={trick.kind}
									owned={true}
									label={trick.title}
								/>
							</div>
							<span class="title" id="trick-{index}">{trick.title}</span>
							<Button
								variant="secondary"
								aria-describedby="trick-{index}"
								onclick={() => showTrick(trick.artId)}
							>
								{m.play_companion_trick_show()}
							</Button>
						</li>
					{:else}
						{@render locked(trick)}
					{/if}
				{/each}
			</ul>
		</section>
	{/if}

	{#if trophies.length > 0}
		<section class="collection" aria-labelledby="companion-trophies">
			<h2 id="companion-trophies">{m.play_companion_trophies()}</h2>
			<ul class="entries">
				{#each trophies as trophy (trophy.id)}
					{#if owned.has(trophy.id)}
						<li class="entry">
							<div class="picture" aria-hidden="true">
								<RewardPicture
									artId={trophy.artId}
									keys={trophyKeys(trophy)}
									kind={trophy.kind}
									owned={true}
									label={trophy.title}
								/>
							</div>
							<span class="title">{trophy.title}</span>
						</li>
					{:else}
						{@render locked(trophy)}
					{/if}
				{/each}
			</ul>
		</section>
	{/if}

	{#if saveFailed}
		<p class="warning" role="alert">{m.play_companion_save_error()}</p>
	{/if}

	<Button onclick={onback}>{m.play_companion_back()}</Button>
</ScreenFrame>

<style>
	.stage :global(svg.companion) {
		inline-size: var(--dd-size-companion-large);
		block-size: var(--dd-size-companion-large);
	}

	.status {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.colors {
		display: grid;
		gap: var(--dd-space-sm);
		min-inline-size: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend,
	.collection h2 {
		margin-block-end: var(--dd-space-sm);
		padding: 0;
		font-size: var(--dd-font-size-2xl);
		font-weight: var(--dd-font-weight-bold);
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-sm);
	}

	.swatch {
		position: relative;
		display: grid;
		justify-items: center;
		gap: var(--dd-space-xs);
		min-block-size: var(--dd-size-touch-target-min);
		min-inline-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		font-weight: var(--dd-font-weight-medium);
		cursor: pointer;
	}

	.swatch:hover {
		background-color: var(--dd-color-surface-sunken);
	}

	.swatch[data-checked] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
		font-weight: var(--dd-font-weight-bold);
		box-shadow: var(--dd-shadow-md);
	}

	.swatch:has(input:focus-visible),
	.item:focus-visible {
		outline-style: solid;
		outline-width: var(--dd-border-width-focus);
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-space-xs);
	}

	.swatch input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.mini :global(svg.companion) {
		inline-size: calc(var(--dd-size-companion) * 0.5);
		block-size: calc(var(--dd-size-companion) * 0.5);
	}

	.collection {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
		inline-size: 100%;
	}

	.slot {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		inline-size: 100%;
	}

	.slot h3 {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.entries {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-choice-card-min), 1fr));
		gap: var(--dd-space-md);
		inline-size: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.entry {
		display: grid;
		gap: var(--dd-space-xs);
		justify-items: center;
		align-content: start;
	}

	.picture {
		display: block;
		inline-size: var(--dd-size-reward-picture);
	}

	.item {
		position: relative;
		display: grid;
		gap: var(--dd-space-xs);
		justify-items: center;
		inline-size: 100%;
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
		cursor: pointer;
	}

	.item:hover {
		background-color: var(--dd-color-surface-sunken);
	}

	.item[aria-pressed='true'] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
		box-shadow: var(--dd-shadow-md);
	}

	.title {
		font-weight: var(--dd-font-weight-bold);
	}

	.how {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
	}

	.check {
		position: absolute;
		inset-block-start: var(--dd-space-xs);
		inset-inline-end: var(--dd-space-xs);
		inline-size: var(--dd-size-star);
		block-size: var(--dd-size-star);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-accent-base);
	}

	.check path {
		fill: transparent;
		stroke: var(--dd-color-text-on-accent);
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.warning {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
