<svelte:options namespace="svg" />

<script lang="ts">
	import Cloud from './Cloud.svelte';
	import { LOCO } from './shapes';

	interface Props {
		/** A small cloud above the chimney. */
		puff?: boolean;
	}

	let { puff = true }: Props = $props();
</script>

<g class="loco">
	{#if puff}
		<Cloud puffs={LOCO.idlePuff} />
	{/if}
	<path class="chassis" d={LOCO.chassisPath} />
	<path class="cowcatcher" d={LOCO.cowcatcherPath} />
	<path class="cab" d={LOCO.cabPath} />
	<path class="boiler" d={LOCO.boilerPath} />
	{#each LOCO.bandPaths as band (band)}
		<path class="band" d={band} />
	{/each}
	<path class="dome" d={LOCO.domePath} />
	<path class="slate" d={LOCO.chimneyPath} />
	<path class="slate" d={LOCO.chimneyCapPath} />
	<path class="slate" d={LOCO.roofPath} />
	<path class="glass" d={LOCO.windowPath} />
	{#each LOCO.eyes as eye (eye.x)}
		<circle class="eye" cx={eye.x} cy={eye.y} r={eye.radius} />
	{/each}
	{#each LOCO.pupils as pupil (pupil.x)}
		<circle class="pupil" cx={pupil.x} cy={pupil.y} r={pupil.radius} />
	{/each}
	<path class="smile" d={LOCO.smilePath} />
	<circle class="light" cx={LOCO.lamp.x} cy={LOCO.lamp.y} r={LOCO.lamp.radius} />
	<path class="rod" d={LOCO.rodPath} />
	{#each LOCO.wheels as wheel (wheel.x)}
		<circle class="wheel" cx={wheel.x} cy={wheel.y} r={wheel.radius} />
		<path
			class="spoke"
			d="M{wheel.x - wheel.radius + 2.5} {wheel.y}L{wheel.x + wheel.radius - 2.5} {wheel.y}"
		/>
		<circle class="hub" cx={wheel.x} cy={wheel.y} r="2.5" />
	{/each}
</g>

<style>
	.chassis,
	.cowcatcher,
	.cab,
	.boiler,
	.band,
	.dome,
	.slate,
	.glass,
	.eye,
	.smile,
	.light,
	.rod,
	.wheel,
	.hub,
	.spoke {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.chassis {
		fill: var(--dd-color-border-strong);
	}

	.cowcatcher,
	.band,
	.dome,
	.hub,
	.light {
		fill: var(--dd-color-star-fill);
	}

	.cab {
		fill: var(--dd-color-wear-red);
	}

	.boiler {
		fill: var(--dd-color-wear-blue);
	}

	.band {
		fill: transparent;
		stroke-width: var(--dd-border-width-target);
	}

	.slate,
	.wheel {
		fill: var(--dd-color-pot-body);
	}

	.glass,
	.eye {
		fill: var(--dd-color-wear-glass);
	}

	.pupil {
		fill: var(--dd-color-drawing-ink);
	}

	.smile,
	.rod,
	.spoke {
		fill: transparent;
	}

	.rod {
		stroke-width: var(--dd-border-width-target);
	}

	.spoke {
		stroke: var(--dd-color-surface-raised);
		stroke-width: var(--dd-border-width-thin);
	}
</style>
