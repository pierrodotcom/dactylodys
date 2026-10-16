<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';

	interface Props {
		/** Which dance the companion does: the one of the lesson of the key. */
		dance: number;
		saveFailed: boolean;
		/** What the quest earned, if anything. */
		news?: Snippet;
		onmap: () => void;
	}

	let { dance, saveFailed, news, onmap }: Props = $props();
</script>

<!-- No stars, no percentage: whatever the result, the companion only says thank you. -->
<ScreenFrame title={m.play_help_thanks()}>
	<Companion mood="cheer" {dance} />
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
