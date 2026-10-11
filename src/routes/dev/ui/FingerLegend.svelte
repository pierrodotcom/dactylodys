<script lang="ts">
	import type { Finger } from '$lib/keyboard/types';
	import { fingerName } from '$lib/ui/components/names';

	const FINGERS: readonly Finger[] = [
		'left-pinky',
		'left-ring',
		'left-middle',
		'left-index',
		'left-thumb',
		'right-thumb',
		'right-index',
		'right-middle',
		'right-ring',
		'right-pinky'
	];
</script>

<ul class="legend">
	{#each FINGERS as finger (finger)}
		<li>
			<span class="swatch" data-finger={finger}></span>
			<span>{fingerName(finger)}</span>
		</li>
	{/each}
</ul>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm) var(--dd-space-lg);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
	}

	.swatch {
		inline-size: var(--dd-space-lg);
		block-size: var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-key-border);
		border-radius: var(--dd-radius-sm);
	}

	.swatch[data-finger='left-pinky'] {
		background-color: var(--dd-color-finger-left-pinky);
	}

	.swatch[data-finger='left-ring'] {
		background-color: var(--dd-color-finger-left-ring);
	}

	.swatch[data-finger='left-middle'] {
		background-color: var(--dd-color-finger-left-middle);
	}

	.swatch[data-finger='left-index'] {
		background-color: var(--dd-color-finger-left-index);
	}

	.swatch[data-finger='left-thumb'] {
		background-color: var(--dd-color-finger-left-thumb);
	}

	.swatch[data-finger='right-thumb'] {
		background-color: var(--dd-color-finger-right-thumb);
	}

	.swatch[data-finger='right-index'] {
		background-color: var(--dd-color-finger-right-index);
	}

	.swatch[data-finger='right-middle'] {
		background-color: var(--dd-color-finger-right-middle);
	}

	.swatch[data-finger='right-ring'] {
		background-color: var(--dd-color-finger-right-ring);
	}

	.swatch[data-finger='right-pinky'] {
		background-color: var(--dd-color-finger-right-pinky);
	}
</style>
