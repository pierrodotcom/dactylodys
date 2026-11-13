<script lang="ts">
	import { tick } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import type { RewardCatalogue, RewardDefinition } from '$lib/engine/rewards';
	import { m } from '$lib/paraglide/messages.js';
	import { trophyKeys } from '$lib/ui/companion/items';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import HideoutScene, { type SceneObject } from '$lib/ui/hideout/HideoutScene.svelte';
	import {
		arrangeHideout,
		decorationsFor,
		HIDEOUT_RULES,
		placeDecoration,
		removeDecoration,
		type HideoutLayout
	} from './hideout';

	interface Props {
		catalogue: RewardCatalogue;
		/** Identifiers of what the child owns (`ownedRewards`). */
		owned: ReadonlySet<string>;
		/** What the profile keeps (`Profile.hideout`). */
		layout: HideoutLayout;
		saveFailed: boolean;
		/** Every change is kept at once. */
		onchange: (layout: HideoutLayout) => void;
		onback: () => void;
	}

	let { catalogue, owned, layout, saveFailed, onchange, onback }: Props = $props();

	const PLACE_LABELS: Readonly<Record<string, () => string>> = {
		ceiling: m.play_hideout_place_ceiling,
		wall: m.play_hideout_place_wall,
		pegs: m.play_hideout_place_pegs,
		window: m.play_hideout_place_window,
		shelf: m.play_hideout_place_shelf,
		'coat-stand': m.play_hideout_place_coat_stand,
		chest: m.play_hideout_place_chest,
		desk: m.play_hideout_place_desk,
		rug: m.play_hideout_place_rug,
		corner: m.play_hideout_place_corner
	};
	const rules = HIDEOUT_RULES;
	/** Places of the data that this screen can name: an unknown one is not offered. */
	const places = rules.places.filter((place) => Object.hasOwn(PLACE_LABELS, place));

	/** The place whose objects are offered; `null`: the list of the places. */
	let chosen = $state<string | null>(null);
	/** The place under the keyboard focus or the pointer in the list, outlined in the cabin. */
	let pointed = $state<string | null>(null);
	let status = $state('');
	let placeButtons = $state<Record<string, HTMLButtonElement | undefined>>({});
	let objectButtons = $state<HTMLButtonElement[]>([]);
	let chooserHeading = $state<HTMLHeadingElement | undefined>();
	/** The place of the list reached by Tab (roving focus): the last one chosen, or the first. */
	let current = $state(places[0] ?? '');

	const arranged = $derived(arrangeHideout(layout, rules, catalogue, owned));
	const objects = $derived<Readonly<Record<string, SceneObject>>>(
		Object.fromEntries(
			[...arranged].map(([place, reward]) => [
				place,
				{ artId: reward.artId, keys: trophyKeys(reward) }
			])
		)
	);
	const offered = $derived(chosen === null ? [] : decorationsFor(rules, catalogue, owned, chosen));
	const ownsAnything = $derived(
		places.some((place) => decorationsFor(rules, catalogue, owned, place).length > 0)
	);

	function placeLabel(place: string): string {
		return PLACE_LABELS[place]?.() ?? place;
	}

	/** A title of the catalogue inside a sentence: « la toque de chef ». */
	function inSentence(title: string): string {
		return title.charAt(0).toLocaleLowerCase(getLocale()) + title.slice(1);
	}

	function describe(place: string): string {
		const reward = arranged.get(place);
		return reward
			? m.play_hideout_place_with({ place: placeLabel(place), item: inSentence(reward.title) })
			: m.play_hideout_place_free({ place: placeLabel(place) });
	}

	function whereIs(reward: RewardDefinition): string | null {
		for (const [place, there] of arranged) if (there.id === reward.id) return place;
		return null;
	}

	async function choose(place: string) {
		chosen = place;
		current = place;
		status = '';
		await tick();
		chooserHeading?.focus();
	}

	async function backToPlaces() {
		const place = chosen;
		chosen = null;
		await tick();
		if (place !== null) placeButtons[place]?.focus();
	}

	function put(reward: RewardDefinition) {
		if (chosen === null) return;
		const place = chosen;
		onchange(placeDecoration(layout, rules, catalogue, owned, place, reward.id));
		status = m.play_hideout_done_put({ place: placeLabel(place), item: inSentence(reward.title) });
	}

	async function takeAway() {
		if (chosen === null) return;
		const place = chosen;
		onchange(removeDecoration(layout, rules, catalogue, owned, place));
		status = m.play_hideout_done_remove({ place: placeLabel(place) });
		await tick();
		objectButtons[0]?.focus();
	}

	/** Arrows go from one button to the next of a list, Home and End to its ends. */
	function rove(event: KeyboardEvent, buttons: readonly (HTMLButtonElement | undefined)[]) {
		const list = buttons.filter((button): button is HTMLButtonElement => button !== undefined);
		const index = list.findIndex((button) => button === event.currentTarget);
		if (index < 0) return;
		const last = list.length - 1;
		const next =
			event.key === 'ArrowDown' || event.key === 'ArrowRight'
				? Math.min(index + 1, last)
				: event.key === 'ArrowUp' || event.key === 'ArrowLeft'
					? Math.max(index - 1, 0)
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? last
							: null;
		if (next === null) return;
		event.preventDefault();
		list[next]?.focus();
	}

	/** Escape in the list of objects goes back to the places, before it would leave the screen. */
	const escapeToPlaces: Attachment<HTMLElement> = (node) => {
		const leave = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			void backToPlaces();
		};
		node.addEventListener('keydown', leave);
		return () => node.removeEventListener('keydown', leave);
	};
