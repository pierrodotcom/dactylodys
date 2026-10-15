<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';

	interface Props {
		name: string;
		onsettings: () => void;
		onchangeplayer: () => void;
	}

	let { name, onsettings, onchangeplayer }: Props = $props();
</script>

<header class="top-bar">
	<p class="player">{name}</p>
	<nav class="actions" aria-label={m.play_top_bar_label()}>
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

	.gear {
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
