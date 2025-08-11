<script lang="ts">
	import { loginSchema, type LoginFormData } from '$lib/validations/auth';
	import { error, clearError } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let formData: LoginFormData = {
		email: '',
		password: ''
	};

	let isLoading = false;
	let formErrors: Record<string, string> = {};
	let verificationSuccess = false;
	let passwordResetSuccess = false;

	onMount(() => {
		clearError();
		// Check if user just verified their email
		verificationSuccess = $page.url.searchParams.get('verified') === 'true';
		// Check if user just reset their password
		passwordResetSuccess = $page.url.searchParams.get('reset') === 'true';
		// Check for login errors from URL parameters
		const errorParam = $page.url.searchParams.get('error');
		if (errorParam) {
			error.set(decodeURIComponent(errorParam));
		}
	});

	async function handleSubmit() {
		isLoading = true;
		clearError();
		formErrors = {};

		try {
			// Validate form data
			const validation = loginSchema.safeParse(formData);
			if (!validation.success) {
				formErrors = validation.error.flatten().fieldErrors as Record<string, string>;
				return;
			}

			console.log('🔐 [login] Attempting login for:', validation.data.email);
			
			// Submit to custom login endpoint
			const response = await fetch('/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(validation.data),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Login failed');
			}

			console.log('✅ [login] Login successful, redirecting to dashboard');
			
			// Redirect to dashboard on success
			await goto('/dashboard');
			
		} catch (err) {
			console.error('🔐 [login] Login error:', err);
			const errorMessage = err instanceof Error ? err.message : 'Login failed';
			error.set(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	function handleInput(field: keyof LoginFormData) {
		if (formErrors[field]) {
			delete formErrors[field];
		}
		clearError();
	}
</script>

<div class="card">
	<form on:submit|preventDefault={handleSubmit} class="space-y-6">
		<div>
			<label for="email" class="form-label">Email address</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				bind:value={formData.email}
				on:input={() => handleInput('email')}
				class="input-field {formErrors.email ? 'border-red-500' : ''}"
				placeholder="Enter your email"
			/>
			{#if formErrors.email}
				<p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
			{/if}
		</div>

		<div>
			<label for="password" class="form-label">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={formData.password}
				on:input={() => handleInput('password')}
				class="input-field {formErrors.password ? 'border-red-500' : ''}"
				placeholder="Enter your password"
			/>
			{#if formErrors.password}
				<p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
			{/if}
		</div>

		{#if verificationSuccess}
			<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
				<p class="text-sm text-green-600 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Your email has been verified successfully! You can now sign in.
				</p>
			</div>
		{/if}
		
		{#if passwordResetSuccess}
			<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
				<p class="text-sm text-green-600 flex items-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Your password has been reset successfully! You can now sign in with your new password.
				</p>
			</div>
		{/if}
		
		{#if $error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-3">
				<p class="text-sm text-red-600">{$error}</p>
			</div>
		{/if}

		<button
			type="submit"
			disabled={isLoading}
			class="btn-primary w-full {isLoading ? 'opacity-50 cursor-not-allowed' : ''}"
		>
			{#if isLoading}
				<div class="flex items-center justify-center">
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
					Signing in...
				</div>
			{:else}
				Sign in
			{/if}
		</button>

		<div class="text-center space-y-2">
			<a href="/auth/forgot-password" class="text-sm text-primary-600 hover:text-primary-500">
				Forgot your password?
			</a>
			<div>
				<span class="text-sm text-gray-600">Don't have an account?</span>
				<a href="/auth/register" class="text-sm text-primary-600 hover:text-primary-500 ml-1">
					Sign up
				</a>
			</div>
		</div>
	</form>
</div>