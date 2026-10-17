<script lang="ts">
	import { parseRewardCatalogue } from '$lib/engine/rewards/catalogue';
	import { m } from '$lib/paraglide/messages.js';
	import { ITEM_SLOTS, trophyKeys, type ItemSlot } from '$lib/ui/companion/items';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import catalogueData from '../../../../content/fr/rewards/azerty-decouverte.json';

	type Mood = 'idle' | 'happy' | 'oops' | 'cheer';

	const catalogue = parseRewardCatalogue(catalogueData);
	const NO_VALUE = '';

	const MOODS: readonly { value: Mood; label: () => string }[] = [
		{ value: 'idle', label: m.dev_ui_mood_idle },
		{ value: 'happy', label: m.dev_ui_mood_happy },
		{ value: 'oops', label: m.dev_ui_mood_oops },
		{ value: 'cheer', label: m.dev_ui_mood_cheer }
	];
	const MOTION_OPTIONS = [
		{ value: NO_VALUE, label: m.dev_ui_motion_system },
		{ value: 'reduced', label: m.dev_ui_motion_reduced },
		{ value: 'full', label: m.dev_ui_motion_full }
	];
	const SLOT_LABELS: Readonly<Record<ItemSlot, () => string>> = {
		back: m.dev_companion_slot_back,
		body: m.dev_companion_slot_body,
		neck: m.dev_companion_slot_neck,
		feet: m.dev_companion_slot_feet,
		face: m.dev_companion_slot_face,
		head: m.dev_companion_slot_head,
		hand: m.dev_companion_slot_hand
	};

	const colorOptions = catalogue.colors.map((color) => ({ value: color.id, label: color.title }));
	const itemsBySlot = ITEM_SLOTS.map((slot) => ({
		slot,
		items: catalogue.rewards.filter((reward) => reward.kind === 'item' && reward.slot === slot)
	}));
	const tricks = catalogue.rewards.filter((reward) => reward.kind === 'skill');

	let colorId = $state(catalogue.colors[0]?.id ?? NO_VALUE);
	let mood = $state<Mood>('idle');
	let motion = $state(NO_VALUE);
	let worn = $state<Partial<Record<string, string>>>({});
	let trick = $state<string | null>(null);
	/** Changes at each press, so that the same trick plays again. */
	let trickRun = $state(0);

	const itemArtIds = $derived(
		ITEM_SLOTS.flatMap((slot) => {
			const artId = worn[slot];
			return artId === undefined ? [] : [artId];
		})
	);

	function toggle(slot: string, artId: string, checked: boolean) {
		worn = { ...worn, [slot]: checked ? artId : undefined };
	}

	function play(artId: string) {
		trick = artId;
		trickRun += 1;
	}

	$effect(() => {
		const root = document.documentElement;
		if (motion === NO_VALUE) root.removeAttribute('data-motion');
		else root.setAttribute('data-motion', motion);
		return () => root.removeAttribute('data-motion');
	});
</script>

