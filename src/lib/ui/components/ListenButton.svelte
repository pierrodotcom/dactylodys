<script lang="ts">
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from './Button.svelte';

	interface Props {
		/** The sentence to say: the button only shows when the voice has a clip for it. */
		text: string;
		player: VoicePlayer;
	}

	const SPEAKER_PATH = 'M3 9h4l5-4v14l-5-4H3z';
	const WAVE_PATHS = ['M15.5 9a4 4 0 0 1 0 6', 'M18 6.5a7.5 7.5 0 0 1 0 11'];
	const STOP_PATH = 'M6 6h12v12H6z';

	let { text, player }: Props = $props();

	let playing = $state(false);
	/** Numbers the requests, so that the end of an older one never turns off a newer one. */
	let request = 0;

	const available = $derived(player.has(text));

	async function toggle() {
		if (playing) {
			player.stop();
			return;
		}
		request += 1;
		const mine = request;
		playing = true;
		await player.speak(text);
		if (mine === request) playing = false;
	}

	// A sentence that leaves the screen, or is replaced by another, stops being said.
	$effect(() => {
		const saidBy = player;
		void text;
		return () => {
			if (!playing) return;
			request += 1;
			playing = false;
			saidBy.stop();
		};
	});
</script>

{#if available}
	<span class="listen">
		<!-- Pointer or focus on the button: the clip starts loading, and plays at once on the click. -->
		<Button
			variant="secondary"
			data-playing={playing}
			onpointerenter={() => player.prepare(text)}
			onfocus={() => player.prepare(text)}
			onclick={toggle}
		>
			<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
				{#if playing}
					<path d={STOP_PATH} />
				{:else}
					<path d={SPEAKER_PATH} />
					{#each WAVE_PATHS as wave (wave)}
						<path class="wave" d={wave} />
					{/each}
				{/if}
			</svg>
			{playing ? m.ui_listen_stop() : m.ui_listen_start()}
		</Button>
		<span class="dd-visually-hidden" role="status">{playing ? m.ui_listen_playing() : ''}</span>
	</span>
{/if}

<style>
	.listen {
		display: inline-flex;
	}

	svg {
		flex: none;
		inline-size: var(--dd-font-size-lg);
		block-size: var(--dd-font-size-lg);
	}

	path {
		fill: currentColor;
	}

	.wave {
		fill: none;
		stroke: currentColor;
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
	}
</style>
