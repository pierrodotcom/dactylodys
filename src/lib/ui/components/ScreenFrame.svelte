<script lang="ts">
	import type { Snippet } from 'svelte';
	import { focusOnMount } from '$lib/ui/focus';

	interface Props {
		title: string;
		/** `false` when another element of the screen takes the keyboard focus. */
		focusHeading?: boolean;
		/** Room for the on-screen keyboard. */
		wide?: boolean;
		children: Snippet;
	}

	let { title, focusHeading = true, wide = false, children }: Props = $props();
</script>

<section class="frame" data-wide={wide || undefined}>
	{#if focusHeading}
		<h1 tabindex="-1" {@attach focusOnMount}>{title}</h1>
	{:else}
		<h1>{title}</h1>
	{/if}
	{@render children()}
</section>

<style>
	.frame {
		display: grid;
		gap: var(--dd-space-lg);
		justify-items: center;
		align-content: center;
		max-inline-size: var(--dd-size-content-max);
		min-block-size: var(--dd-size-viewport-full);
		margin: auto;
		padding: var(--dd-space-xl) var(--dd-space-lg);
		text-align: center;
	}

	.frame[data-wide] {
		max-inline-size: var(--dd-size-page-wide);
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h1:focus {
		outline: none;
	}
</style>
