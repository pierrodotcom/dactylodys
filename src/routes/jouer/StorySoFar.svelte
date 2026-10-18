<script lang="ts">
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import type { StoryMoment } from '$lib/engine/story';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import StoryPicture from '$lib/ui/story/StoryPicture.svelte';

	interface Props {
		/** Every moment already won, in the order of the progression (`storySoFar`). */
		moments: readonly StoryMoment[];
		progression: ProgressionDefinition;
		voice: VoicePlayer;
		onback: () => void;
	}

	let { moments, progression, voice, onback }: Props = $props();

	/** One page of the notebook per world, in the order of the map. */
	const pages = $derived(
		progression.worlds.flatMap((world) => {
			const told = moments.filter((moment) => moment.worldId === world.id);
			return told.length === 0 ? [] : [{ id: world.id, title: world.title, moments: told }];
		})
	);
</script>

<ScreenFrame title={m.play_story_so_far_title()} wide>
	<Button variant="secondary" onclick={onback}>{m.play_story_so_far_back()}</Button>
	{#if pages.length === 0}
		<p class="empty">{m.play_story_so_far_empty()}</p>
	{/if}
	{#each pages as page (page.id)}
		<section class="page" aria-labelledby="story-page-{page.id}">
			<h2 id="story-page-{page.id}">{page.title}</h2>
			<ol class="moments">
				{#each page.moments as moment (moment.art)}
					<li data-story-moment={moment.kind} data-art={moment.art}>
						<StoryPicture art={moment.art} size="small" />
						<div class="say">
							<ListenButton text={moment.text} player={voice} />
							<p class="text">{moment.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
	{#if pages.length > 0}
		<Button variant="secondary" onclick={onback}>{m.play_story_so_far_back()}</Button>
	{/if}
</ScreenFrame>

<style>
	.empty {
		font-size: var(--dd-font-size-xl);
	}

	.page {
		display: grid;
		gap: var(--dd-space-md);
		inline-size: 100%;
		padding: var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
	}

	h2 {
		font-size: var(--dd-font-size-2xl);
	}

	.moments {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-story-picture-small), 1fr));
		gap: var(--dd-space-lg);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		gap: var(--dd-space-sm);
		align-content: start;
		justify-items: center;
	}

	.say {
		display: flex;
		gap: var(--dd-space-sm);
		align-items: start;
		text-align: start;
	}

	.text {
		font-size: var(--dd-font-size-lg);
		line-height: var(--dd-line-height-relaxed);
	}
</style>
