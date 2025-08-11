<script lang="ts">
	import type { LayoutData } from './$types';

	export let data: LayoutData;
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
					<a href="/logout" class="btn-secondary text-sm">
						Sign out
					</a>
				</div>
			</div>
		</div>
	</nav>

	<main>
		<slot />
	</main>
</div> 