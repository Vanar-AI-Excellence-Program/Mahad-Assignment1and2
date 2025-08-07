<script lang="ts">
	import { logoutUser } from '$lib/utils/auth';
	import type { LayoutData } from './$types';

	export let data: LayoutData;
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Navigation -->
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
						Welcome, {data.session?.user?.email || 'User'}
					</span>
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

	<!-- Main content -->
	<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
		<slot />
	</main>
</div> 