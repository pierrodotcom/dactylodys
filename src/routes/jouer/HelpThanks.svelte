<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';

	interface Props {
		/** What the companion says: by default, the thanks of a help quest. */
		title?: string;
		/** Which dance the companion does: the one of the lesson of the key. */
		dance: number;
		saveFailed: boolean;
		/** Says what the companion says, on demand, once it is recorded (audit P-12). */
		voice: VoicePlayer;
		/** What the play earned, if anything. */
		news?: Snippet;
		onmap: () => void;
	}

	let { title = m.play_help_thanks(), dance, saveFailed, voice, news, onmap }: Props = $props();
</script>

<!-- No stars, no percentage: whatever the result, the companion only says thank you or well done. -->
<ScreenFrame {title}>
	<Companion mood="cheer" {dance} />
	<ListenButton text={title} player={voice} />
	{@render news?.()}
	{#if saveFailed}
		<p class="warning" role="alert">{m.play_result_save_error()}</p>
	{/if}
	<Button onclick={onmap}>{m.play_help_back()}</Button>
</ScreenFrame>

<style>
	.warning {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
