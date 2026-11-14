<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import InfoLinks from '$lib/ui/components/InfoLinks.svelte';
	import LinkButton from '$lib/ui/components/LinkButton.svelte';
</script>

<svelte:head>
	<title>{m.app_name()}</title>
</svelte:head>

<div class="home">
	<main>
		<h1>{m.app_name()}</h1>
		<p>{m.home_tagline()}</p>
		<LinkButton size="lg" href={resolve('/jouer')}>{m.home_play()}</LinkButton>
	</main>
	<!-- For the adults: discreet, below the game, never on the screens of the child. -->
	<footer>
		<InfoLinks />
	</footer>
</div>

<style>
	.home {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		min-block-size: var(--dd-size-viewport-full);
	}

	main {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--dd-space-lg);
		padding: var(--dd-space-lg);
		text-align: center;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	p {
		max-inline-size: var(--dd-size-content-max);
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	footer {
		padding: var(--dd-space-sm) var(--dd-space-lg);
	}
</style>
