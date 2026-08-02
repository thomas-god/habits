<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js', {
				type: import.meta.env.DEV ? 'module' : 'classic'
			});
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-base-200" data-theme="nord">
	<nav class="navbar bg-base-100 px-4 shadow-sm">
		<div class="flex-1">
			<a href="/" class="text-xl font-bold tracking-tight">🌱 Habits</a>
		</div>
		<div class="flex-none">
			<a href="/habits/new" class="btn btn-primary btn-sm">+ New habit</a>
		</div>
	</nav>

	<main class="mx-auto max-w-3xl px-4 py-8">
		{@render children()}
	</main>
</div>
