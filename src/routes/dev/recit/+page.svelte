<script lang="ts">
	import type { StoryMoment } from '$lib/engine/story';
	import { parseRewardCatalogue } from '$lib/engine/rewards/catalogue';
	import { m } from '$lib/paraglide/messages.js';
	import { provideCompanionAppearance } from '$lib/ui/companion/appearance';
	import { ITEM_SLOTS } from '$lib/ui/companion/items';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import StoryPicture from '$lib/ui/story/StoryPicture.svelte';
	import catalogueData from '../../../../content/fr/rewards/azerty-decouverte.json';
	import { STORY, wholeStory } from '../../jouer/story';

	const catalogue = parseRewardCatalogue(catalogueData);
	const moments = wholeStory(STORY);
	const KIND_LABELS: Readonly<Record<StoryMoment['kind'], () => string>> = {
		opening: m.dev_recit_kind_opening,
		line: m.dev_recit_kind_line,
		ending: m.dev_recit_kind_ending
	};
	const colorOptions = catalogue.colors.map((color) => ({ value: color.id, label: color.title }));
	/** The first item of each slot: enough to see whether a picture hides what the companion wears. */
	const OUTFIT = ITEM_SLOTS.flatMap((slot) => {
		const item = catalogue.rewards.find((reward) => reward.kind === 'item' && reward.slot === slot);
		return item === undefined ? [] : [item.artId];
	});

	let colorId = $state(catalogue.colors[0]?.id ?? '');
	let dressed = $state(false);

	provideCompanionAppearance(() => ({ colorId, itemArtIds: dressed ? OUTFIT : [] }));
</script>

<svelte:head>
	<title>{m.dev_recit_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>{m.dev_recit_title()}</h1>
		<p>{m.dev_recit_intro()}</p>
		<ChoiceGroup
			legend={m.dev_recit_color_legend()}
			name="color"
			options={colorOptions}
			value={colorId}
			onchange={(value) => (colorId = value)}
		/>
		<label class="check">
			<input type="checkbox" bind:checked={dressed} />
			<span>{m.dev_recit_dressed()}</span>
		</label>
	</header>

	<ol class="moments">
		{#each moments as moment (moment.art)}
			<li data-art={moment.art}>
				<StoryPicture art={moment.art} />
				<p class="kind">{KIND_LABELS[moment.kind]()}</p>
				<p class="text">{moment.text}</p>
			</li>
		{/each}
	</ol>
</main>

<style>
	main {
		display: grid;
		gap: var(--dd-space-2xl);
		max-inline-size: var(--dd-size-page-wide);
		margin: auto;
		padding: var(--dd-space-lg);
	}

	header {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	.check {
		display: flex;
		gap: var(--dd-space-sm);
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
	}

	.moments {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-xl);
		margin: 0;
		padding-inline-start: var(--dd-space-xl);
	}

	li {
		display: grid;
		gap: var(--dd-space-xs);
		align-content: start;
	}

	.kind {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
	}

	.text {
		font-size: var(--dd-font-size-lg);
	}
</style>
