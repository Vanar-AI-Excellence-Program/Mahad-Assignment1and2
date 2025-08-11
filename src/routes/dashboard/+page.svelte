<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	export let data: PageData;

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

<div class="px-4 sm:px-6 lg:px-8">
	<div class="sm:flex sm:items-center sm:justify-between">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1>
			<p class="mt-2 text-sm text-gray-700">
				Welcome to your secure dashboard. Here you can manage your account and profile.
			</p>
		</div>
		<div class="mt-4 sm:mt-0">
			<button 
				on:click={handleLogout}
				class="btn-secondary"
			>
				Sign Out
			</button>
		</div>
	</div>

	<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<!-- User Info Card -->
		<div class="card">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
			<div class="space-y-3">
				<div>
					<span class="text-sm font-medium text-gray-500">Email</span>
					<p class="text-sm text-gray-900">{data.session?.user?.email}</p>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-500">Email Verified</span>
					<p class="text-sm text-gray-900">
						{(data.session?.user as any)?.emailVerified ? '✅ Verified' : '❌ Not verified'}
					</p>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-500">Account ID</span>
					<p class="text-sm text-gray-900 font-mono">{data.session?.user?.id}</p>
				</div>
			</div>
		</div>

		<!-- Quick Actions Card -->
		<div class="card">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
			<div class="space-y-3">
				<a href="/dashboard/profile" class="block w-full text-left btn-secondary">
					Edit Profile
				</a>
				<button class="w-full btn-secondary">
					Change Password
				</button>
			</div>
		</div>

		<!-- Security Status Card -->
		<div class="card">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Security Status</h3>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Email Verification</span>
					<span class="text-sm font-medium text-green-600">✓ Secure</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Password Strength</span>
					<span class="text-sm font-medium text-green-600">✓ Strong</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Session Status</span>
					<span class="text-sm font-medium text-green-600">✓ Active</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Activity -->
	<div class="mt-8">
		<div class="card">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
			<div class="space-y-3">
				<div class="flex items-center justify-between py-2 border-b border-gray-100">
					<div>
						<p class="text-sm font-medium text-gray-900">Successfully signed in</p>
						<p class="text-xs text-gray-500">Just now</p>
					</div>
					<span class="text-xs text-green-600">✓</span>
				</div>
				<div class="flex items-center justify-between py-2 border-b border-gray-100">
					<div>
						<p class="text-sm font-medium text-gray-900">Account created</p>
						<p class="text-xs text-gray-500">Today</p>
					</div>
					<span class="text-xs text-blue-600">📝</span>
				</div>
			</div>
		</div>
	</div>
</div> 