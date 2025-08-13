<script lang="ts">
	import { goto } from '$app/navigation';
	import { loginSchema } from '$lib/validations/auth';
	import type { LoginFormData } from '$lib/validations/auth';

	let formData: LoginFormData = {
		email: '',
		password: ''
	};

	let isLoading = false;
	let error = '';
	let formErrors: Record<string, string> = {};

	function clearError() {
		error = '';
		formErrors = {};
	}

	async function handleSubmit() {
		isLoading = true;
		clearError();

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
			error = errorMessage;
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - AuthFlow</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Sign in to your account
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				Enter your credentials to access your dashboard
			</p>
		</div>

		{#if error}
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
				{error}
			</div>
		{/if}

		<form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
			<div class="space-y-4">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">
						Email address
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={formData.email}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm {formErrors.email ? 'border-red-300' : ''}"
						placeholder="Enter your email"
					/>
					{#if formErrors.email}
						<p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
					{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						bind:value={formData.password}
						class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm {formErrors.password ? 'border-red-300' : ''}"
						placeholder="Enter your password"
					/>
					{#if formErrors.password}
						<p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
					{/if}
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={isLoading}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isLoading}
						<span class="absolute left-0 inset-y-0 flex items-center pl-3">
							<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</span>
						Signing in...
					{:else}
						Sign in
					{/if}
				</button>
			</div>

			<div class="text-center">
				<a href="/auth/register" class="text-primary-600 hover:text-primary-700">
					Don't have an account? Sign up
				</a>
			</div>
		</form>
	</div>
</div>
