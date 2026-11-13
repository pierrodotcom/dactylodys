<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { spokenGrapheme } from '$lib/ui/components/spoken';
	import type { GameProps } from '../types';
	import GameShell from '../shared/GameShell.svelte';
	import { decorFor } from '../shared/decor';
	import { isRewarded, type GameView } from '../shared/game-view';
	import Progress from './Progress.svelte';
	import Scene from './Scene.svelte';
	import { questionOf, reactionOf } from './talk';
	import { QUESTIONS, REACTIONS } from './texts';

	const props: GameProps = $props();

	const decor = $derived(decorFor('dialogue', props.playCount));

	/**
	 * A new question is said once, with the text to type, the moment it appears, even when the answer
	 * arrives begun with a mistake to erase (lesson of repairs).
	 */
	function isNewQuestion(view: GameView): boolean {
		return view.phase === 'typing' && view.untouched;
	}

	function announce(view: GameView): string {
		if (isRewarded(view)) {
			const quip = reactionOf(REACTIONS, view)?.line() ?? '';
			return view.groupIndex === view.total - 1
				? m.game_dialogue_announce_last({ quip })
				: m.game_dialogue_announce_group({ quip });
		}
		if (!isNewQuestion(view)) return '';
		const text =
			view.group.length === 1 ? spokenGrapheme(view.group[0] ?? '') : view.group.join('');
		return m.game_dialogue_announce_question({
			question: questionOf(QUESTIONS, view)?.() ?? '',
			text
		});
	}
</script>

<GameShell
	{...props}
	title={m.game_dialogue_title()}
	pauseText={m.game_dialogue_pause_text()}
	arrangement="wide"
	{progress}
	{scene}
	{announce}
/>

{#snippet progress(view: GameView)}
	<Progress
		total={view.total}
		done={view.completed}
		current={isRewarded(view) ? -1 : view.groupIndex}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	<Scene {view} {decor} />
{/snippet}
