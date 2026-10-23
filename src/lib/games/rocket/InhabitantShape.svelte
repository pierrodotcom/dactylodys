<svelte:options namespace="svg" />

<script lang="ts">
	import { astreVariant } from './flight';
	import { INHABITANT_SHAPE as SHAPE, type Modelled } from './shapes';

	interface Props {
		/** Which astre it lives on: each astre has its own folk. */
		variant: number;
		/** Arms down, or raised for joy. */
		pose?: 'rest' | 'cheer';
	}

	let { variant, pose = 'rest' }: Props = $props();

	const uid = $props.id();
	const look = $derived(astreVariant(variant));
	const antennas = $derived(SHAPE.antennas[look % SHAPE.antennas.length] ?? []);
	const arms = $derived(SHAPE.arms[pose]);

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

{#snippet volume(name: string, form: Modelled, fill: string)}
	<clipPath id={ref(name)}><path d={form.d} /></clipPath>
	<path class={fill} d={form.d} />
	<g clip-path={url(name)}>
		<path class="shade" fill-rule="evenodd" d={form.shade} />
		{#each form.lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
{/snippet}

<g class="folk" data-look={look}>
	{#each antennas as item (item.stalk)}
		<path class="underlay" d={item.stalk} />
		<path class="underlay" d={item.bobble.d} />
	{/each}
	{#each arms as arm (arm.d)}
		<path class="underlay" d={arm.d} />
	{/each}
	{#each SHAPE.feet as foot (foot.d)}
		<path class="underlay" d={foot.d} />
	{/each}
	<path class="underlay" d={SHAPE.body.d} />

	{#each antennas as item, index (item.stalk)}
		<path class="skin" d={item.stalk} />
		{@render volume(`bobble-${index}`, item.bobble, 'accent')}
		<path class="glint" d={item.glint} />
	{/each}
	{#each arms as arm, index (arm.d)}
		{@render volume(`arm-${index}`, arm, 'skin')}
	{/each}
	{#each SHAPE.feet as foot, index (foot.d)}
		{@render volume(`foot-${index}`, foot, 'skin')}
	{/each}

	<clipPath id={ref('body')}><path d={SHAPE.body.d} /></clipPath>
	<path class="skin" d={SHAPE.body.d} />
	<g clip-path={url('body')}>
		{#each SHAPE.marks as mark (mark)}
			<path class="accent" d={mark} />
		{/each}
		<path class="belly" d={SHAPE.belly.d} />
		<path class="shade" fill-rule="evenodd" d={SHAPE.belly.shade} />
		<path class="shade" fill-rule="evenodd" d={SHAPE.body.shade} />
		{#each SHAPE.body.lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
	<path class="open fine" d={SHAPE.belly.d} />

	{#each SHAPE.eyes as eye, index (eye.white)}
		<clipPath id={ref(`eye-${index}`)}><path d={eye.white} /></clipPath>
		<path class="white" d={eye.white} />
		<g clip-path={url(`eye-${index}`)}>
			<path class="accent" d={eye.iris} />
			<path class="ink" d={eye.pupil} />
			{#each eye.glints as glint (glint)}
				<path class="white" d={glint} />
			{/each}
			<path class="shade" d={eye.lid} />
		</g>
		<path class="open line" d={eye.white} />
	{/each}
	{#each SHAPE.brows as brow (brow)}
		<path class="open line" d={brow} />
	{/each}
	{#each SHAPE.cheeks as cheek (cheek)}
		<path class="cheek" d={cheek} />
	{/each}
	<clipPath id={ref('mouth')}><path d={SHAPE.mouth} /></clipPath>
	<path class="ink" d={SHAPE.mouth} />
	<g clip-path={url('mouth')}><path class="tongue" d={SHAPE.tongue} /></g>
	<path class="open line" d={SHAPE.mouth} />
</g>

<style>
	.line,
	.fine,
	.underlay {
		stroke: var(--dd-color-rocket-line);
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
		fill: var(--dd-color-rocket-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.open {
		fill: transparent;
	}

	.folk {
		--dd-folk-body: var(--dd-color-rocket-inhabitant-a-body);
		--dd-folk-belly: var(--dd-color-rocket-inhabitant-a-belly);
		--dd-folk-accent: var(--dd-color-rocket-inhabitant-a-accent);
	}

	.folk[data-look='1'] {
		--dd-folk-body: var(--dd-color-rocket-inhabitant-b-body);
		--dd-folk-belly: var(--dd-color-rocket-inhabitant-b-belly);
		--dd-folk-accent: var(--dd-color-rocket-inhabitant-b-accent);
	}

	.folk[data-look='2'] {
		--dd-folk-body: var(--dd-color-rocket-inhabitant-c-body);
		--dd-folk-belly: var(--dd-color-rocket-inhabitant-c-belly);
		--dd-folk-accent: var(--dd-color-rocket-inhabitant-c-accent);
	}

	.folk[data-look='3'] {
		--dd-folk-body: var(--dd-color-rocket-inhabitant-d-body);
		--dd-folk-belly: var(--dd-color-rocket-inhabitant-d-belly);
		--dd-folk-accent: var(--dd-color-rocket-inhabitant-d-accent);
	}

	.skin {
		fill: var(--dd-folk-body);
	}

	.belly {
		fill: var(--dd-folk-belly);
	}

	.accent {
		fill: var(--dd-folk-accent);
	}

	.white,
	.glint {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-rocket-line);
	}

	.cheek {
		fill: var(--dd-color-rocket-inhabitant-cheek);
	}

	.tongue {
		fill: var(--dd-color-companion-tongue);
	}

	.shade {
		fill: var(--dd-color-rocket-shade);
		fill-opacity: var(--dd-opacity-rocket-shade);
	}

	.light {
		fill: var(--dd-color-rocket-light);
		fill-opacity: var(--dd-opacity-rocket-light);
	}
</style>
