<script lang="ts">
	import type { Option } from '$lib/shared/option';

	/**
	 * Visualises units of work as a grid of small squares — a more direct
	 * representation of actual chunks of effort than an abstract progress bar.
	 *
	 * With target = Some(number) (i.e. Daily mode)
	 * ----------
	 * Shows exactly `target` bordered squares.  Each unit done fills one square
	 * from left to right (primary colour).  Units beyond the target overflow as
	 * additional filled squares in the accent colour, so going above goal is
	 * visually distinguishable from meeting it.
	 *
	 * With target = None (i.e. Overall mode)
	 * ------------
	 * Shows one filled primary square per unit done.  There is no expectation
	 * of rendering the full remaining target (which can be hundreds of units),
	 * so only done work is shown.
	 */

	interface Props {
		target: Option<number>;
		done: number;
	}

	let { done, target }: Props = $props();

	type SquareOfWork = 'empty' | 'done' | 'exceeded';

	let squares: SquareOfWork[] = $derived.by(() => {
		if (target.isNone()) {
			return Array(done).fill('done');
		}

		let squares = Array(target.value).fill('empty');
		const doneSquares = Math.min(done, target.value);
		squares.splice(0, doneSquares, ...Array(doneSquares).fill('done'));
		squares = squares.concat(Array(Math.max(0, done - target.value)).fill('exceeded'));

		return squares;
	});
</script>

<div class="flex flex-wrap items-center gap-1" role="img" aria-label="{done} units done">
	{#each squares as square, idx (idx)}
		{#if square === 'empty'}
			<span class="inline-block size-4 rounded-sm border-2 border-primary/30"></span>
		{:else if square === 'done'}
			<span class="inline-block size-4 rounded-sm bg-primary"></span>
		{:else if square === 'exceeded'}
			<span class="inline-block size-4 rounded-sm bg-accent"></span>
		{/if}
	{:else}
		<span class="inline-block size-4 rounded-sm bg-none"></span>
	{/each}
</div>
