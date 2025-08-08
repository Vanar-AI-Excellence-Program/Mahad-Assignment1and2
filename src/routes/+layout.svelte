<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { logoutUser } from '$lib/utils/auth';
	import type { LayoutData } from './$types';

	export let data: LayoutData;
</script>

<svelte:head>
	<title>AuthFlow - Secure Authentication</title>
	<meta name="description" content="A secure authentication application built with SvelteKit" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Navigation -->
	{#if data.session}
		<nav class="bg-white shadow-sm border-b">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between h-16">
					<div class="flex items-center">
						<a href="/dashboard" class="text-xl font-semibold text-gray-900">
							AuthFlow
						</a>
					</div>
					
					<div class="flex items-center space-x-4">
						<span class="text-sm text-gray-600">
							Welcome, {data.session.user?.email}
						</span>
						<a href="/dashboard" class="btn-secondary text-sm">
							Dashboard
						</a>
						<button
							on:click={logoutUser}
							class="btn-secondary text-sm"
						>
							Sign out
						</button>
					</div>
				</div>
			</div>
		</nav>
	{:else}
		<nav class="bg-white shadow-sm border-b">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between h-16">
					<div class="flex items-center">
						<a href="/" class="text-xl font-semibold text-gray-900">
							AuthFlow
						</a>
					</div>
					
					<div class="flex items-center space-x-4">
						<a href="/auth/login" class="btn-secondary text-sm">
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
