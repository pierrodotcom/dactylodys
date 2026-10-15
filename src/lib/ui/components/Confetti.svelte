<script lang="ts">
	/** Directions of the pieces, in degrees: a burst all around, the same every time. */
	const ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330] as const;
	const COLORS = 4;
</script>

<svg class="confetti" viewBox="-100 -100 200 200" focusable="false" aria-hidden="true">
	{#each ANGLES as angle, index (angle)}
		<g transform="rotate({angle})">
			<rect class="piece" x="-4" y="-2" width="8" height="4" rx="1" data-color={index % COLORS} />
		</g>
	{/each}
</svg>

<style>
	.confetti {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
		pointer-events: none;
	}

	.piece {
		transform-box: fill-box;
		transform-origin: center;
		opacity: 0;
		animation-name: burst;
		animation-duration: var(--dd-duration-confetti);
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-beat));
		animation-timing-function: var(--dd-easing-enter);
		animation-fill-mode: both;
	}

	.piece[data-color='0'] {
		fill: var(--dd-color-star-fill);
	}

	.piece[data-color='1'] {
		fill: var(--dd-color-finger-left-index);
	}

	.piece[data-color='2'] {
		fill: var(--dd-color-finger-right-ring);
	}

	.piece[data-color='3'] {
		fill: var(--dd-color-finger-left-middle);
	}

	@keyframes burst {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: 0deg;
		}

		15% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 1.4) 0;
			rotate: 270deg;
		}
	}
</style>
