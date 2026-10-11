<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';

	interface Props {
		onreturn: () => void;
	}

	let { onreturn }: Props = $props();
</script>

<ScreenFrame title={m.play_break_title()}>
	<Companion mood="happy" />
	<p class="text">{m.play_break_text()}</p>
	<Button onclick={onreturn}>{m.play_break_return()}</Button>
</ScreenFrame>

<style>
	.text {
		font-size: var(--dd-font-size-xl);
	}
</style>
