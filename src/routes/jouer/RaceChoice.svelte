<script lang="ts">
	import GhostFigure from '$lib/games/shared/GhostFigure.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import Companion from '$lib/ui/components/Companion.svelte';

	interface Props {
		/** Never on by default, never kept from one play to the next. */
		checked: boolean;
		onchange: (checked: boolean) => void;
	}

	let { checked, onchange }: Props = $props();
</script>

<label class="race" data-race-choice data-checked={checked || undefined}>
	<input type="checkbox" {checked} onchange={(event) => onchange(event.currentTarget.checked)} />
	<svg class="picture" viewBox="0 0 200 120" aria-hidden="true" focusable="false">
		<svg x="0" y="0" width="120" height="120" viewBox="0 0 120 120" class="ghost">
			<GhostFigure pose="run" />
		</svg>
		<svg x="80" y="0" width="120" height="120" viewBox="0 0 120 120" class="child">
			<Companion mood="happy" />
		</svg>
	</svg>
	<span class="words">
		<span class="title">{m.play_intro_race()}</span>
		<span class="hint">{m.play_intro_race_hint()}</span>
	</span>
</label>

<style>
	.race {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr);
		align-items: center;
		gap: var(--dd-space-md);
		justify-self: center;
		max-inline-size: var(--dd-size-panel-max);
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background: var(--dd-color-surface-raised);
		cursor: pointer;
	}

	.race[data-checked] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
	}

	.race:has(input:focus-visible) {
		outline-width: var(--dd-border-width-focus);
		outline-style: solid;
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-border-width-focus);
	}

	input {
		inline-size: var(--dd-size-icon);
		block-size: var(--dd-size-icon);
		margin: 0;
		accent-color: var(--dd-color-accent-base);
	}

	.picture {
		inline-size: var(--dd-size-game-picture-small);
		block-size: auto;
	}

	.ghost {
		opacity: var(--dd-opacity-race-ghost);
	}

	.child :global(.companion) {
		inline-size: 100%;
		block-size: 100%;
	}

	.words {
		display: grid;
		gap: var(--dd-space-xs);
		text-align: start;
	}

	.title {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}
</style>
