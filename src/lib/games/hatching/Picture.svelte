<script lang="ts">
	import HatchEgg from './HatchEgg.svelte';

	const CRACKS_SHOWN = 2;
</script>

<div class="fit">
	<HatchEgg stage={CRACKS_SHOWN} hatched={false} variant={0} />
</div>

<style>
	/* The egg is taller than wide: it takes the height of the picture, not its width. */
	.fit {
		block-size: 100%;
		aspect-ratio: 4 / 5;
		margin-inline: auto;
	}
</style>
