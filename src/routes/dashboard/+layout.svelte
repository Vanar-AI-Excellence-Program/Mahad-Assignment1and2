<script lang="ts">
	import type { LayoutData } from './$types';
	import { goto } from '$app/navigation';

	export let data: LayoutData;

	async function handleLogout() {
		try {
			const response = await fetch('/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				console.log('✅ Logout successful');
				await goto('/');
			} else {
				console.error('❌ Logout failed');
			}
		} catch (error) {
			console.error('❌ Logout error:', error);
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Dashboard Navigation -->
	<nav class="bg-white shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex items-center">
					<a href="/dashboard" class="text-xl font-semibold text-gray-900">
						AuthFlow Dashboard
					</a>
					{#if (data.session?.user as any)?.role === 'admin'}
						<a href="/admin" class="ml-6 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded">
							Admin
						</a>
					{/if}
				</div>
				
				<div class="flex items-center space-x-4">
					<span class="text-sm text-gray-600">
						Welcome, {data.session?.user?.firstName ? `${data.session.user.firstName} ${data.session.user.lastName}` : data.session?.user?.email}
					</span>
					<a href="/dashboard/profile" class="btn-secondary text-sm">
						Profile
					</a>
					<button
						on:click={handleLogout}
						class="btn-secondary text-sm"
					>
						Sign out
					</button>
				</div>
			</div>
		</div>
	</nav>

	<main>
		<slot />
	</main>
</div> 