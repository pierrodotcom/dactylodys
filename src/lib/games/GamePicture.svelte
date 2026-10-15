<script lang="ts">
	import type { Component } from 'svelte';
	import HatchingPicture from './hatching/Picture.svelte';
	import RecipePicture from './recipe/Picture.svelte';
	import RocketPicture from './rocket/Picture.svelte';

	interface Props {
		gameId: string;
	}

	/** The picture of each game, to choose it without reading. A game without one shows nothing. */
	const PICTURES: Readonly<Record<string, Component>> = {
		hatching: HatchingPicture,
		rocket: RocketPicture,
		recipe: RecipePicture
	};

	let { gameId }: Props = $props();

	const Picture = $derived(Object.hasOwn(PICTURES, gameId) ? PICTURES[gameId] : undefined);
</script>

{#if Picture}
	<Picture />
{/if}