</script>

<ScreenFrame
	title={m.play_hideout_title()}
	wide
	back={{ label: m.play_hideout_back(), onclick: onback }}
>
	<div class="room">
		<div class="scene" data-hideout-scene>
			<HideoutScene {objects} marked={chosen ?? pointed} still={(chosen ?? pointed) !== null} />
		</div>

		<div class="side">
			{#if chosen === null}
				<section class="places" aria-labelledby="hideout-places">
					<h2 id="hideout-places">{m.play_hideout_places()}</h2>
					<p class="hint">
						{ownsAnything ? m.play_hideout_hint() : m.play_hideout_welcome()}
					</p>
					<ul class="buttons">
						{#each places as place (place)}
							{@const reward = arranged.get(place)}
							<li>
								<button
									type="button"
									class="place"
									bind:this={placeButtons[place]}
									tabindex={place === current ? 0 : -1}
									aria-label={describe(place)}
									data-place={place}
									data-filled={reward ? '' : undefined}
									onclick={() => choose(place)}
									onkeydown={(event) =>
										rove(
											event,
											places.map((p) => placeButtons[p])
										)}
									onfocus={() => {
										pointed = place;
										current = place;
									}}
									onblur={() => (pointed = null)}
									onpointerenter={() => (pointed = place)}
									onpointerleave={() => (pointed = null)}
								>
									<span class="place-name">{placeLabel(place)}</span>
									<span class="place-object" aria-hidden="true">
										{reward ? reward.title : m.play_hideout_free()}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{:else}
				<section class="chooser" aria-labelledby="hideout-chosen" {@attach escapeToPlaces}>
					<h2 id="hideout-chosen" tabindex="-1" bind:this={chooserHeading}>
						{describe(chosen)}
					</h2>
					<div class="chooser-actions">
						<Button variant="secondary" onclick={backToPlaces}
							>{m.play_hideout_other_place()}</Button
						>
						{#if arranged.has(chosen)}
							<Button variant="secondary" onclick={takeAway}>{m.play_hideout_remove()}</Button>
						{/if}
					</div>
					{#if offered.length === 0}
						<p class="hint">{m.play_hideout_nothing_fits()}</p>
					{:else}
						<p class="hint">{m.play_hideout_choose_hint()}</p>
						<ul class="buttons objects">
							{#each offered as reward, index (reward.id)}
								{@const here = arranged.get(chosen)?.id === reward.id}
								{@const elsewhere = here ? null : whereIs(reward)}
								<li>
									<button
										type="button"
										class="object"
										bind:this={objectButtons[index]}
										tabindex={index === 0 ? 0 : -1}
										aria-pressed={here}
										aria-describedby={elsewhere ? `hideout-where-${index}` : undefined}
										data-object={reward.id}
										onclick={() => put(reward)}
										onkeydown={(event) => rove(event, objectButtons)}
									>
										<span class="thumb" aria-hidden="true">
											<RewardPicture
												artId={reward.artId}
												kind={reward.kind}
												owned
												label={reward.title}
												keys={trophyKeys(reward)}
											/>
										</span>
										<span class="object-title">{reward.title}</span>
										{#if elsewhere}
											<span class="where" id="hideout-where-{index}">
												{m.play_hideout_now_at({ place: placeLabel(elsewhere) })}
											</span>
										{/if}
										{#if here}
											<svg class="check" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
												<path d="M4 12.5L9.5 18L20 6.5" />
											</svg>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}
			<p class="status" role="status">{status}</p>
			{#if saveFailed}
				<p class="warning" role="alert">{m.play_hideout_save_error()}</p>
			{/if}
		</div>
	</div>
</ScreenFrame>

<style>
	.room {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: var(--dd-space-lg);
		inline-size: 100%;
	}

	/* The cabin stays in view while the child goes down the list of what to set down (ADR-046). */
	.scene {
		position: sticky;
		inset-block-start: 0;
		z-index: var(--dd-z-index-sticky);
		flex: 2 1 var(--dd-size-text-zone-min);
		max-inline-size: var(--dd-size-hideout);
		overflow: hidden;
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-base);
		box-shadow: var(--dd-shadow-md);
	}

	.side {
		display: grid;
		flex: 1 1 var(--dd-size-text-zone-side-min);
		gap: var(--dd-space-sm);
		text-align: start;
	}

	.places,
	.chooser {
		display: grid;
		gap: var(--dd-space-sm);
	}

	h2 {
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	.buttons {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-sm);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.places .buttons {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.place,
	.object {
		position: relative;
		display: grid;
		align-content: center;
		gap: var(--dd-space-xs);
		inline-size: 100%;
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-xs) var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
		text-align: start;
		cursor: pointer;
	}

	.place:hover,
	.object:hover {
		background-color: var(--dd-color-surface-sunken);
	}

	.place:focus-visible,
	.object:focus-visible,
	h2:focus-visible {
		outline-style: solid;
		outline-width: var(--dd-border-width-focus);
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-space-xs);
	}

	.place-name,
	.object-title {
		font-weight: var(--dd-font-weight-bold);
	}

	.place-object,
	.where {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
	}

	/* One line under the name of the place: the whole name of the object is in the button's name. */
	.place-object {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.place[data-filled] {
		border-color: var(--dd-color-accent-base);
	}

	.objects {
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-hideout-card), 1fr));
	}

	.object {
		align-content: start;
		justify-items: center;
		padding: var(--dd-space-sm) var(--dd-space-xs);
		font-size: var(--dd-font-size-sm);
		text-align: center;
	}

	.thumb {
		display: block;
		inline-size: var(--dd-size-hideout-thumb);
	}

	.object[aria-pressed='true'] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
		box-shadow: var(--dd-shadow-md);
	}

	.check {
		position: absolute;
		inset-block-start: var(--dd-space-xs);
		inset-inline-end: var(--dd-space-xs);
		inline-size: var(--dd-size-star);
		block-size: var(--dd-size-star);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-accent-base);
	}

	.check path {
		fill: transparent;
		stroke: var(--dd-color-text-on-accent);
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.chooser-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.status {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
		font-weight: var(--dd-font-weight-bold);
	}

	.warning {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
