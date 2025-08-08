<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let otp = '';
	let isLoading = false;
	let error = '';
	let success = false;

	onMount(() => {
		// Focus on the first input
		const firstInput = document.querySelector('input[type="text"]') as HTMLInputElement;
		if (firstInput) firstInput.focus();
	});

	async function handleSubmit() {
		if (otp.length !== 6) {
			error = 'Please enter a 6-digit verification code';
			return;
		}

		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/verify-otp', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ otp }),
			});

			const result = await response.json();

			console.log("here")
			// if (response.ok) {
			// 	success = true;
			// 	// Redirect to dashboard after a short delay
			// 	setTimeout(() => {
			// 		goto('/dashboard?verified=true');
			// 	}, 2000);
			} else {
				error = result.error || 'Verification failed';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, '').slice(0, 6);
		otp = value;
		
		// Auto-submit when 6 digits are entered
		if (value.length === 6) {
			handleSubmit();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		// Allow backspace, delete, tab, escape, enter
		if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
			// Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
			(event.keyCode === 65 && event.ctrlKey === true) ||
			(event.keyCode === 67 && event.ctrlKey === true) ||
			(event.keyCode === 86 && event.ctrlKey === true) ||
			(event.keyCode === 88 && event.ctrlKey === true) ||
			// Allow home, end, left, right
			(event.keyCode >= 35 && event.keyCode <= 39)) {
			return;
		}
		// Ensure that it is a number and stop the keypress
		if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) &&
			(event.keyCode < 96 || event.keyCode > 105)) {
			event.preventDefault();
		}
	}
</script>

<div class="card">
	<div class="text-center mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Verify Your Email</h2>
		<p class="mt-2 text-sm text-gray-600">
			We've sent a 6-digit verification code to your email address.
		</p>
	</div>

	{#if success}
		<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
			<p class="text-sm text-green-600 flex items-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Email verified successfully! Redirecting to dashboard...
			</p>
		</div>
	{:else}
		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div>
				<label for="otp" class="form-label">Verification Code</label>
				<div class="flex justify-center">
					<input
						id="otp"
						type="text"
						maxlength="6"
						placeholder="000000"
						bind:value={otp}
						on:input={handleInput}
						on:keydown={handleKeydown}
						class="text-center text-2xl font-mono tracking-widest w-48 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
						disabled={isLoading}
					/>
				</div>
				<p class="mt-2 text-xs text-gray-500 text-center">
					Enter the 6-digit code from your email
				</p>
			</div>

			{#if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-3">
					<p class="text-sm text-red-600">{error}</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={isLoading || otp.length !== 6}
				class="btn-primary w-full"
			>
				{#if isLoading}
					Verifying...
				{:else}
					Verify Email
				{/if}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-sm text-gray-600">
				Didn't receive the code?
				<a href="/auth/resend-otp" class="font-medium text-indigo-600 hover:text-indigo-500">
					Resend Code
				</a>
			</p>
			<p class="mt-2 text-sm">
				<a href="/auth/login" class="font-medium text-indigo-600 hover:text-indigo-500">
					Back to Sign In
				</a>
			</p>
		</div>
	{/if}
</div>

<style>
	/* Custom styles for better OTP input experience */
	input[type="text"] {
		letter-spacing: 0.5em;
	}
</style>
