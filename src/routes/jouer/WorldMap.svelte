<script lang="ts">
	import { tick } from 'svelte';
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import type { Profile } from '$lib/state/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import Stars from '$lib/ui/components/Stars.svelte';
	import { centerInView } from '$lib/ui/focus';
	import { layoutMap } from './map';

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
</script>

{#if layout.worlds.length > 0}
	<ScreenFrame title={m.play_map_title()}>
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
								<button type="button" class="node" onclick={() => onopen(lesson.id)}>
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
	</ScreenFrame>
{:else}
	<ScreenFrame title={m.play_error_content()}>
		<Button onclick={onchangeplayer}>{m.play_change_player()}</Button>
	</ScreenFrame>
{/if}

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
