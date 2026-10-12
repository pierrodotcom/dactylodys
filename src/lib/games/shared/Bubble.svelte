<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Draw the bubble without the little pop. */
		still?: boolean;
		/** Smaller text, for a bubble drawn over a picture. */
		compact?: boolean;
		children: Snippet;
	}

	let { still = false, compact = false, children }: Props = $props();
</script>

<p
	class="bubble"
	aria-hidden="true"
	data-still={still || undefined}
	data-compact={compact || undefined}
>
	{@render children()}
</p>

<style>
	.bubble {
		position: relative;
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-bubble-border);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-bubble-surface);
		color: var(--dd-color-bubble-text);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
		animation-name: pop;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	.bubble[data-compact] {
		font-size: var(--dd-font-size-lg);
	}

	.bubble[data-still] {
		animation-name: none;
	}

	@keyframes pop {
		0% {
			scale: 0.6;
		}

		100% {
			scale: 1;
		}
	}
</style>
