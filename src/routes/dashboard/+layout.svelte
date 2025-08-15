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
				</div>
				
				<div class="flex items-center space-x-4">
					<span class="text-sm text-gray-600">
						Welcome, {data.session?.user?.firstName ? `${data.session.user.firstName} ${data.session.user.lastName}` : data.session?.user?.email}
					</span>
					<a href="/dashboard/profile" class="btn-secondary text-sm">
						Profile
					</a>
					<a href="/dashboard/chatbot" class="btn-secondary text-sm flex items-center space-x-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
						</svg>
						<span>Chatbot</span>
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