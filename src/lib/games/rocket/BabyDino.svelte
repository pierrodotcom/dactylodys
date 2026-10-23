<svelte:options namespace="svg" />

<script lang="ts">
	import {
		BELLY,
		BELLY_BANDS,
		BELLY_SHADE,
		BODY,
		BODY_LIGHT,
		BODY_SHADE,
		BROWS,
		CHEEKS,
		CHIN_SHADE,
		EYES,
		HEAD,
		HEAD_LIGHTS,
		HEAD_OFFSET,
		HEAD_PLATES,
		HEAD_SHADE,
		MOUTH,
		NOSTRILS,
		RAISED_ARMS,
		REST_ARMS,
		SIDES,
		SNOUT_RIDGE,
		TONGUE,
		type Arm
	} from '../hatching/shapes';

	/*
		A baby dino of the egg game, visiting from its world: the same drawing, in the same 120 x 150
		box. Its left arm, raised, waves (`.dino-arm`); its right arm rests.
	*/

	interface Props {
		/** Its colors follow the astre it comes from. */
		look: number;
	}

	let { look }: Props = $props();

	const uid = $props.id();

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

{#snippet modelled(
	name: string,
	d: string,
	fill: string,
	shade: string,
	lights: readonly string[] = []
)}
	<clipPath id={ref(name)}><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path={url(name)}>
		<path class="shade" fill-rule="evenodd" d={shade} />
		{#each lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
{/snippet}

{#snippet arm(limb: Arm, name: string)}
	<path class="underlay" d={limb.fill} />
	{@render modelled(name, limb.fill, 'body', limb.shade)}
	{@render modelled(`${name}-hand`, limb.hand.fill, 'body', limb.hand.shade)}
	<path class="open line" d={limb.hand.line} />
	<path class="open fine" d={limb.hand.fingers} />
{/snippet}

<g class="baby" data-look={look}>
	<path class="underlay" d={BODY} />
	{@render arm(REST_ARMS.right, 'rest')}
	<g class="dino-arm">
		{@render arm(RAISED_ARMS.left, 'wave')}
	</g>
	{@render modelled('body', BODY, 'body', BODY_SHADE, [BODY_LIGHT])}
	{@render modelled('belly', BELLY, 'belly', BELLY_SHADE)}
	<g clip-path={url('belly')}>
		<path class="open fine" d={BELLY_BANDS} />
	</g>
	<path class="open fine" d={BELLY} />
	<g clip-path={url('body')}>
		<path class="shade" d={CHIN_SHADE} />
	</g>
	<g transform="translate(0 {HEAD_OFFSET})">
		{#each HEAD_PLATES as plate, index (index)}
			<g transform={plate.transform}>
				{@render modelled(`plate-${index}`, plate.d, 'plate', plate.shade)}
				<path class="open line" d={plate.d} />
				<path class="open fine" d={plate.vein} />
			</g>
		{/each}
		{@render modelled('head', HEAD, 'body', HEAD_SHADE, HEAD_LIGHTS)}
		<path class="open line" d={HEAD} />
		<path class="open fine" d={SNOUT_RIDGE} />
		{#each SIDES as side (side)}
			{@const eye = EYES[side]}
			<path class="cheek" d={CHEEKS[side]} />
			<clipPath id={ref(`eye-${side}`)}><path d={eye.white} /></clipPath>
			<path class="white" d={eye.white} />
			<g clip-path={url(`eye-${side}`)}>
				<path class="plate" d={eye.iris} />
				<path class="ink" d={eye.pupil} />
				{#each eye.glints as glint (glint)}
					<path class="white" d={glint} />
				{/each}
				<path class="shade" d={eye.lid} />
			</g>
			<path class="open line" d={eye.white} />
			<path class="ink fine" d={BROWS[side]} />
			<path class="ink" d={NOSTRILS[side]} />
		{/each}
		<clipPath id={ref('mouth')}><path d={MOUTH} /></clipPath>
		<path class="ink" d={MOUTH} />
		<g clip-path={url('mouth')}><path class="tongue" d={TONGUE} /></g>
		<path class="open line" d={MOUTH} />
	</g>
</g>

<style>
	.baby {
		--dd-baby-body: var(--dd-color-baby-a);
		--dd-baby-belly: var(--dd-color-baby-a-belly);
		--dd-baby-plate: var(--dd-color-baby-a-plate);
		--dd-baby-cheek: var(--dd-color-baby-a-cheek);
	}

	.baby[data-look='1'] {
		--dd-baby-body: var(--dd-color-baby-b);
		--dd-baby-belly: var(--dd-color-baby-b-belly);
		--dd-baby-plate: var(--dd-color-baby-b-plate);
		--dd-baby-cheek: var(--dd-color-baby-b-cheek);
	}

	.baby[data-look='2'] {
		--dd-baby-body: var(--dd-color-baby-c);
		--dd-baby-belly: var(--dd-color-baby-c-belly);
		--dd-baby-plate: var(--dd-color-baby-c-plate);
		--dd-baby-cheek: var(--dd-color-baby-c-cheek);
	}

	.baby[data-look='3'] {
		--dd-baby-body: var(--dd-color-baby-d);
		--dd-baby-belly: var(--dd-color-baby-d-belly);
		--dd-baby-plate: var(--dd-color-baby-d-plate);
		--dd-baby-cheek: var(--dd-color-baby-d-cheek);
	}

	.line,
	.fine,
	.underlay {
		stroke: var(--dd-color-egg-line);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.underlay {
		fill: var(--dd-color-egg-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.open {
		fill: transparent;
	}

	.body {
		fill: var(--dd-baby-body);
	}

	.belly {
		fill: var(--dd-baby-belly);
	}

	.plate {
		fill: var(--dd-baby-plate);
	}

	.cheek {
		fill: var(--dd-baby-cheek);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-egg-line);
	}

	.tongue {
		fill: var(--dd-color-companion-tongue);
	}

	.shade {
		fill: var(--dd-color-egg-shade);
		fill-opacity: var(--dd-opacity-egg-shade);
	}

	.light {
		fill: var(--dd-color-egg-light);
		fill-opacity: var(--dd-opacity-egg-light);
	}
</style>
