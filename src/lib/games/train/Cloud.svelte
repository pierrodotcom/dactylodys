<svelte:options namespace="svg" />

<script lang="ts">
	import { ovalPath } from '$lib/ui/companion/geometry';
	import type { Wheel } from './shapes';

	interface Props {
		/** The round puffs that make the cloud. */
		puffs: readonly Wheel[];
		/** Steam from the chimney, dust from the rail, or a cloud in the sky. */
		tone?: 'steam' | 'dust' | 'sky';
	}

	let { puffs, tone = 'steam' }: Props = $props();

	const id = $props.id();
	const rounds = $derived(puffs.map((puff) => ovalPath(puff.x, puff.y, puff.radius, puff.radius)));
	const bottom = $derived(Math.max(...puffs.map((puff) => puff.y + puff.radius)));
	const top = $derived(Math.min(...puffs.map((puff) => puff.y - puff.radius)));
	const left = $derived(Math.min(...puffs.map((puff) => puff.x - puff.radius)));
	const right = $derived(Math.max(...puffs.map((puff) => puff.x + puff.radius)));
	/** The lower part of the cloud, away from the light. */
	const shade = $derived(
		ovalPath(
			(left + right) / 2 + (right - left) * 0.08,
			bottom + (bottom - top) * 0.1,
			(right - left) * 0.62,
			(bottom - top) * 0.42
		)
	);
	/** The biggest puff carries the light. */
	const main = $derived(
		puffs.reduce<Wheel | undefined>(
			(big, puff) => (big === undefined || puff.radius > big.radius ? puff : big),
			undefined
		)
	);

	/** The upper left edge of a puff, where it rolls over the one behind: a curl of steam. */
	function curl(puff: Wheel): string {
		const at = (degrees: number) => {
			const angle = (degrees * Math.PI) / 180;
			const x = Math.round((puff.x + puff.radius * Math.cos(angle)) * 100) / 100;
			const y = Math.round((puff.y + puff.radius * Math.sin(angle)) * 100) / 100;
			return `${x} ${y}`;
		};
		return `M${at(150)}A${puff.radius} ${puff.radius} 0 0 1 ${at(250)}`;
	}
</script>

<!-- One outline round the whole cloud; inside, the edges of the puffs curl over one another. -->
<g class="cloud" data-tone={tone}>
	<clipPath {id}>
		{#each rounds as round, index (index)}
			<path d={round} />
		{/each}
	</clipPath>
	{#each rounds as round, index (index)}
		<path class="edge" d={round} />
	{/each}
	{#each rounds as round, index (index)}
		<path class="fill" d={round} />
	{/each}
	<g clip-path="url(#{id})">
		<path class="shade" d={shade} />
		{#each puffs.slice(1) as puff, index (index)}
			<path class="curl" d={curl(puff)} />
		{/each}
		{#if main}
			<path
				class="light"
				d={ovalPath(
					main.x - main.radius * 0.36,
					main.y - main.radius * 0.44,
					main.radius * 0.3,
					main.radius * 0.18
				)}
			/>
		{/if}
	</g>
</g>

<style>
	.edge {
		fill: var(--dd-color-train-line);
		stroke: var(--dd-color-train-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
		vector-effect: non-scaling-stroke;
	}

	.fill {
		fill: var(--dd-color-train-steam);
	}

	[data-tone='dust'] .fill {
		fill: var(--dd-color-train-stone);
	}

	[data-tone='sky'] .fill {
		fill: var(--dd-color-train-cloud);
	}

	.shade {
		fill: var(--dd-color-train-shade);
		fill-opacity: var(--dd-opacity-train-shade);
	}

	.light {
		fill: var(--dd-color-train-light);
	}

	.curl {
		fill: transparent;
		stroke: var(--dd-color-train-shade);
		stroke-opacity: var(--dd-opacity-train-shade);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}
</style>
