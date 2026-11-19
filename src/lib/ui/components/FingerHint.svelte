<script lang="ts">
	import type { FingeringProfile, KeyPress, LayoutDefinition } from '$lib/keyboard/types';
	import { fingerHint } from './names';

	interface Props {
		target: KeyPress | null;
		layout: LayoutDefinition;
		fingering: FingeringProfile;
	}

	let { target, layout, fingering }: Props = $props();

	const text = $derived(fingerHint(layout, fingering, target));
</script>

<p class="finger-hint">{text}</p>

<style>
	/* Lighter than the text to type, which it changes with at each key: a help, not the task (E-22). */
	.finger-hint {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-regular);
		line-height: var(--dd-line-height-tight);
	}
</style>
