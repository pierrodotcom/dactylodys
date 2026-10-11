<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLButtonAttributes, 'children' | 'class' | 'style'> {
		variant?: 'primary' | 'secondary' | 'quiet';
		size?: 'md' | 'lg';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', type = 'button', children, ...rest }: Props = $props();
</script>

<button {...rest} {type} data-variant={variant} data-size={size}>{@render children()}</button>

<style>
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-sm);
		min-block-size: var(--dd-size-touch-target-min);
		min-inline-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-xl);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: transparent;
		border-radius: var(--dd-radius-md);
		font-family: inherit;
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
		cursor: pointer;
		transition-property: background-color, border-color, scale;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-standard);
	}

	button[data-size='lg'] {
		min-block-size: calc(var(--dd-size-touch-target-min) * 1.5);
		padding: var(--dd-space-md) var(--dd-space-2xl);
		font-size: var(--dd-font-size-xl);
	}

	button[data-variant='primary'] {
		border-color: var(--dd-color-accent-base);
		background-color: var(--dd-color-accent-base);
		color: var(--dd-color-text-on-accent);
	}

	button[data-variant='secondary'] {
		border-color: var(--dd-color-border-strong);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
	}

	button[data-variant='quiet'] {
		background-color: transparent;
		color: var(--dd-color-accent-base);
	}

	button[data-variant='primary']:hover:not(:disabled) {
		border-color: var(--dd-color-accent-hover);
		background-color: var(--dd-color-accent-hover);
	}

	button[data-variant='secondary']:hover:not(:disabled),
	button[data-variant='quiet']:hover:not(:disabled) {
		background-color: var(--dd-color-surface-sunken);
	}

	button:active:not(:disabled) {
		box-shadow: var(--dd-shadow-inset);
		scale: var(--dd-scale-press);
	}

	button:disabled {
		opacity: var(--dd-opacity-disabled);
		cursor: not-allowed;
	}
</style>
