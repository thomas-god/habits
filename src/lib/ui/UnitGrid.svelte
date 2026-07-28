<script lang="ts">
	/**
	 * Visualises units of work as a grid of small squares — a more direct
	 * representation of actual chunks of effort than an abstract progress bar.
	 *
	 * Daily mode
	 * ----------
	 * Shows exactly `target` bordered squares.  Each unit done fills one square
	 * from left to right (primary colour).  Units beyond the target overflow as
	 * additional filled squares in the accent colour, so going above goal is
	 * visually distinguishable from meeting it.
	 *
	 * Overall mode
	 * ------------
	 * Shows one filled primary square per unit done.  There is no expectation
	 * of rendering the full remaining target (which can be hundreds of units),
	 * so only done work is shown.  Beyond MAX_VISIBLE a "+N more" label is
	 * appended so the count stays honest.
	 */

	const MAX_VISIBLE = 200;

	interface Props {
		kind: 'daily' | 'overall';
		done: number;
		/** Required for daily, ignored for overall. */
		target?: number;
	}

	let { kind, done, target = 0 }: Props = $props();

	// ── daily ──────────────────────────────────────────────────────────────────
	// Each index maps to a square; we render max(done, target) boxes.
	const dailyCount = $derived(Math.max(done, target));

	type SquareKind = 'empty' | 'done' | 'over';
	function dailyKind(i: number): SquareKind {
		if (i >= target) return 'over'; // overflow box
		if (i < done) return 'done'; // met-goal box
		return 'empty'; // pending box
	}

	// ── overall ────────────────────────────────────────────────────────────────
	const overallVisible = $derived(Math.min(done, MAX_VISIBLE));
	const overallOverflow = $derived(done > MAX_VISIBLE ? done - MAX_VISIBLE : 0);
</script>

<div class="flex flex-wrap items-center gap-1" role="img" aria-label="{done} units done">
	{#if kind === 'daily'}
		{#each { length: dailyCount } as _, i (i)}
			{@const sq = dailyKind(i)}
			<span
				class="inline-block size-4 rounded-sm {sq === 'empty'
					? 'border-2 border-primary/30'
					: sq === 'done'
						? 'bg-primary'
						: 'bg-accent'}"
			></span>
		{/each}
	{:else}
		{#each { length: overallVisible } as _, i (i)}
			<span
				class="inline-block size-4 rounded-sm bg-primary"
				style="opacity: {0.5 + (0.5 * ((i % 10) + 1)) / 10}"
			></span>
		{/each}
		{#if overallOverflow > 0}
			<span class="ml-1 text-xs text-base-content/50">+{overallOverflow} more</span>
		{/if}
	{/if}
</div>
