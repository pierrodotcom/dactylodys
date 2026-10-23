<svelte:options namespace="svg" />

<script lang="ts">
	import { astreVariant } from './flight';
	import { BANDS, CRATERS, GLOW, HOME, ICE_CAP, PATCHES, PLANET, RING } from './shapes';

	interface Props {
		/** Which astre it is; the looks follow one another. */
		variant: number;
		/** Reached: in color, with a halo. Not yet: grey and dashed. */
		lit: boolean;
		/** The ring is drawn by the scene that spins it like a hoop. */
		ringHidden?: boolean;
		/** The home planet the voyage starts from: oceans and lands. */
		home?: boolean;
		/** The halo of an astre reached; a still picture goes without it. */
		halo?: boolean;
	}

	let { variant, lit, ringHidden = false, home = false, halo = true }: Props = $props();

	const uid = $props.id();
	const look = $derived(home ? 'home' : String(astreVariant(variant)));
	const ringed = $derived(look === '0' && !ringHidden);

	function url(name: string): string {
		return `url(#${uid}-${name})`;
	}
</script>

{#snippet ring(half: 'far' | 'near')}
	<g transform={RING.transform}>
		<g clip-path={url(half)}>
			<path class="ring line" fill-rule="evenodd" d={RING.band} />
			<path class="open fine" d={RING.groove} />
			{#if half === 'far'}
				<path class="shade" d={RING.shadow} />
			{/if}
		</g>
	</g>
{/snippet}

<g class="astre" data-lit={lit || undefined} data-look={look}>
	<defs>
		<radialGradient id="{uid}-glow">
			<stop class="glow-core" offset="0.6" />
			<stop class="glow-edge" offset="1" stop-opacity="0" />
		</radialGradient>
		<clipPath id="{uid}-planet"><path d={PLANET.d} /></clipPath>
		<clipPath id="{uid}-far"><path d={RING.far} /></clipPath>
		<clipPath id="{uid}-near"><path d={RING.near} /></clipPath>
	</defs>
	{#if lit && halo}
		<g data-reward data-reward-variant="0">
			<path fill={url('glow')} d={GLOW.d} />
			{#each GLOW.sparkles as sparkle (sparkle)}
				<path class="sparkle" d={sparkle} />
			{/each}
		</g>
	{/if}
	{#if ringed}
		{@render ring('far')}
	{/if}
	<path class="planet" d={PLANET.d} />
	<g class="surface" clip-path={url('planet')}>
		{#if look === 'home'}
			{#each HOME.lands as land (land)}
				<path class="land fine" d={land} />
			{/each}
			{#each HOME.clouds as cloud (cloud)}
				<path class="cloud" d={cloud} />
			{/each}
		{:else if look === '0'}
			{#each BANDS.ringed as band (band)}
				<path class="band" d={band} />
			{/each}
		{:else if look === '1'}
			{#each CRATERS as crater (crater.hollow)}
				<path class="crater" d={crater.hollow} />
				<path class="shade" fill-rule="evenodd" d={crater.inner} />
				<path class="lip" d={crater.lip} />
				<path class="open fine" d={crater.hollow} />
			{/each}
		{:else if look === '2'}
			{#each BANDS.striped as band (band)}
				<path class="band" d={band} />
			{/each}
			<path class="storm fine" d={BANDS.storm} />
			<path class="storm-eye" d={BANDS.stormEye} />
		{:else}
			<path class="cap" d={ICE_CAP} />
			{#each PATCHES as patch (patch)}
				<path class="patch" d={patch} />
			{/each}
		{/if}
		<path class="shade" fill-rule="evenodd" d={PLANET.shade} />
		<path class="light" d={PLANET.rim} />
		{#each PLANET.lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
	<path class="outline" d={PLANET.d} />
	{#if ringed}
		{@render ring('near')}
	{/if}
</g>

<style>
	.line,
	.fine,
	.outline {
		stroke: var(--dd-color-rocket-line);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line,
	.outline {
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.open,
	.outline {
		fill: transparent;
	}

	.astre {
		--dd-astre-base: var(--dd-color-astre-dim);
		--dd-astre-mark: var(--dd-color-sky-base);
		--dd-astre-detail: var(--dd-color-sky-base);
	}

	[data-lit][data-look='0'] {
		--dd-astre-base: var(--dd-color-astre-a);
		--dd-astre-mark: var(--dd-color-rocket-astre-a-band);
		--dd-astre-detail: var(--dd-color-rocket-astre-a-ring);
	}

	[data-lit][data-look='1'] {
		--dd-astre-base: var(--dd-color-astre-b);
		--dd-astre-mark: var(--dd-color-rocket-astre-b-crater);
		--dd-astre-detail: var(--dd-color-rocket-astre-b-lip);
	}

	[data-lit][data-look='2'] {
		--dd-astre-base: var(--dd-color-astre-c);
		--dd-astre-mark: var(--dd-color-rocket-astre-c-band);
		--dd-astre-detail: var(--dd-color-rocket-astre-c-storm);
	}

	[data-lit][data-look='3'] {
		--dd-astre-base: var(--dd-color-astre-d);
		--dd-astre-mark: var(--dd-color-rocket-astre-d-patch);
		--dd-astre-detail: var(--dd-color-rocket-astre-d-cap);
	}

	[data-lit][data-look='home'] {
		--dd-astre-base: var(--dd-color-rocket-home-sea);
		--dd-astre-mark: var(--dd-color-rocket-home-land);
		--dd-astre-detail: var(--dd-color-rocket-home-cloud);
	}

	.planet {
		fill: var(--dd-astre-base);
	}

	.band,
	.crater,
	.patch,
	.land {
		fill: var(--dd-astre-mark);
	}

	.ring,
	.lip,
	.cap,
	.cloud,
	.storm {
		fill: var(--dd-astre-detail);
	}

	.storm-eye {
		fill: var(--dd-astre-base);
	}

	.shade {
		fill: var(--dd-color-rocket-shade);
		fill-opacity: var(--dd-opacity-rocket-shade);
	}

	.light {
		fill: var(--dd-color-rocket-light);
		fill-opacity: var(--dd-opacity-rocket-light);
	}

	.glow-core {
		stop-color: var(--dd-astre-base);
		stop-opacity: var(--dd-opacity-rocket-glow);
	}

	.glow-edge {
		stop-color: var(--dd-astre-base);
	}

	.sparkle {
		fill: var(--dd-color-star-fill);
	}

	/* Not reached yet: a grey silhouette, its marks faint, its outline dashed in the light of the sky. */
	.astre:not([data-lit]) .surface,
	.astre:not([data-lit]) .ring {
		opacity: var(--dd-opacity-disabled);
	}

	.astre:not([data-lit]) .outline {
		stroke: var(--dd-color-sky-line);
		stroke-dasharray: 6 5;
	}
</style>
