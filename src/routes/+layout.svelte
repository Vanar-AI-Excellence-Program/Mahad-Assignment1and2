<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>AuthFlow - Secure Authentication</title>
	<meta name="description" content="A secure authentication application built with SvelteKit" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Navigation - Show only on public routes (not dashboard) -->
	{#if !$page.url.pathname.startsWith('/dashboard')}
	<nav class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<a href="/" class="text-xl font-semibold text-gray-900">
						AuthFlow
					</a>
				</div>
				
				<div class="flex items-center space-x-4">
					<a href="/login" class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm">
						Sign in
					</a>
					<a href="/auth/register" class="btn-primary text-sm">
						Sign up
					</a>
				</div>
			</div>
		</div>
	</nav>
	{/if}

	<main>
		<slot />
	</main>
</div>
