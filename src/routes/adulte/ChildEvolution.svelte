<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import LineChart from '$lib/ui/components/LineChart.svelte';
	import { niceMax } from '$lib/ui/components/line-chart';
	import { isOne } from '$lib/ui/plural';
	import type { AdultRules } from './adult-rules';
	import { practiceWeeks, sessionPoints } from './evolution';
	import type { Formatters } from './format';

	interface Props {
		profile: Profile;
		rules: AdultRules;
		format: Formatters;
		/** `YYYY-MM-DD` on this device: the weeks of the days played go up to this one. */
		today: string;
		/** The handwriting speed, drawn across the speed chart; `null` before the first measure. */
		handwriting: number | null;
		lessonTitle: (lessonId: string) => string;
	}

	let { profile, rules, format, today, handwriting, lessonTitle }: Props = $props();

	const ACCURACY_MAX = 100;
	const ONE_DECIMAL = 1;
	const WHOLE = 0;

	const points = $derived(sessionPoints(profile.sessions, rules.sessionsShown));
	const weeks = $derived(practiceWeeks(profile.practiceDays, today, rules.weeksShown));
	const totalDays = $derived(weeks.at(-1)?.cumulativeDays ?? 0);
	const speeds = $derived(points.map((point) => point.wordsPerMinute));
	const speedMax = $derived(niceMax(Math.max(...speeds, handwriting ?? 0)));
	const daysMax = $derived(niceMax(totalDays));

	const whole = (value: number) => format.number(value, WHOLE);
</script>

<section class="evolution" aria-labelledby="evolution-title" data-child-evolution>
	<h2 id="evolution-title">{m.adult_evolution_title()}</h2>
	{#if points.length === 0}
		<p data-evolution-empty>{m.adult_evolution_empty({ name: profile.name })}</p>
	{:else}
		<p>
			{isOne(points.length)
				? m.adult_evolution_scope_one()
				: m.adult_evolution_scope_other({ count: points.length })}
		</p>
		<div class="charts">
			<figure>
				<figcaption>{m.adult_accuracy_title()}</figcaption>
				<LineChart
					values={points.map((point) => point.accuracy)}
					max={ACCURACY_MAX}
					formatTick={whole}
				/>
			</figure>
			<figure>
				<figcaption>{m.adult_speed_title()}</figcaption>
				<LineChart values={speeds} max={speedMax} reference={handwriting} formatTick={whole} />
				{#if handwriting !== null}
					<p class="note">
						{m.adult_speed_reference({ speed: format.number(handwriting, ONE_DECIMAL) })}
					</p>
				{/if}
				<p class="note">{m.adult_speed_note()}</p>
			</figure>
		</div>
		<details>
			<summary>{m.adult_table_show()}</summary>
			<table data-sessions-table>
				<caption>{m.adult_sessions_caption()}</caption>
				<thead>
					<tr>
						<th scope="col">{m.adult_table_session()}</th>
						<th scope="col">{m.adult_table_date()}</th>
						<th scope="col">{m.adult_table_lesson()}</th>
						<th scope="col">{m.adult_table_accuracy()}</th>
						<th scope="col">{m.adult_table_speed()}</th>
					</tr>
				</thead>
				<tbody>
					{#each points as point (point.rank)}
						<tr>
							<th scope="row">{point.rank}</th>
							<td>{format.sessionDate(point.finishedAt, point.utcOffsetMinutes)}</td>
							<td>{lessonTitle(point.lessonId)}</td>
							<td>{format.number(point.accuracy, ONE_DECIMAL)}</td>
							<td>{format.number(point.wordsPerMinute, ONE_DECIMAL)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</details>
	{/if}

	{#if weeks.length > 0}
		<figure>
			<figcaption>{m.adult_days_title()}</figcaption>
			<LineChart
				values={weeks.map((week) => week.cumulativeDays)}
				max={daysMax}
				formatTick={whole}
			/>
			<p class="note" data-days-total>
				{isOne(totalDays)
					? m.adult_days_total_one({ count: totalDays })
					: m.adult_days_total_other({ count: totalDays })}
			</p>
		</figure>
		<details>
			<summary>{m.adult_table_show()}</summary>
			<table data-weeks-table>
				<caption>{m.adult_weeks_caption()}</caption>
				<thead>
					<tr>
						<th scope="col">{m.adult_table_week()}</th>
						<th scope="col">{m.adult_table_week_days()}</th>
						<th scope="col">{m.adult_table_week_total()}</th>
					</tr>
				</thead>
				<tbody>
					{#each weeks as week (week.weekStart)}
						<tr>
							<th scope="row">{format.day(week.weekStart)}</th>
							<td>{week.days}</td>
							<td>{week.cumulativeDays}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</details>
	{/if}
</section>

<style>
	.evolution {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: stretch;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.charts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-lg);
	}

	figure {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
	}

	figcaption {
		font-weight: var(--dd-font-weight-bold);
	}

	.note {
		color: var(--dd-color-text-secondary);
	}

	summary {
		display: flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
		cursor: pointer;
	}

	table {
		border-collapse: collapse;
	}

	caption {
		font-weight: var(--dd-font-weight-bold);
		text-align: start;
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
