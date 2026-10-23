<!-- The picture of the game on the lesson screen: a locomotive and a wagon on the rail, steaming. -->
<script lang="ts">
	import Cloud from './Cloud.svelte';
	import LocoShape from './LocoShape.svelte';
	import { LOCO, SMOKE_PUFFS, TRACK, wagonLook } from './shapes';
	import { slotX } from './train';
	import WagonShape from './WagonShape.svelte';

	const look = wagonLook(0);
	/** The picture runs from the tail of the wagon to the front of the locomotive. */
	const LEFT = slotX(0) - 8;
	const RIGHT = LOCO.width + 4;
	const TIES = Array.from({ length: 10 }, (_, index) => LEFT + 4 + index * TRACK.tieSpacing);
	const [SMALL_PUFF, BIG_PUFF] = SMOKE_PUFFS;
</script>

<svg class="picture" viewBox="{LEFT} -112 {RIGHT - LEFT} 126" focusable="false" aria-hidden="true">
	<rect class="part ballast" x={LEFT} y="3" width={RIGHT - LEFT} height="9" rx="3" />
	{#each TIES as x (x)}
		<rect class="part tie" {x} y="2.6" width={TRACK.tieWidth} height="4" rx="1" />
	{/each}
	<rect class="part rail" x={LEFT} y="0" width={RIGHT - LEFT} height={TRACK.railHeight} />

	{#if BIG_PUFF && SMALL_PUFF}
		<g transform="translate({LOCO.chimney.x - 24} {LOCO.chimney.top - 22})">
			<Cloud puffs={BIG_PUFF} />
		</g>
		<g transform="translate({LOCO.chimney.x - 2} {LOCO.chimney.top - 6})">
			<Cloud puffs={SMALL_PUFF} />
		</g>
	{/if}
	<LocoShape puff={false} />
	<g transform="translate({slotX(0)} 0)">
		<WagonShape tone={look.tone} cargo={look.cargo} />
	</g>
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.part {
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.ballast {
		fill: var(--dd-color-train-stone);
	}

	.tie {
		fill: var(--dd-color-train-wood);
	}

	.rail {
		fill: var(--dd-color-train-steel);
		stroke-width: var(--dd-border-width-thick);
	}
</style>
