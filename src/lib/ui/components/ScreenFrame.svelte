<script lang="ts">
	import type { Snippet } from 'svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import Button from './Button.svelte';

	interface Props {
		title: string;
		/** `false` when another element of the screen takes the keyboard focus. */
		focusHeading?: boolean;
		/** Room for the on-screen keyboard. */
		wide?: boolean;
		/**
		 * The way out of the screen (back, close, cancel): always at the top, in the same place, so
		 * that a child never has to scroll down to leave; Escape takes it too.
		 */
		back?: { label: string; onclick: () => void };
		children: Snippet;
	}

	let { title, focusHeading = true, wide = false, back, children }: Props = $props();

	function leaveOnEscape(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.defaultPrevented || !back) return;
		event.preventDefault();
		back.onclick();
	}
</script>

<svelte:window onkeydown={leaveOnEscape} />

<section class="frame" data-wide={wide || undefined}>
	{#if focusHeading}
		<h1 tabindex="-1" {@attach focusOnMount}>{title}</h1>
	{:else}
		<h1>{title}</h1>
	{/if}
	<!--
		Shown above the title, but after it for the keyboard: from the title the screen opens on,
		Tab reaches the way out first (Firefox does not wrap Tab around to the top of the page).
	-->
	{#if back}
		<div class="back" data-screen-back>
			<Button variant="secondary" onclick={back.onclick}>{back.label}</Button>
		</div>
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

	/* A screen one can leave starts at the top, its way out first. */
	.frame:has(> .back) {
		align-content: start;
	}

	.back {
		order: -1;
		justify-self: start;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h1:focus {
		outline: none;
	}
</style>
