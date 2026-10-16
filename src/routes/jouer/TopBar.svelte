<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';

	interface Props {
		name: string;
		/** Opens the screen of the companion; no button without it. */
		oncompanion?: () => void;
		onsettings: () => void;
		onchangeplayer: () => void;
	}

	let { name, oncompanion, onsettings, onchangeplayer }: Props = $props();
</script>

<header class="top-bar">
	<p class="player">{name}</p>
	<nav class="actions" aria-label={m.play_top_bar_label()}>
		{#if oncompanion}
			<Button variant="secondary" onclick={oncompanion}>
				<svg class="icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
					<path d="M7 9L8.5 4.5L11 8M11 8L13 3.5L15 8M15 8L17.5 5L18 10" />
					<circle cx="12" cy="14.5" r="6.5" />
				</svg>
				<span>{m.play_companion_open()}</span>
			</Button>
		{/if}
		<Button variant="secondary" onclick={onsettings}>
			<svg class="gear" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
				<circle cx="12" cy="12" r="3.2" />
				<path
					d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
				/>
			</svg>
			<span>{m.play_settings_open()}</span>
		</Button>
		<Button variant="quiet" onclick={onchangeplayer}>{m.play_change_player()}</Button>
	</nav>
</header>

<style>
	.top-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-sm);
		max-inline-size: var(--dd-size-page-wide);
		margin-inline: auto;
		padding: var(--dd-space-sm) var(--dd-space-lg);
	}

	.player {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.gear,
	.icon {
		inline-size: var(--dd-size-icon);
		block-size: var(--dd-size-icon);
		margin-inline-end: var(--dd-space-xs);
		vertical-align: middle;
		fill: transparent;
		stroke: currentColor;
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}
</style>
