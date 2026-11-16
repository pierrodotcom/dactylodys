<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';

	interface Props {
		name: string;
		/** Opens the screen of the companion; no button without it. */
		oncompanion?: () => void;
		/** Opens the hideout; no button without it (the map only). */
		onhideout?: () => void;
		onsettings: () => void;
		onchangeplayer: () => void;
		/**
		 * The bar stays at the top of the screen while the page scrolls (the map, the lesson screen):
		 * the way to the settings and to the other players is always in view (E-05).
		 */
		sticky?: boolean;
	}

	let {
		name,
		oncompanion,
		onhideout,
		onsettings,
		onchangeplayer,
		sticky = false
	}: Props = $props();

	/** The buttons keep only their pictures; their names stay, out of sight, for screen readers. */
	let folded = $state(false);

	/**
	 * One line: the nickname and the buttons with their names when the bar has room for both, the
	 * pictures alone otherwise (a narrow page, a zoomed one). The room the buttons need with their
	 * names is measured while they show them.
	 */
	const fitOneLine: Attachment<HTMLElement> = (line) => {
		const player = line.querySelector<HTMLElement>('.player');
		const actions = line.querySelector<HTMLElement>('.actions');
		if (!player || !actions) return;
		// Kept here, not read from the state: the attachment never runs again because it folded.
		let named = 0;
		let shut = false;
		const fit = () => {
			if (!shut) named = actions.scrollWidth;
			const style = getComputedStyle(line);
			const room =
				line.clientWidth -
				parseFloat(style.paddingInlineStart) -
				parseFloat(style.paddingInlineEnd);
			const nameRoom = parseFloat(getComputedStyle(player).minInlineSize);
			const gap = parseFloat(style.columnGap);
			shut = named + gap + nameRoom > room;
			folded = shut;
		};
		fit();
		void document.fonts.ready.then(fit);
		const watcher = new ResizeObserver(fit);
		watcher.observe(line);
		return () => watcher.disconnect();
	};

	/**
	 * A bar that stays at the top leaves its own height free above what the keyboard reaches, so
	 * that it never covers it (WCAG 2.4.11): a measured length, like a position (rule 7 of the tokens).
	 */
	const keepClear: Attachment<HTMLElement> = (bar) => {
		const root = document.documentElement;
		const measure = () => root.style.setProperty('--dd-top-bar-height', `${bar.offsetHeight}px`);
		measure();
		const watcher = new ResizeObserver(measure);
		watcher.observe(bar);
		return () => {
			watcher.disconnect();
			root.style.removeProperty('--dd-top-bar-height');
		};
	};
</script>

<header
	class="top-bar"
	data-top-bar
	data-sticky={sticky || undefined}
	{@attach sticky ? keepClear : undefined}
>
	<div class="line" data-folded={folded || undefined} {@attach fitOneLine}>
		<p class="player">{name}</p>
		<nav class="actions" aria-label={m.play_top_bar_label()}>
			{#if oncompanion}
				<Button variant="secondary" size="sm" onclick={oncompanion}>
					<svg class="icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
						<path d="M7 9L8.5 4.5L11 8M11 8L13 3.5L15 8M15 8L17.5 5L18 10" />
						<circle cx="12" cy="14.5" r="6.5" />
					</svg>
					<span class="label">{m.play_companion_open()}</span>
				</Button>
			{/if}
			{#if onhideout}
				<Button variant="secondary" size="sm" onclick={onhideout}>
					<svg class="icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
						<path d="M3.5 11.5L12 4L20.5 11.5M6 9.5V20H18V9.5" />
						<path d="M10 20V15H14V20" />
					</svg>
					<span class="label">{m.play_hideout_open()}</span>
				</Button>
			{/if}
			<Button variant="secondary" size="sm" onclick={onsettings}>
				<svg class="icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
					<circle cx="12" cy="12" r="3.2" />
					<path
						d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
					/>
				</svg>
				<span class="label">{m.play_settings_open()}</span>
			</Button>
			<Button variant="quiet" size="sm" onclick={onchangeplayer}>
				<svg class="icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
					<circle cx="9" cy="8" r="3.5" />
					<path d="M3 20C3 15.5 5.5 13.5 9 13.5C10.6 13.5 12 13.9 13 14.8" />
					<path d="M15 12.5H21M18.5 10L21 12.5L18.5 15M21 18.5H15M17.5 16L15 18.5L17.5 21" />
				</svg>
				<span class="label">{m.play_change_player()}</span>
			</Button>
		</nav>
	</div>
</header>

<style>
	/*
	 * What a keyboard reaches scrolls into view below the bar, never under it (WCAG 2.4.11); at the
	 * bottom, a little room for a focused card drawn larger.
	 */
	:global(html:has(.top-bar[data-sticky])) {
		--dd-top-bar-height: var(--dd-size-touch-target-min);
		scroll-padding-block-start: calc(var(--dd-top-bar-height) + var(--dd-space-xs));
		scroll-padding-block-end: var(--dd-space-md);
	}

	.top-bar[data-sticky] {
		position: sticky;
		inset-block-start: 0;
		z-index: var(--dd-z-index-sticky);
		border-block-end-width: var(--dd-border-width-thin);
		border-block-end-style: solid;
		border-block-end-color: var(--dd-color-border-subtle);
		background-color: var(--dd-color-surface-base);
	}

	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-sm);
		max-inline-size: var(--dd-size-page-wide);
		margin-inline: auto;
		padding: var(--dd-space-sm) var(--dd-space-lg);
	}

	/* A long nickname is cut on one line rather than pushing the buttons below it: the map greets the child by the whole name. */
	.player {
		flex: 1 1 0;
		min-inline-size: var(--dd-size-top-bar-name-min);
		overflow: hidden;
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.actions {
		display: flex;
		flex: none;
		gap: var(--dd-space-sm);
		white-space: nowrap;
	}

	/* Folded: the picture alone, the name kept for screen readers. */
	.line[data-folded] .label {
		position: absolute;
		inline-size: var(--dd-size-visually-hidden);
		block-size: var(--dd-size-visually-hidden);
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.icon {
		flex: none;
		inline-size: var(--dd-size-icon);
		block-size: var(--dd-size-icon);
		fill: transparent;
		stroke: currentColor;
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
</style>
