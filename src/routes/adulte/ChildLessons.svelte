<script lang="ts">
	import type { ProgressionDefinition, ProgressState } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import { worldSummaries } from './report';

	interface Props {
		progression: ProgressionDefinition | undefined;
		progress: ProgressState;
	}

	let { progression, progress }: Props = $props();

	const worlds = $derived(progression ? worldSummaries(progression, progress) : []);
</script>

<section class="lessons" aria-labelledby="lessons-title" data-child-lessons>
	<h2 id="lessons-title">{m.adult_lessons_title()}</h2>
	{#if progression}
		<table>
			<thead>
				<tr>
					<th scope="col">{m.adult_lessons_world()}</th>
					<th scope="col">{m.adult_lessons_passed()}</th>
					<th scope="col">{m.adult_lessons_stars()}</th>
				</tr>
			</thead>
			<tbody>
				{#each worlds as world (world.worldId)}
					<tr>
						<th scope="row">{world.title}</th>
						<td
							>{m.adult_lessons_value({ count: world.lessonsPassed, total: world.lessonCount })}</td
						>
						<td>{m.adult_lessons_value({ count: world.stars, total: world.maxStars })}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p>{m.adult_no_progression()}</p>
	{/if}
</section>

<style>
	.lessons {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	table {
		border-collapse: collapse;
	}

	th,
	td {
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-block-end-width: var(--dd-border-width-thin);
		border-block-end-style: solid;
		border-block-end-color: var(--dd-color-border-subtle);
		text-align: start;
	}
</style>
