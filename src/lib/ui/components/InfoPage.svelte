<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import InfoLinks, { type InfoPageId } from './InfoLinks.svelte';
	import ScreenFrame from './ScreenFrame.svelte';

	interface Props {
		id: InfoPageId;
		title: string;
		children: Snippet;
	}

	let { id, title, children }: Props = $props();
</script>

<svelte:head>
	<title>{m.info_page_title({ page: title, appName: m.app_name() })}</title>
</svelte:head>

<div class="info-page" data-info-page={id}>
	<main>
		<ScreenFrame
			{title}
			back={{ label: m.info_back_home(), onclick: () => void goto(resolve('/')) }}
		>
			<div class="text">{@render children()}</div>
		</ScreenFrame>
	</main>
	<footer>
		<InfoLinks current={id} />
	</footer>
</div>

<style>
	/* « Confidentialité » in large type is wider than a 320-pixel page: it may break, with a hyphen. */
	.info-page :global(h1) {
		overflow-wrap: anywhere;
		hyphens: auto;
	}

	.text {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-xl);
		justify-self: stretch;
		text-align: start;
	}

	.text :global(section) {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-sm);
	}

	.text :global(h2) {
		font-size: var(--dd-font-size-xl);
	}

	.text :global(ul),
	.text :global(ol) {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding-inline-start: var(--dd-space-lg);
	}

	/* What must not be missed: the guide is not a treatment. */
	.text :global([data-info-notice]) {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		font-weight: var(--dd-font-weight-bold);
	}

	.text :global(a) {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
	}

	footer {
		padding: var(--dd-space-lg);
		border-block-start-width: var(--dd-border-width-thin);
		border-block-start-style: solid;
		border-block-start-color: var(--dd-color-border-subtle);
	}

	/*
	 * On paper: dark ink on light paper whatever the theme, small type, no buttons nor links to
	 * other pages. The guide for adults fits on one sheet, both sides (tested in e2e/info-pages).
	 */
	@page {
		size: A4;
		margin: var(--dd-print-page-margin);
	}

	@media print {
		:global(html),
		:global(body) {
			background-color: var(--dd-color-print-surface);
			color: var(--dd-color-print-text);
		}

		footer,
		.info-page :global([data-screen-back]),
		.info-page :global([data-print-hidden]) {
			display: none;
		}

		.info-page :global(.frame) {
			gap: var(--dd-print-space-md);
			max-inline-size: none;
			min-block-size: auto;
			padding: 0;
		}

		.info-page :global(h1) {
			font-size: var(--dd-print-font-size-title);
		}

		.text {
			gap: var(--dd-print-space-md);
			font-size: var(--dd-print-font-size-base);
			line-height: var(--dd-print-line-height);
		}

		.text :global(section) {
			gap: var(--dd-print-space-sm);
			break-inside: avoid;
		}

		.text :global(h2) {
			font-size: var(--dd-print-font-size-heading);
			break-after: avoid;
		}

		.text :global(ul),
		.text :global(ol) {
			gap: 0;
		}

		.text :global([data-info-notice]) {
			padding: var(--dd-print-space-sm) var(--dd-print-space-md);
			border-width: var(--dd-print-border-width);
			border-color: var(--dd-color-print-border);
			background-color: var(--dd-color-print-surface);
		}

		.text :global(a) {
			min-block-size: auto;
			color: var(--dd-color-print-text);
		}
	}
</style>
