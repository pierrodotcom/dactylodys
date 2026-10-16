<script lang="ts">
	import HatchEgg from '$lib/games/hatching/HatchEgg.svelte';

	interface Props {
		/** How many baby dinos march past, one per lesson of the world. */
		count: number;
	}

	let { count }: Props = $props();

	const babies = $derived(Array.from({ length: Math.max(0, count) }, (_, index) => index));
</script>

<ul class="parade" aria-hidden="true">
	{#each babies as baby (baby)}
		<li class="baby">
			<HatchEgg stage={0} hatched={true} variant={baby} />
		</li>
	{/each}
</ul>

<style>
	.parade {
		display: flex;
		justify-content: center;
		gap: var(--dd-space-sm);
		margin: 0;
		padding: 0;
		overflow: hidden;
		list-style: none;
		animation-name: march-in;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-enter);
		animation-fill-mode: both;
	}

	.baby {
		inline-size: var(--dd-size-egg-mini);
		animation-name: waddle;
		animation-duration: var(--dd-duration-beat);
		animation-iteration-count: 4;
		animation-timing-function: var(--dd-easing-standard);
	}

	.baby:nth-child(even) {
		animation-delay: calc(var(--dd-duration-beat) / 2);
	}

	@keyframes march-in {
		0% {
			opacity: 0;
			translate: -100% 0;
		}

		20% {
			opacity: 100%;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes waddle {
		0%,
		100% {
			rotate: 0deg;
			translate: 0 0;
		}

		25% {
			rotate: -8deg;
			translate: 0 calc(var(--dd-space-xs) * -1);
		}

		75% {
			rotate: 8deg;
			translate: 0 calc(var(--dd-space-xs) * -1);
		}
	}
</style>
