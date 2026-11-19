<script lang="ts">
	import { focusableWhileScrolling } from '$lib/ui/focus';
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import type { Formatters } from './format';
	import { worldSummaries } from './report';
	import { currentLesson } from './session-sheet';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition | undefined;
		format: Formatters;
	}

	let { profile, progression, format }: Props = $props();

	const worlds = $derived(progression ? worldSummaries(progression, profile.progress) : []);
	const lesson = $derived(currentLesson(progression, profile));
	const lastPlay = $derived(profile.sessions.at(-1));
</script>

<!-- What the adult comes to read first: where the child is, then the lessons world by world. -->
<section class="lessons" aria-labelledby="now-title" data-child-lessons>
	<h2 id="now-title">{m.adult_report_now_title({ name: profile.name })}</h2>
	{#if lesson || lastPlay}
		<ul class="facts" data-report-now>
			{#if lesson}
				<li data-report-lesson>
					{m.adult_sheet_now_lesson({
						lesson: lesson.title,
						number: lesson.number,
						world: lesson.worldTitle
					})}
				</li>
			{/if}
			{#if lastPlay}
				<li data-report-last-play>
					{m.adult_report_last_play({
						date: format.sessionDate(lastPlay.finishedAt, lastPlay.utcOffsetMinutes)
					})}
				</li>
			{/if}
		</ul>
	{/if}
	<h3 id="lessons-title">{m.adult_lessons_title()}</h3>
	{#if progression}
		<div
			class="dd-table-scroll"
			role="region"
			aria-labelledby="lessons-title"
			{@attach focusableWhileScrolling}
		>
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
								>{m.adult_lessons_value({
									count: world.lessonsPassed,
									total: world.lessonCount
								})}</td
							>
							<td>{m.adult_lessons_value({ count: world.stars, total: world.maxStars })}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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

	h3 {
		font-size: var(--dd-font-size-lg);
	}

	.facts {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding-inline-start: var(--dd-space-lg);
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