<svelte:head>
	<title>{m.dev_companion_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>{m.dev_companion_title()}</h1>
		<p>{m.dev_companion_intro()}</p>
	</header>

	<div class="workbench">
		<div class="stage" data-testid="companion-stage">
			{#key trickRun}
				<Companion {mood} {colorId} {itemArtIds} {trick} />
			{/key}
		</div>

		<section class="controls" aria-labelledby="controls-heading">
			<h2 id="controls-heading">{m.dev_companion_controls_heading()}</h2>
			<ChoiceGroup
				legend={m.dev_companion_color_legend()}
				name="color"
				options={colorOptions}
				value={colorId}
				onchange={(value) => (colorId = value)}
			/>
			<div class="selects">
				<label>
					<span>{m.dev_ui_mood_label()}</span>
					<select bind:value={mood}>
						{#each MOODS as option (option.value)}
							<option value={option.value}>{option.label()}</option>
						{/each}
					</select>
				</label>
				<label>
					<span>{m.dev_ui_motion_label()}</span>
					<select bind:value={motion}>
						{#each MOTION_OPTIONS as option (option.value)}
							<option value={option.value}>{option.label()}</option>
						{/each}
					</select>
				</label>
			</div>

			<h3>{m.dev_companion_tricks_heading()}</h3>
			<div class="row">
				{#each tricks as reward (reward.id)}
					<Button variant="secondary" onclick={() => play(reward.artId)}>{reward.title}</Button>
				{/each}
			</div>
		</section>
	</div>

	<section aria-labelledby="items-heading">
		<h2 id="items-heading">{m.dev_companion_items_heading()}</h2>
		<Button variant="quiet" onclick={() => (worn = {})}>{m.dev_companion_clear_items()}</Button>
		<div class="slots">
			{#each itemsBySlot as group (group.slot)}
				<fieldset>
					<legend>{SLOT_LABELS[group.slot]()}</legend>
					{#each group.items as reward (reward.id)}
						<label class="check">
							<input
								type="checkbox"
								checked={worn[group.slot] === reward.artId}
								onchange={(event) => toggle(group.slot, reward.artId, event.currentTarget.checked)}
							/>
							<span>{reward.title}</span>
						</label>
					{/each}
				</fieldset>
			{/each}
		</div>
	</section>

	<section aria-labelledby="pictures-heading">
		<h2 id="pictures-heading">{m.dev_companion_pictures_heading()}</h2>
		<h3>{m.dev_companion_owned_heading()}</h3>
		<ul class="pictures" data-testid="pictures-owned">
			{#each catalogue.rewards as reward (reward.id)}
				<li>
					<RewardPicture
						artId={reward.artId}
						kind={reward.kind}
						owned
						label={reward.title}
						keys={trophyKeys(reward)}
					/>
					<span aria-hidden="true">{reward.title}</span>
				</li>
			{/each}
		</ul>
		<h3>{m.dev_companion_locked_heading()}</h3>
		<ul class="pictures" data-testid="pictures-locked">
			{#each catalogue.rewards as reward (reward.id)}
				<li>
					<RewardPicture
						artId={reward.artId}
						kind={reward.kind}
						owned={false}
						label={reward.title}
						keys={trophyKeys(reward)}
					/>
					<span aria-hidden="true">{reward.description}</span>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	main {
		display: grid;
		gap: var(--dd-space-2xl);
		max-inline-size: var(--dd-size-page-wide);
		margin: auto;
		padding: var(--dd-space-lg);
	}

	header,
	section {
		display: grid;
		gap: var(--dd-space-md);
		align-content: start;
		justify-items: start;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h2 {
		font-size: var(--dd-font-size-2xl);
	}

	h3 {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.workbench {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: var(--dd-space-xl);
	}

	.stage {
		padding: var(--dd-space-xl);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
	}

	.stage :global(.companion) {
		inline-size: var(--dd-size-companion-large);
		block-size: var(--dd-size-companion-large);
	}

	.controls {
		flex: 1;
		min-inline-size: var(--dd-size-control-min);
	}

	.selects,
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-md);
	}

	label {
		display: grid;
		gap: var(--dd-space-xs);
		align-content: start;
		font-weight: var(--dd-font-weight-bold);
	}

	select {
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
		font-weight: var(--dd-font-weight-regular);
	}

	.slots {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-md);
		inline-size: 100%;
	}

	fieldset {
		display: grid;
		gap: var(--dd-space-xs);
		align-content: start;
		margin: 0;
		padding: var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-md);
	}

	legend {
		font-weight: var(--dd-font-weight-bold);
	}

	.check {
		grid-auto-flow: column;
		justify-content: start;
		align-items: center;
		gap: var(--dd-space-sm);
		font-weight: var(--dd-font-weight-regular);
	}

	input[type='checkbox'] {
		inline-size: var(--dd-size-touch-target-min);
		block-size: var(--dd-size-touch-target-min);
		margin: 0;
	}

	.pictures {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-reward-picture), 1fr));
		gap: var(--dd-space-lg);
		inline-size: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.pictures li {
		display: grid;
		gap: var(--dd-space-xs);
		align-content: start;
		font-size: var(--dd-font-size-sm);
		text-align: center;
	}
</style>
