<script lang="ts">
	import { parseRewardCatalogue } from '$lib/engine/rewards/catalogue';
	import GhostFigure, { type GhostPose } from '$lib/games/shared/GhostFigure.svelte';
	import GhostTrack from '$lib/games/shared/GhostTrack.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { provideCompanionAppearance } from '$lib/ui/companion/appearance';
	import { ITEM_SLOTS } from '$lib/ui/companion/items';
	import Button from '$lib/ui/components/Button.svelte';
	import catalogueData from '../../../../content/fr/rewards/azerty-decouverte.json';

	const catalogue = parseRewardCatalogue(catalogueData);
	const OUTFIT = ITEM_SLOTS.flatMap((slot) => {
		const item = catalogue.rewards.find((reward) => reward.kind === 'item' && reward.slot === slot);
		return item === undefined ? [] : [item.artId];
	});
	const POSES: readonly { pose: GhostPose; label: () => string }[] = [
		{ pose: 'run', label: m.dev_ghost_pose_run },
		{ pose: 'wait', label: m.dev_ghost_pose_wait },
		{ pose: 'clap', label: m.dev_ghost_pose_clap },
		{ pose: 'wave', label: m.dev_ghost_pose_wave },
		{ pose: 'bow', label: m.dev_ghost_pose_bow },
		{ pose: 'dance', label: m.dev_ghost_pose_dance }
	];
	/** Moments of a race, as fixed shares of the exercise. */
	const MOMENTS = [
		{ child: 0.1, ghost: 0.2, arrived: false, greeting: 0 },
		{ child: 0.55, ghost: 0.4, arrived: false, greeting: 0 },
		{ child: 0.7, ghost: 1, arrived: false, greeting: 0 },
		{ child: 1, ghost: 1, arrived: true, greeting: 0 },
		{ child: 1, ghost: 0.8, arrived: true, greeting: 1 },
		{ child: 1, ghost: 1, arrived: true, greeting: 2 },
		{ child: 1, ghost: 0.9, arrived: true, greeting: 3 }
	];
	/** The demonstration race lasts this long; the ghost is a little slower than the child. */
	const DEMO_MS = 8000;
	const GHOST_SPEED = 0.9;

	let dressed = $state(false);
	let still = $state(false);
	let demoMs = $state(0);
	let demoGreeting = $state(0);

	provideCompanionAppearance(() => ({ colorId: null, itemArtIds: dressed ? OUTFIT : [] }));

	function runDemo() {
		const start = performance.now();
		demoGreeting += 1;
		const step = (time: number) => {
			demoMs = time - start;
			if (demoMs < DEMO_MS + 3000) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}
</script>

<svelte:head>
	<title>{m.dev_ghost_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>{m.dev_ghost_title()}</h1>
		<p>{m.dev_ghost_intro()}</p>
		<label class="check">
			<input type="checkbox" bind:checked={dressed} />
			<span>{m.dev_recit_dressed()}</span>
		</label>
		<label class="check">
			<input type="checkbox" bind:checked={still} />
			<span>{m.dev_ghost_still()}</span>
		</label>
		<Button onclick={runDemo}>{m.dev_ghost_run()}</Button>
	</header>

	<section class="demo" data-ghost-demo>
		<GhostTrack
			childShare={Math.min(demoMs / DEMO_MS, 1)}
			ghostShare={Math.min((demoMs * GHOST_SPEED) / DEMO_MS, 1)}
			arrived={demoMs >= DEMO_MS}
			greeting={demoGreeting}
			{still}
			label={m.game_shared_race_label()}
		/>
	</section>

	<ol class="moments">
		{#each MOMENTS as moment, index (index)}
			<li data-moment={index}>
				<GhostTrack
					childShare={moment.child}
					ghostShare={moment.ghost}
					arrived={moment.arrived}
					greeting={moment.greeting}
					{still}
					label={m.game_shared_race_label()}
				/>
			</li>
		{/each}
	</ol>

	<ul class="poses" data-still={still || undefined}>
		{#each POSES as entry (entry.pose)}
			<li data-pose={entry.pose}>
				<svg viewBox="0 0 120 120" role="img" aria-label={entry.label()}>
					<GhostFigure pose={entry.pose} />
				</svg>
				<p>{entry.label()}</p>
			</li>
		{/each}
	</ul>
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

	.moments,
	.poses {
		display: grid;
		gap: var(--dd-space-lg);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.poses {
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-companion), 1fr));
	}

	.poses svg {
		inline-size: var(--dd-size-companion);
		block-size: var(--dd-size-companion);
	}
</style>
