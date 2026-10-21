<script lang="ts" module>
	export type GhostPose = 'run' | 'wait' | 'clap' | 'wave' | 'bow' | 'dance';
</script>

<script lang="ts">
	interface Props {
		pose: GhostPose;
	}

	let { pose }: Props = $props();

	const SHEET =
		'M60 8C82 8 96 26 96 50L98 98C92 104 86 96 80 102C74 108 68 98 60 104C52 98 46 108 40 102C34 96 28 104 22 98L24 50C24 26 38 8 60 8Z';
</script>

<!-- Drawn in the square of the companion (120 units): the sheet hangs where its head and body are. -->
<g class="ghost-figure" data-ghost-pose={pose}>
	<path class="sheet" d={SHEET} />
	<ellipse class="hole" cx="48" cy="44" rx="5" ry="7" />
	<ellipse class="hole" cx="72" cy="44" rx="5" ry="7" />
</g>

<style>
	.sheet {
		fill: var(--dd-color-race-ghost);
		stroke: var(--dd-color-race-ghost-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.hole {
		fill: var(--dd-color-race-ghost-line);
	}
</style>
