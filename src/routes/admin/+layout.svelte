<script lang="ts">
	import { goto } from '$app/navigation';

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
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      <a href="/dashboard" class="text-sm text-indigo-600">← Back to Dashboard</a>
      <h1 class="text-lg font-semibold">Admin Dashboard</h1>
      <button
        on:click={handleLogout}
        class="text-sm text-gray-600 hover:text-gray-900"
      >
        Sign out
      </button>
    </div>
  </nav>
  <main>
    <slot />
  </main>
</div>


