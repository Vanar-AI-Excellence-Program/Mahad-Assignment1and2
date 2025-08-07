<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	onMount(() => {
		// Initialize any global functionality here
	});
</script>

<svelte:head>
	<title>AuthFlow - Secure Authentication</title>
	<meta name="description" content="A secure authentication application built with SvelteKit" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<main>
		<slot />
	</main>
</div>
