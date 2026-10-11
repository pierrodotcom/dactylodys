<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
</script>

<svelte:head>
	<title>{m.home_title()}</title>
</svelte:head>

<main>
	<h1>{m.home_title()}</h1>
	<p>{m.home_tagline()}</p>
	<Button size="lg" onclick={() => goto(resolve('/jouer'))}>{m.home_play()}</Button>
</main>

<style>
	main {
		display: grid;
		place-content: center;
		justify-items: center;
		gap: var(--dd-space-lg);
		min-block-size: var(--dd-size-viewport-full);
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
</style>
