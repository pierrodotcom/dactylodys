<script lang="ts">
	import { stageFor } from '../shared/stage';
	import type { GameView } from '../shared/game-view';

	interface Props {
		view: GameView;
	}

	/** Steps of the picture of a group: `data-probe` changes with each of them (tests rely on it). */
	const STAGES = 4;

	let { view }: Props = $props();

	const stage = $derived(
		view.phase === 'typing' ? stageFor(view.position, view.group.length, STAGES) : STAGES
	);
</script>

<!-- Placeholder: the work package of the game replaces it. `view.scene` says which surprise to play. -->
<svg
	class="scene"
	viewBox="0 0 520 240"
	focusable="false"
	aria-hidden="true"
	data-probe={stage}
	data-still={view.reducedMotion || undefined}
	data-scene={view.scene.kind === 'scene' ? view.scene.id : undefined}
>
	<rect class="floor" x="0" y="200" width="520" height="40" />
	{#each Array.from({ length: stage }, (_, index) => index) as index (index)}
		<rect
			class="step"
			x={80 + index * 90}
			y={180 - index * 30}
			width="70"
			height={20 + index * 30}
		/>
	{/each}
</svg>

<style>
	.scene {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-sunken);
	}

	.floor {
		fill: var(--dd-color-border-subtle);
	}

	.step {
		fill: var(--dd-color-star-fill);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}
</style>
