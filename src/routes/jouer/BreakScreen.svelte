<script lang="ts">
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';

	interface Props {
		/** Says what to do during the break, on demand, once it is recorded (audit P-12). */
		voice: VoicePlayer;
		onreturn: () => void;
	}

	let { voice, onreturn }: Props = $props();
</script>

<ScreenFrame title={m.play_break_title()}>
	<Companion mood="happy" />
	<ListenButton text={m.play_break_text()} player={voice} />
	<p class="text">{m.play_break_text()}</p>
	<Button onclick={onreturn}>{m.play_break_return()}</Button>
</ScreenFrame>

<style>
	.text {
		font-size: var(--dd-font-size-xl);
	}
</style>
