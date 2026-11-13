<script lang="ts">
	import { parseRewardCatalogue } from '$lib/engine/rewards/catalogue';
	import { m } from '$lib/paraglide/messages.js';
	import { trophyKeys } from '$lib/ui/companion/items';
	import Button from '$lib/ui/components/Button.svelte';
	import HideoutScene, { type SceneObject } from '$lib/ui/hideout/HideoutScene.svelte';
	import catalogueData from '../../../../content/fr/rewards/azerty-decouverte.json';
	import { HIDEOUT_RULES, placesOf } from '../../jouer/hideout';

	const catalogue = parseRewardCatalogue(catalogueData);
	const NO_VALUE = '';
	const THEMES = [
		{ value: NO_VALUE, label: m.dev_ui_theme_system },
		{ value: 'light', label: m.dev_ui_theme_light },
		{ value: 'dark', label: m.dev_ui_theme_dark }
	];
	const MOTIONS = [
		{ value: NO_VALUE, label: m.dev_ui_motion_system },
		{ value: 'reduced', label: m.dev_ui_motion_reduced },
		{ value: 'full', label: m.dev_ui_motion_full }
	];

	/** Every object of the catalogue that fits each place, in the order of the catalogue. */
	const candidates = Object.fromEntries(
		HIDEOUT_RULES.places.map((place) => [
			place,
			catalogue.rewards.filter((reward) => placesOf(HIDEOUT_RULES, reward).includes(place))
		])
	);
	const seriesCount = Math.max(...Object.values(candidates).map((list) => list.length));

	let theme = $state(NO_VALUE);
	let motion = $state(NO_VALUE);
	let marked = $state(NO_VALUE);
	/** The reward id set down in each place; none: the place is free. */
	let chosen = $state<Record<string, string>>({});
	let series = $state(-1);

	const objects = $derived<Record<string, SceneObject>>(
		Object.fromEntries(
			Object.entries(chosen).flatMap(([place, id]) => {
				const reward = catalogue.rewards.find((candidate) => candidate.id === id);
				return reward ? [[place, { artId: reward.artId, keys: trophyKeys(reward) }]] : [];
			})
		)
	);

	/** Series n: the n-th object of each place (again from the first when a place has fewer). */
	function showSeries(index: number) {
		series = index;
		chosen = Object.fromEntries(
			Object.entries(candidates).flatMap(([place, list]) => {
				const reward = list[index % list.length];
				return reward ? [[place, reward.id]] : [];
			})
		);
	}

	$effect(() => {
		const root = document.documentElement;
		for (const [name, value] of [
			['data-theme', theme],
			['data-motion', motion]
		] as const) {
			if (value === NO_VALUE) root.removeAttribute(name);
			else root.setAttribute(name, value);
		}
		return () => {
			root.removeAttribute('data-theme');
			root.removeAttribute('data-motion');
		};
	});
</script>

<svelte:head>
	<title>{m.dev_hideout_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>{m.dev_hideout_title()}</h1>
		<p>{m.dev_hideout_intro()}</p>
	</header>

	<div class="scene" data-testid="hideout-scene">
		<HideoutScene {objects} marked={marked === NO_VALUE ? null : marked} />
	</div>

	<section class="controls" aria-labelledby="controls-heading">
		<h2 id="controls-heading">{m.dev_ui_controls_heading()}</h2>
		<div class="row">
			<Button onclick={() => showSeries((series + 1) % seriesCount)} data-testid="next-series">
				{m.dev_hideout_series_next()}
			</Button>
			<Button variant="secondary" onclick={() => ((chosen = {}), (series = -1))}>
				{m.dev_hideout_empty()}
			</Button>
			<span data-testid="series">
				{series < 0
					? m.dev_hideout_none()
					: m.dev_hideout_series_value({ number: series + 1, total: seriesCount })}
			</span>
		</div>
		<div class="row">
			<label>
				<span>{m.dev_ui_theme_label()}</span>
				<select bind:value={theme}>
					{#each THEMES as option (option.value)}
						<option value={option.value}>{option.label()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_motion_label()}</span>
				<select bind:value={motion}>
					{#each MOTIONS as option (option.value)}
						<option value={option.value}>{option.label()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_hideout_choosing()}</span>
				<select bind:value={marked}>
					<option value={NO_VALUE}>{m.dev_hideout_none()}</option>
					{#each HIDEOUT_RULES.places as place (place)}
						<option value={place}>{place}</option>
					{/each}
				</select>
			</label>
		</div>
		<h3>{m.dev_hideout_places_heading()}</h3>
		<div class="places">
			{#each HIDEOUT_RULES.places as place (place)}
				<label>
					<span>{place}</span>
					<select
						data-place-select={place}
						value={chosen[place] ?? NO_VALUE}
						onchange={(event) => {
							const value = event.currentTarget.value;
							const next = { ...chosen };
							if (value === NO_VALUE) delete next[place];
							else next[place] = value;
							chosen = next;
						}}
					>
						<option value={NO_VALUE}>{m.dev_hideout_free()}</option>
						{#each candidates[place] ?? [] as reward (reward.id)}
							<option value={reward.id}>{reward.title}</option>
						{/each}
					</select>
				</label>
			{/each}
		</div>
	</section>
</main>

<style>
	main {
		display: grid;
		gap: var(--dd-space-xl);
		max-inline-size: var(--dd-size-page-wide);
		margin: auto;
		padding: var(--dd-space-lg);
	}

	header,
	.controls {
		display: grid;
		gap: var(--dd-space-md);
	}

	.scene {
		overflow: hidden;
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-lg);
	}

	.row,
	.places {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-md);
	}

	label {
		display: grid;
		gap: var(--dd-space-xs);
	}

	select {
		min-block-size: var(--dd-size-touch-target-min);
		font: inherit;
	}
</style>
