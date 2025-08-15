<script lang="ts">
	import { goto } from '$app/navigation';

	let email = '';
	let isLoading = false;
	let error = '';
	let success = false;

	async function handleSubmit() {
		if (!email) {
			error = 'Please enter your email address';
			return;
		}

		isLoading = true;
		error = '';
		success = false;

		try {
			const response = await fetch('/api/auth/resend-otp', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email }),
			});

			const result = await response.json();

			if (response.ok) {
				success = true;
				// Redirect to verification page after a short delay
				setTimeout(() => {
					goto(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
				}, 2000);
			} else {
				error = result.error || 'Failed to resend verification code';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="card">
	<div class="text-center mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Resend Verification Code</h2>
		<p class="mt-2 text-sm text-gray-600">
			Enter your email address to receive a new verification code.
		</p>
	</div>

	{#if success}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
			<p class="text-sm text-green-600 flex items-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Verification code sent! Redirecting to verification page...
			</p>
		</div>
	{:else}
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div>
				<label for="email" class="form-label">Email Address</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					bind:value={email}
					class="input-field"
					placeholder="Enter your email address"
					disabled={isLoading}
				/>
			</div>

			{#if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-3">
					<p class="text-sm text-red-600">{error}</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={isLoading || !email}
				class="btn-primary w-full"
			>
				{#if isLoading}
					Sending...
				{:else}
					Resend Code
				{/if}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-sm">
				<a href="/auth/login" class="font-medium text-indigo-600 hover:text-indigo-500">
					Back to Sign In
				</a>
			</p>
		</div>
	{/if}
</div>



