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
	.finger-hint {
		color: var(--dd-color-text-primary);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}
</style>
