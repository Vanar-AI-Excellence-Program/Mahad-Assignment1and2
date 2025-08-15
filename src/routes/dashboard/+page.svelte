<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	export let data: PageData;

	let isSendingReset = false;
	let resetSent = false;
	let resetError = '';

	async function sendPasswordReset() {
		resetError = '';
		resetSent = false;
		isSendingReset = true;
		try {
			const res = await fetch('/api/auth/reset-password/request', {
				method: 'POST'
			});
			const result = await res.json();
			if (!res.ok) {
				resetError = result.error || 'Failed to send password reset email';
				return;
			}

			resetSent = true;
		} catch (err) {
			resetError = 'Network error. Please try again.';
		} finally {
			isSendingReset = false;
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
	</div>

	<div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<!-- User Info Card -->
		<div class="card">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
			<div class="space-y-3">
				<div>
					<span class="text-sm font-medium text-gray-500">Name</span>
					<p class="text-sm text-gray-900">
						{data.session?.user?.firstName && data.session?.user?.lastName 
							? `${data.session.user.firstName} ${data.session.user.lastName}`
							: 'Not set'
						}
					</p>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-500">Email</span>
					<p class="text-sm text-gray-900">{data.session?.user?.email}</p>
				</div>
				{#if data.session?.user?.bio}
					<div>
						<span class="text-sm font-medium text-gray-500">Bio</span>
						<p class="text-sm text-gray-900">{data.session.user.bio}</p>
					</div>
				{/if}
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
				<button class="w-full btn-secondary" on:click={sendPasswordReset} disabled={isSendingReset}>
					{#if isSendingReset}
						Sending reset email...
					{:else}
						Send Password Reset Email
					{/if}
				</button>

				{#if resetSent}
					<p class="text-sm text-green-600">Password reset email sent to {data.session?.user?.email}.</p>
				{/if}
				{#if resetError}
					<p class="text-sm text-red-600">{resetError}</p>
				{/if}

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