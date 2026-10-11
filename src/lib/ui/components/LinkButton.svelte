<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAnchorAttributes, 'children' | 'class' | 'style'> {
		size?: 'md' | 'lg';
		children: Snippet;
	}

	let { size = 'md', children, ...rest }: Props = $props();
</script>

<a {...rest} data-size={size}>{@render children()}</a>

<style>
	a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-sm);
		min-block-size: var(--dd-size-touch-target-min);
		min-inline-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-xl);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-accent-base);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-accent-base);
		color: var(--dd-color-text-on-accent);
		font-family: inherit;
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
		text-decoration: none;
		cursor: pointer;
		transition-property: background-color, border-color, scale;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-standard);
	}

	a[data-size='lg'] {
		min-block-size: calc(var(--dd-size-touch-target-min) * 1.5);
		padding: var(--dd-space-md) var(--dd-space-2xl);
		font-size: var(--dd-font-size-xl);
	}

	a:hover {
		border-color: var(--dd-color-accent-hover);
		background-color: var(--dd-color-accent-hover);
	}

	a:active {
		box-shadow: var(--dd-shadow-inset);
		scale: var(--dd-scale-press);
	}
</style>
