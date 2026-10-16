<script lang="ts">
	/*
	 * Contract (lot R2): the drawing of one reward on its own, for lists and announcements.
	 * Placeholder until the drawings land: the art package replaces the body, not the props.
	 */
	import type { RewardKind } from '$lib/engine/rewards/types';

	interface Props {
		artId: string;
		kind: RewardKind;
		/** `false`: drawn as a silhouette, with what to master said by the caller. */
		owned: boolean;
		/** Accessible name, usually the title of the reward. */
		label: string;
	}

	let { artId, kind, owned, label }: Props = $props();
</script>

<svg
	class="reward-picture"
	viewBox="0 0 120 120"
	role="img"
	aria-label={label}
	data-art={artId}
	data-kind={kind}
	data-owned={owned}
>
	<circle class="shape" class:locked={!owned} cx="60" cy="60" r="44" />
</svg>

<style>
	.reward-picture {
		inline-size: 100%;
		block-size: auto;
	}

	.shape {
		fill: var(--dd-color-companion-body);
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.locked {
		fill: var(--dd-color-surface-sunken);
	}
</style>
