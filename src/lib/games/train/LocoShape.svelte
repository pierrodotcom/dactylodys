<svelte:options namespace="svg" />

<script lang="ts">
	import Cloud from './Cloud.svelte';
	import Form from './Form.svelte';
	import { LOCO } from './shapes';
	import Wheel from './Wheel.svelte';

	interface Props {
		/** A small cloud above the chimney. */
		puff?: boolean;
	}

	let { puff = true }: Props = $props();

	const BODY = LOCO.body;
	/** The forms of the body, back to front: one outline goes round all of them. */
	const JOINED = [
		BODY.chimney,
		BODY.dome,
		BODY.whistle,
		BODY.boiler,
		BODY.smokebox,
		BODY.cab,
		BODY.roof,
		BODY.footplate
	];
	const [DRIVER_BACK, DRIVER_FRONT, LEADING] = LOCO.wheels;
</script>

<g class="loco">
	{#if puff}
		<Cloud puffs={LOCO.idlePuff} />
	{/if}

	<path class="part iron" d={LOCO.frame} />
	<path class="part iron" d={LOCO.rearBuffer.stock} />
	<path class="part steel" d={LOCO.rearBuffer.head} />
	<path class="hook" d={LOCO.rearHook} />

	{#each JOINED as part (part.d)}
		<path class="underlay" d={part.d} />
	{/each}
	<Form form={BODY.chimney} paint="iron" edge={false} />
	<Form form={BODY.dome} paint="brass" edge={false} />
	<Form form={BODY.whistle} paint="brass" edge={false} />
	<Form form={BODY.boiler} paint="paint" edge={false} />
	<Form form={BODY.smokebox} paint="iron" edge={false} />
	<Form form={BODY.cab} paint="paint" edge={false} />
	<Form form={BODY.roof} paint="iron" edge={false} />
	<Form form={BODY.footplate} paint="iron" edge={false} />
	<path class="seam" d={LOCO.seams} />

	{#each LOCO.bands as bandPath (bandPath)}
		<path class="part brass thin" d={bandPath} />
	{/each}
	<path class="rail" d={LOCO.handrail} />
	<Form form={LOCO.chimneyCap} paint="brass" />
	<path class="part glass thin" d={LOCO.window} />
	{#each LOCO.windowGlints as glint (glint)}
		<path class="glint" d={glint} />
	{/each}
	<path class="lining" d={LOCO.lining} />
	{#each LOCO.rivets as rivet (`${rivet.x} ${rivet.y}`)}
		<circle class="glint" cx={rivet.x} cy={rivet.y} r={rivet.radius} />
	{/each}

	<Form form={LOCO.bufferBeam} paint="paint" />
	<Form form={LOCO.cowcatcher} paint="paint" />
	<path class="slats" d={LOCO.cowcatcherSlats} />

	{#if LEADING}
		<Wheel x={LEADING.x} y={LEADING.y} radius={LEADING.radius} spokes={6} />
	{/if}
	{#each [DRIVER_BACK, DRIVER_FRONT] as wheel (wheel?.x)}
		{#if wheel}
			<Wheel x={wheel.x} y={wheel.y} radius={wheel.radius} spokes={10} driver />
		{/if}
	{/each}

	<Form form={LOCO.cylinder} paint="iron" />
	<path class="covers" d={LOCO.cylinderCovers} />
	<path class="rail" d={LOCO.slideBar} />
	<path class="part steel thin" d={LOCO.crosshead} />
	<path class="part steel" d={LOCO.connectingRod} />
	<path class="part steel" d={LOCO.couplingRod} />
	{#each LOCO.crankPins as pin (pin.x)}
		<circle class="part brass thin" cx={pin.x} cy={pin.y} r={pin.radius} />
	{/each}

	<Form form={LOCO.lamp.housing} paint="iron" />
	<path class="hood" d={LOCO.lamp.hood} />
	<path class="part glow thin" d={LOCO.lamp.lens} />
</g>

<style>
	.part,
	.underlay,
	.seam,
	.rail,
	.lining,
	.slats,
	.covers,
	.hook,
	.hood {
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	/* Under the joined forms: only its outer half shows, one outline round the whole body. */
	.underlay {
		fill: var(--dd-color-train-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.thin,
	.seam,
	.slats,
	.covers {
		stroke-width: var(--dd-border-width-thin);
	}

	.seam,
	.rail,
	.lining,
	.slats,
	.covers,
	.hook,
	.hood {
		fill: transparent;
	}

	.iron {
		fill: var(--dd-color-train-iron);
	}

	.steel {
		fill: var(--dd-color-train-steel);
	}

	.brass {
		fill: var(--dd-color-train-brass);
	}

	.glass {
		fill: var(--dd-color-train-glass);
	}

	.glow {
		fill: var(--dd-color-train-glow);
	}

	.glint {
		fill: var(--dd-color-train-light);
		fill-opacity: var(--dd-opacity-train-light);
	}

	.rail {
		stroke: var(--dd-color-train-steel);
	}

	.lining {
		stroke: var(--dd-color-train-brass);
		stroke-width: var(--dd-border-width-thin);
	}

	.hook,
	.hood {
		stroke-width: var(--dd-border-width-target);
	}
</style>
