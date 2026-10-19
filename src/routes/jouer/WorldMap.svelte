<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import type { Profile } from '$lib/state/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import Stars from '$lib/ui/components/Stars.svelte';
	import { centerInView } from '$lib/ui/focus';
	import { isMotionReduced } from './game-settings';
	import {
		companionSpot,
		isOpenOnMap,
		layoutMap,
		mapMoveForKey,
		moveOnMap,
		type MapLesson
	} from './map';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition;
		/** The key the companion asks help for, as named to the child; `null`: no help quest. */
		helpKey: string | null;
		onopen: (lessonId: string) => void;
		onhelp: () => void;
		/** Opens the travel notebook; absent when the progression has no story. */
		onstory?: () => void;
		onchangeplayer: () => void;
	}

	let { profile, progression, helpKey, onopen, onhelp, onstory, onchangeplayer }: Props = $props();

	/** "Later" hides the bubble until the map is shown again. */
	let helpLater = $state(false);
	let hero = $state<HTMLElement | null>(null);

	async function postponeHelp() {
		helpLater = true;
		await tick();
		hero?.focus();
	}

	const layout = $derived(layoutMap(progression, profile.progress));
	/** The map scrolls to the bubble rather than to the lesson, so that the child sees the request. */
	const asking = $derived(helpKey !== null && !helpLater);

	/** The lesson chosen with the arrows, Tab or the mouse; `null`: the lesson the map proposes. */
	let chosenId = $state<string | null>(null);
	/** Where the companion stands: the only lesson of the map in the Tab order (roving focus). */
	const companionId = $derived(
		chosenId !== null && isOpenOnMap(layout, chosenId) ? chosenId : layout.focusId
	);
	const companionLesson = $derived(
		layout.worlds.flatMap((world) => world.lessons).find((lesson) => lesson.id === companionId)
	);
	/** Reactive: the companion is placed again once the button of its lesson is drawn. */
	const lessonButtons = $state<Record<string, HTMLButtonElement>>({});

	/** Shown, and allowed to walk, once it stands somewhere: it never walks in from a corner. */
	let placed = $state(false);
	let systemPrefersReduced = $state(false);
	const still = $derived(isMotionReduced(profile.settings, systemPrefersReduced));

	onMount(() => {
		systemPrefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		// The bubble of a help quest keeps the focus it has; otherwise the proposed lesson takes it.
		if (!asking && companionId !== null) lessonButtons[companionId]?.focus({ preventScroll: true });
	});

	/** The arrows walk the companion from one open lesson to another, between the exercises (ADR-027). */
	function walkFrom(event: KeyboardEvent, lessonId: string) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		const move = mapMoveForKey(event.key);
		if (move === null) return;
		event.preventDefault();
		const target = moveOnMap(layout, lessonId, move);
		const button = target === null ? undefined : lessonButtons[target];
		if (target === null || !button) return;
		chosenId = target;
		button.focus({ preventScroll: true });
		keepInView(button);
	}

	/** Scrolls only when the lesson leaves the screen, then brings it to the middle. */
	function keepInView(element: HTMLElement) {
		const box = element.getBoundingClientRect();
		if (box.top >= 0 && box.bottom <= window.innerHeight) return;
		element.scrollIntoView({ block: 'center', behavior: still ? 'instant' : 'smooth' });
	}

	/** The place comes from the measured lesson: the style sheet reads it in two custom properties. */
	function standBeside(lesson: MapLesson | undefined): Attachment<HTMLElement> {
		return (walker) => {
			const button = lesson ? lessonButtons[lesson.id] : undefined;
			const room = button?.closest('section');
			const trail = walker.parentElement;
			if (!lesson || !button || !room || !trail) return;
			const place = () => {
				const spot = companionSpot(
					trail.getBoundingClientRect(),
					room.getBoundingClientRect(),
					button.getBoundingClientRect(),
					{ width: walker.offsetWidth, height: walker.offsetHeight },
					lesson.side
				);
				walker.style.setProperty('--dd-map-companion-x', `${spot.x}px`);
				walker.style.setProperty('--dd-map-companion-y', `${spot.y}px`);
			};
			place();
			const frame = requestAnimationFrame(() => (placed = true));
			const resize = new ResizeObserver(place);
			resize.observe(trail);
			return () => {
				cancelAnimationFrame(frame);
				resize.disconnect();
			};
		};
	}
