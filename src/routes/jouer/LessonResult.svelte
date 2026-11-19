<script lang="ts">
	import type { SoundPlayer } from '$lib/audio';
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import type { StarCount } from '$lib/engine/progression/types';
	import type { RewardDefinition } from '$lib/engine/rewards';
	import { resultPlan, resultSteps, type PlayFacts } from './lesson-outcome';
	import LessonResultName from './LessonResultName.svelte';
	import LessonResultReward from './LessonResultReward.svelte';
	import LessonResultSummary from './LessonResultSummary.svelte';
	import type { ResultSummary } from './summary';

	interface Props {
		stars: StarCount;
		summary: ResultSummary;
		/** What the result knows of the play: its buttons and its sentence follow from it. */
		facts: PlayFacts;
		saveFailed: boolean;
		/** This play opened the grand tour of its world: the result says so in one sentence. */
		tourOpened?: boolean;
		/** Which dance the companion does, in the order of the lessons. */
		dance: number;
		/** The day of the play, written under the souvenir photo. */
		date: Date;
		/** Lessons of the world: as many baby dinos march past when it is done. */
		worldLessons: number;
		/** Calm motion: the stars fade in, no confetti. */
		still: boolean;
		sounds: SoundPlayer;
		/** Says the sentences of the result, on demand, once they are recorded. */
		voice: VoicePlayer;
		/** What was just earned, in the order of the catalogue: one step each. */
		rewards: readonly RewardDefinition[];
		/** Identifiers of the items the companion wears now. */
		wornIds: readonly string[];
		/** The companion asks for its name, once the rewards are shown. */
		askName: boolean;
		/** The name the companion has now; empty while it has none. */
		companionName: string;
		suggestions: readonly string[];
		/**
		 * The step on screen, kept by the page: the settings or the companion opened from the result
		 * give it back where it was.
		 */
		step?: number;
		onwear: (item: RewardDefinition) => void;
		onname: (name: string) => void;
		onlater: () => void;
		onnext: () => void;
		onreplay: () => void;
		onmap: () => void;
		onbreak: () => void;
	}

	let {
		stars,
		summary,
		facts,
		saveFailed,
		tourOpened = false,
		dance,
		date,
		worldLessons,
		still,
		sounds,
		voice,
		rewards,
		wornIds,
		askName,
		companionName,
		suggestions,
		step = $bindable(0),
		onwear,
		onname,
		onlater,
		onnext,
		onreplay,
		onmap,
		onbreak
	}: Props = $props();

	// One moment at a time (audit E-04): each reward, the name, then the stars and what comes next.
	const steps = $derived(resultSteps(rewards.length, askName));
	const position = $derived(Math.min(Math.max(0, step), steps.length - 1));
	const current = $derived(steps[position] ?? { kind: 'result' as const });
	const plan = $derived(resultPlan(facts));

	function goOn() {
		step = Math.min(position + 1, steps.length - 1);
		// Each step opens at its top, like a screen of its own, whatever the one before was scrolled to.
		window.scrollTo(0, 0);
	}

	function later() {
		onlater();
		goOn();
	}
</script>

<!-- Each step is a screen of its own: its title takes the focus, and is all a screen reader says. -->
{#key position}
	{#if current.kind === 'reward' && rewards[current.index]}
		<LessonResultReward
			reward={rewards[current.index] as RewardDefinition}
			index={current.index}
			total={rewards.length}
			{wornIds}
			{onwear}
			oncontinue={goOn}
			{onmap}
		/>
	{:else if current.kind === 'name'}
		<LessonResultName
			name={companionName}
			{suggestions}
			{onname}
			onlater={later}
			oncontinue={goOn}
			{onmap}
		/>
	{:else}
		<LessonResultSummary
			{stars}
			{summary}
			{facts}
			{plan}
			{saveFailed}
			{tourOpened}
			{dance}
			{date}
			{worldLessons}
			{still}
			{sounds}
			{voice}
			{onnext}
			{onreplay}
			{onmap}
			{onbreak}
		/>
	{/if}
{/key}
