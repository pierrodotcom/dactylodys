<script lang="ts">
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import type { StoryMoment } from '$lib/engine/story';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { focusSoon } from '$lib/ui/focus';
	import { readDurationToken } from '$lib/ui/motion';
	import StoryPicture from '$lib/ui/story/StoryPicture.svelte';

	interface Props {
		moment: StoryMoment;
		/** The world the moment belongs to: the page of the travel notebook. */
		worldTitle: string;
		voice: VoicePlayer;
		oncontinue: () => void;
	}

	/** The child may still be pressing Enter on the previous screen: the button waits a moment. */
	const FOCUS_DELAY_TOKEN = '--dd-duration-base';

	let { moment, worldTitle, voice, oncontinue }: Props = $props();

	// The child does not read: the sentence is said once as it appears, never during typing.
	$effect(() => {
		const said = moment.text;
		const speaker = voice;
		void speaker.speak(said);
		return () => speaker.stop();
	});
</script>

<ScreenFrame title={worldTitle} focusHeading={false}>
	<figure class="moment" data-story-moment={moment.kind} data-art={moment.art}>
		<StoryPicture art={moment.art} />
		<figcaption>
			<ListenButton text={moment.text} player={voice} />
			<p class="text">{moment.text}</p>
		</figcaption>
	</figure>
	<Button
		size="lg"
		data-story-continue
		onclick={oncontinue}
		{@attach focusSoon(readDurationToken(FOCUS_DELAY_TOKEN))}
	>
		{m.play_story_continue()}
	</Button>
</ScreenFrame>

<style>
	.moment {
		display: grid;
		gap: var(--dd-space-lg);
		justify-items: center;
		inline-size: 100%;
		margin: 0;
	}

	figcaption {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-md);
		align-items: center;
		justify-content: center;
	}

	.text {
		font-size: var(--dd-font-size-2xl);
		line-height: var(--dd-line-height-relaxed);
	}
</style>
