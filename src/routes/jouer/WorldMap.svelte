<script lang="ts">
	import { lessonIds } from '$lib/engine/progression/definition';
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import type { Profile } from '$lib/state/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import Stars from '$lib/ui/components/Stars.svelte';
	import { lessonStars, lessonStatus } from './map';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition;
		onopen: (lessonId: string) => void;
		onsettings: () => void;
		onchangeplayer: () => void;
	}

	let { profile, progression, onopen, onsettings, onchangeplayer }: Props = $props();

	const world = $derived(progression.worlds[0]);
	const numbers = $derived(lessonIds(progression));
</script>

{#if world}
	<ScreenFrame title={world.title}>
		<div class="hero">
			<Companion mood="idle" />
			<p class="greeting">{m.play_map_greeting({ name: profile.name })}</p>
		</div>

		<ol class="path" aria-label={m.play_map_lessons_label()}>
			{#each world.lessons as lesson, index (lesson.id)}
				{@const status = lessonStatus(progression, profile.progress, lesson.id)}
				{@const stars = lessonStars(profile.progress, lesson.id)}
				{@const number = numbers.indexOf(lesson.id) + 1}
				<li class="stop" data-status={status} data-side={index % 2}>
					{#if status === 'locked'}
						<div class="node">
							<svg class="lock" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
								<path d="M7 11V8a5 5 0 0 1 10 0v3" />
								<rect x="4.5" y="11" width="15" height="10" rx="2" />
							</svg>
							<span class="info">
								<span class="number">{m.play_lesson_number({ number })}</span>
								<span class="name">{lesson.title}</span>
								<span class="state">{m.play_lesson_locked()}</span>
							</span>
						</div>
					{:else}
						<button type="button" class="node" onclick={() => onopen(lesson.id)}>
							<span class="info">
								<span class="number">{m.play_lesson_number({ number })}</span>
								<span class="name">{lesson.title}</span>
								<span class="state">
									{status === 'done' ? m.play_lesson_done() : m.play_lesson_current()}
								</span>
							</span>
							<Stars count={stars} />
						</button>
					{/if}
				</li>
			{/each}
		</ol>

		<div class="actions">
			<Button variant="secondary" onclick={onsettings}>{m.play_settings_open()}</Button>
			<Button variant="quiet" onclick={onchangeplayer}>{m.play_change_player()}</Button>
		</div>
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

	.greeting {
		font-size: var(--dd-font-size-xl);
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

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}
</style>
