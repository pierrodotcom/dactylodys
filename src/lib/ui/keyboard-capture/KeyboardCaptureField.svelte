<script lang="ts">
	import type { RawInputEvent } from '$lib/keyboard/types';
	import { attachKeyboardCapture, CAPTURE_FIELD_ATTRIBUTES } from './capture';

	interface Props {
		id: string;
		describedby?: string;
		rows?: number;
		onevent: (event: RawInputEvent) => void;
	}

	let { id, describedby, rows = 3, onevent }: Props = $props();

	let field: HTMLTextAreaElement | undefined = $state();

	export function clear() {
		if (field) field.value = '';
	}

	export function focus() {
		field?.focus();
	}
</script>

<textarea
	bind:this={field}
	{@attach (node) => attachKeyboardCapture(node, (event) => onevent(event))}
	{id}
	{rows}
	aria-describedby={describedby}
	{...CAPTURE_FIELD_ATTRIBUTES}></textarea>

<style>
	textarea {
		display: block;
		inline-size: 100%;
		min-block-size: calc(var(--dd-size-touch-target-min) * 2);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-font-size-lg);
		line-height: var(--dd-line-height-base);
		resize: vertical;
	}
</style>