</script>

{#if layout.worlds.length > 0}
	<ScreenFrame title={m.play_map_title()} focusHeading={asking || companionId === null}>
		<div class="hero" tabindex="-1" bind:this={hero}>
			<Companion mood="idle" />
			<p class="greeting">{m.play_map_greeting({ name: profile.name })}</p>
			{#if onstory}
				<Button variant="secondary" onclick={onstory}>{m.play_story_so_far_open()}</Button>
			{/if}
			{#if asking && helpKey !== null}
				<section class="help" aria-labelledby="help-ask" {@attach centerInView}>
					<p id="help-ask" class="ask">{m.play_help_ask({ key: helpKey })}</p>
					<div class="help-actions">
						<Button onclick={onhelp}>{m.play_help_yes()}</Button>
						<Button variant="secondary" onclick={postponeHelp}>{m.play_help_later()}</Button>
					</div>
				</section>
			{/if}
		</div>

		<p class="keys-hint">
			<span class="dd-visually-hidden">{m.play_map_keys_hint()}</span>
			<span class="keys" aria-hidden="true">
				<kbd class="key">{@render arrow(false)}</kbd>
				<kbd class="key">{@render arrow(true)}</kbd>
				<span>{m.play_map_keys_choose()}</span>
				<kbd class="key">{m.ui_key_enter()}</kbd>
				<span>{m.play_map_keys_play()}</span>
			</span>
		</p>

		<div class="trail">
			{#each layout.worlds as world (world.id)}
				<section
					class="world"
					data-current={world.current || undefined}
					aria-labelledby="world-{world.id}"
				>
					<h2 id="world-{world.id}">{world.title}</h2>
					{#if world.current}
						<p class="current-badge">{m.play_world_current()}</p>
					{/if}

					<ol class="path" aria-labelledby="world-{world.id}">
						{#each world.lessons as lesson (lesson.id)}
							<li
								class="stop"
								data-status={lesson.status}
								data-side={lesson.side}
								data-companion={lesson.id === companionId || undefined}
								{@attach lesson.id === layout.focusId && !asking ? centerInView : undefined}
							>
								{#if lesson.status === 'locked'}
									<div class="node">
										<svg class="lock" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
											<path d="M7 11V8a5 5 0 0 1 10 0v3" />
											<rect x="4.5" y="11" width="15" height="10" rx="2" />
										</svg>
										<span class="info">
											<span class="number">{m.play_lesson_number({ number: lesson.number })}</span>
											<span class="name">{lesson.title}</span>
											<span class="state">{m.play_lesson_locked()}</span>
										</span>
									</div>
								{:else}
									<button
										type="button"
										class="node"
										tabindex={lesson.id === companionId ? 0 : -1}
										bind:this={lessonButtons[lesson.id]}
										onclick={() => onopen(lesson.id)}
										onfocus={() => (chosenId = lesson.id)}
										onkeydown={(event) => walkFrom(event, lesson.id)}
									>
										<span class="info">
											<span class="number">{m.play_lesson_number({ number: lesson.number })}</span>
											<span class="name">{lesson.title}</span>
											<span class="state">
												{lesson.status === 'done' ? m.play_lesson_done() : m.play_lesson_current()}
											</span>
										</span>
										<Stars count={lesson.stars} />
									</button>
								{/if}
							</li>
						{/each}
					</ol>
				</section>
			{/each}
			<!-- After the lessons: it is placed beside one of them once they are drawn. -->
			<div
				class="walker"
				aria-hidden="true"
				data-map-companion
				data-placed={placed || undefined}
				data-still={still || undefined}
				{@attach standBeside(companionLesson)}
			>
				<Companion mood="idle" />
			</div>
		</div>
	</ScreenFrame>
{:else}
	<ScreenFrame title={m.play_error_content()}>
		<Button onclick={onchangeplayer}>{m.play_change_player()}</Button>
	</ScreenFrame>
{/if}

{#snippet arrow(forward: boolean)}
	<svg class="arrow" viewBox="0 0 24 24" focusable="false">
		<path d={forward ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 6l-6 6 6 6'} />
	</svg>
{/snippet}

<style>
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.hero:focus {
		outline: none;
	}

	.greeting {
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
	}

	/* A speech bubble of the companion. */
	.help {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		max-inline-size: var(--dd-size-panel-max);
		padding: var(--dd-space-md) var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-bubble-border);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-bubble-surface);
		color: var(--dd-color-bubble-text);
	}

	.ask {
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
	}

	.help-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.keys-hint {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
	}

	.keys {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-xs);
	}

	.keys > span + .key {
		margin-inline-start: var(--dd-space-md);
	}

	/* A key drawn as on the keyboard, small: the hint shows, it does not explain. */
	.key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-inline-size: var(--dd-size-key-hint);
		min-block-size: var(--dd-size-key-hint);
		padding: 0 var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-block-end-width: var(--dd-border-width-target);
		border-style: solid;
		border-color: var(--dd-color-key-border);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-key-surface);
		color: var(--dd-color-key-text);
		font-family: inherit;
		font-size: var(--dd-font-size-sm);
		font-weight: var(--dd-font-weight-bold);
	}

	.arrow {
		inline-size: var(--dd-size-icon);
		block-size: var(--dd-size-icon);
	}

	.arrow path {
		fill: transparent;
		stroke: currentColor;
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.trail {
		position: relative;
		display: grid;
		gap: var(--dd-space-lg);
		justify-items: center;
		inline-size: 100%;
	}

	/* The companion beside the chosen lesson: it walks from one lesson to the other (ADR-027). */
	.walker {
		position: absolute;
		top: 0;
		left: 0;
		z-index: var(--dd-z-index-raised);
		inline-size: var(--dd-size-map-companion);
		block-size: var(--dd-size-map-companion);
		translate: var(--dd-map-companion-x) var(--dd-map-companion-y);
		visibility: hidden;
		pointer-events: none;
	}

	.walker[data-placed] {
		visibility: visible;
		transition-property: translate;
		transition-duration: var(--dd-duration-walk);
		transition-timing-function: var(--dd-easing-standard);
	}

	/* Calm motion: it is at once beside the new lesson. */
	.walker[data-still] {
		transition-property: none;
	}

	.walker :global(svg.companion) {
		inline-size: 100%;
		block-size: 100%;
	}

	.world {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
		inline-size: 100%;
		padding: var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-lg);
	}

	.world[data-current] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
		background-color: var(--dd-color-surface-raised);
		box-shadow: var(--dd-shadow-md);
	}

	.world h2 {
		font-size: var(--dd-font-size-2xl);
	}

	.current-badge {
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-accent-base);
		color: var(--dd-color-text-on-accent);
		font-size: var(--dd-font-size-sm);
		font-weight: var(--dd-font-weight-bold);
	}

	.path {
		display: grid;
		gap: var(--dd-space-lg);
		inline-size: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.stop {
		display: grid;
	}

	.stop[data-side='1'] {
		margin-inline-start: var(--dd-space-3xl);
	}

	.stop[data-side='0'] {
		margin-inline-end: var(--dd-space-3xl);
	}

	.node {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-md);
		min-block-size: var(--dd-size-lesson-node);
		padding: var(--dd-space-sm) var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
		text-align: start;
	}

	button.node {
		cursor: pointer;
		transition-property: background-color, scale;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-standard);
	}

	/* The arrows move the focus by script: it stays visible whatever the last device used. */
	button.node:focus {
		outline-style: solid;
		outline-width: var(--dd-border-width-focus);
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-space-xs);
	}

	button.node:hover {
		background-color: var(--dd-color-surface-sunken);
	}

	button.node:active {
		scale: var(--dd-scale-press);
	}

	.stop[data-status='current'] .node {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
		box-shadow: var(--dd-shadow-md);
		font-size: var(--dd-font-size-lg);
	}

	.stop[data-status='locked'] .node {
		border-style: dashed;
		background-color: var(--dd-color-surface-sunken);
		color: var(--dd-color-text-secondary);
	}

	.info {
		display: grid;
		gap: var(--dd-space-xs);
	}

	.number {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
		font-weight: var(--dd-font-weight-bold);
	}

	.name {
		font-weight: var(--dd-font-weight-bold);
	}

	.state {
		font-size: var(--dd-font-size-sm);
	}

	.stop[data-status='current'] .state {
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
	}

	.lock {
		flex: none;
		order: 2;
		inline-size: var(--dd-size-star);
		block-size: var(--dd-size-star);
	}

	.lock path,
	.lock rect {
		fill: transparent;
		stroke: currentColor;
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
</style>
