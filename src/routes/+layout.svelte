<script lang="ts">
	import { onMount } from 'svelte';
	import { asset } from '$app/paths';
	import { THEME_COLORS } from '$lib/generated/theme-colors';
	import { installPrompt } from '$lib/offline/install-prompt';
	import '../app.css';

	let { children } = $props();

	// The browser offers the installation once, soon after the page opens: keep it for the adult space.
	onMount(() => installPrompt.attach(window));
</script>

<svelte:head>
	<link rel="manifest" href={asset('/manifest.webmanifest')} />
	<link rel="icon" type="image/png" href={asset('/icons/icon-192.png')} />
	<link rel="apple-touch-icon" href={asset('/icons/apple-touch-icon.png')} />
	<meta name="theme-color" content={THEME_COLORS.light} media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content={THEME_COLORS.dark} media="(prefers-color-scheme: dark)" />
</svelte:head>

{@render children()}
