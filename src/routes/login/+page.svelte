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

			<div class="mt-4 grid grid-cols-1 gap-3">
				<a href="/auth/oauth/google" class="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
					<svg class="h-5 w-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg"><path d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.3H272v95.1h147.2c-6.4 34.6-25.9 63.9-55.3 83.6v69.4h89.4c52.3-48.2 80.2-119.2 80.2-197.8z" fill="#4285F4"/><path d="M272 544.3c72.9 0 134.2-24.2 178.9-65.8l-89.4-69.4c-24.8 16.7-56.6 26.6-89.5 26.6-68.9 0-127.2-46.5-148-108.9H33.1v68.3C77.7 486.9 167.1 544.3 272 544.3z" fill="#34A853"/><path d="M124 327c-10.8-32.4-10.8-67.8 0-100.2V158.5H33.1c-43.6 86.9-43.6 189.1 0 275.9L124 327z" fill="#FBBC05"/><path d="M272 107.7c37.8-.6 74.1 13.8 101.6 40.2l76.2-76.2C403.8 24.2 340.7-1 272 0 167.1 0 77.7 57.4 33.1 158.5l90.9 68.3C144.8 154.2 203.1 107.7 272 107.7z" fill="#EA4335"/></svg>
					Continue with Google
				</a>
				<a href="/auth/oauth/github" class="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
					<svg class="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 .5C5.7.5.9 5.3.9 11.6c0 4.9 3.2 9.1 7.6 10.6.6.1.8-.3.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.6-1.5-1.4-1.9-1.4-1.9-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.9 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.5-.3-5.1-1.3-5.1-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.4 0 0 1-.3 3.3 1.2.9-.2 1.9-.4 2.9-.4s2 .1 2.9.4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.8.2 3.1.1 3.4.8.8 1.2 1.9 1.2 3.2 0 4.6-2.6 5.6-5.1 5.9.4.3.8 1 .8 2v3c0 .3.2.7.8.6 4.4-1.5 7.6-5.7 7.6-10.6C23.1 5.3 18.3.5 12 .5z"/></svg>
					Continue with GitHub
				</a>
			</div>
		</form>
	</div>
</div>
