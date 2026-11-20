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
		/**
		 * Shown on the row of the way out, at its right (what the screen can earn, for instance). The
		 * screen then reads from the left, like a page under its header: its title starts at the left.
		 */
		aside?: Snippet;
		children: Snippet;
	}

	let { title, focusHeading = true, wide = false, back, aside, children }: Props = $props();

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
	{#if aside}
		<div class="top">
			{#if back}
				{@render wayOut(back)}
			{/if}
			<div class="aside">{@render aside()}</div>
		</div>
	{:else if back}
		{@render wayOut(back)}
	{/if}
	{@render children()}
</section>

{#snippet wayOut(leave: { label: string; onclick: () => void })}
	<div class="back" data-screen-back>
		<Button variant="secondary" onclick={leave.onclick}>{leave.label}</Button>
	</div>
{/snippet}

<style>
	/* One column no wider than the page: at 320 pixels or 400 % zoom, nothing scrolls sideways. */
	.frame {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-lg);
		justify-items: center;
		align-content: center;
		max-inline-size: var(--dd-size-content-max);
		min-block-size: var(--dd-size-viewport-full);
		margin: auto;
		padding: var(--dd-space-xl) var(--dd-space-lg);
		overflow-wrap: break-word;
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

	/* The way out at the left, the aside at the right; on a narrow page, the aside goes under it. */
	.frame:has(> .top) {
		align-content: start;
		justify-items: stretch;
		text-align: start;
	}

	.top {
		order: -1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-md);
	}

	.aside {
		margin-inline-start: auto;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h1:focus {
		outline: none;
	}

	/* On paper the screen is a page: no height of a window, no way out to press. */
	@media print {
		.frame,
		.frame[data-wide] {
			gap: var(--dd-space-sm);
			min-block-size: 0;
			max-inline-size: none;
			padding: 0;
		}

		.back {
			display: none;
		}

		h1 {
			font-size: var(--dd-font-size-print-title);
		}
	}
</style>
