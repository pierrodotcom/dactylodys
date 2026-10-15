<script lang="ts">
	import RocketShape from './RocketShape.svelte';
</script>

<svg class="picture" viewBox="-34 -44 68 112" focusable="false" aria-hidden="true">
	<RocketShape landed={false} thrust={0} still={true} />
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}
</style>
