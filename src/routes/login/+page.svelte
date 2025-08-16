<script lang="ts">
	import { goto } from '$app/navigation';
	import { loginSchema } from '$lib/validations/auth';
	import type { LoginFormData } from '$lib/validations/auth';
	import { onMount } from 'svelte';

	let formData: LoginFormData = {
		email: '',
		password: ''
	};

	let isLoading = false;
	let error = '';
	let formErrors: Record<string, string> = {};
	let animatedElements: HTMLElement[] = [];

	onMount(() => {
		// Intersection Observer for scroll animations
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate');
				}
			});
		}, { threshold: 0.1 });

		animatedElements.forEach(el => observer.observe(el));

		return () => {
			animatedElements.forEach(el => observer.unobserve(el));
		};
	});

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
	<title>Sign In - AuthFlow</title>
	<meta name="description" content="Sign in to your AuthFlow account to access your dashboard and manage your authentication settings." />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
	<!-- Background decorative elements -->
	<div class="absolute inset-0 bg-grid-pattern opacity-5"></div>
	<div class="absolute top-20 left-10 w-32 h-32 bg-primary-200 rounded-full opacity-20 animate-float"></div>
	<div class="absolute bottom-20 right-10 w-24 h-24 bg-success-200 rounded-full opacity-20 animate-float" style="animation-delay: 1s;"></div>
	
	<div class="max-w-md w-full space-y-8 relative z-10">
		<!-- Header -->
		<div class="text-center animate-fade-in-up" bind:this={animatedElements[0]}>
			<div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
				</svg>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				Welcome back
			</h1>
			<p class="text-gray-600">
				Sign in to your account to continue
			</p>
		</div>

		<!-- Error Alert -->
		{#if error}
			<div class="alert-error animate-fade-in-up" bind:this={animatedElements[1]}>
				<div class="flex items-center">
					<svg class="w-5 h-5 text-error-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span class="font-medium">{error}</span>
				</div>
			</div>
		{/if}

		<!-- Login Form -->
		<div class="card animate-fade-in-up" bind:this={animatedElements[2]} style="animation-delay: 200ms;">
			<div class="card-body">
				<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
					<!-- Email Field -->
					<div class="form-group">
						<label for="email" class="form-label">
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							bind:value={formData.email}
							class="form-input {formErrors.email ? 'error' : ''}"
							placeholder="Enter your email address"
						/>
						{#if formErrors.email}
							<p class="form-error">{formErrors.email}</p>
						{/if}
					</div>

					<!-- Password Field -->
					<div class="form-group">
						<label for="password" class="form-label">
							Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							bind:value={formData.password}
							class="form-input {formErrors.password ? 'error' : ''}"
							placeholder="Enter your password"
						/>
						{#if formErrors.password}
							<p class="form-error">{formErrors.password}</p>
						{/if}
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={isLoading}
						class="btn-primary btn-lg w-full group"
					>
						{#if isLoading}
							<span class="spinner-md mr-3"></span>
							Signing in...
						{:else}
							Sign in
							<svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
							</svg>
						{/if}
					</button>
				</form>

				<!-- Divider -->
				<div class="divider">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-gray-300"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="px-2 bg-white text-gray-500">Or continue with</span>
						</div>
					</div>
				</div>

				<!-- Social Login Buttons -->
				<div class="space-y-3">
					<a href="/auth/oauth/google" class="btn-secondary btn-md w-full group">
						<svg class="w-5 h-5 mr-3" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
							<path d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.3H272v95.1h147.2c-6.4 34.6-25.9 63.9-55.3 83.6v69.4h89.4c52.3-48.2 80.2-119.2 80.2-197.8z" fill="#4285F4"/>
							<path d="M272 544.3c72.9 0 134.2-24.2 178.9-65.8l-89.4-69.4c-24.8 16.7-56.6 26.6-89.5 26.6-68.9 0-127.2-46.5-148-108.9H33.1v68.3C77.7 486.9 167.1 544.3 272 544.3z" fill="#34A853"/>
							<path d="M124 327c-10.8-32.4-10.8-67.8 0-100.2V158.5H33.1c-43.6 86.9-43.6 189.1 0 275.9L124 327z" fill="#FBBC05"/>
							<path d="M272 107.7c37.8-.6 74.1 13.8 101.6 40.2l76.2-76.2C403.8 24.2 340.7-1 272 0 167.1 0 77.7 57.4 33.1 158.5l90.9 68.3C144.8 154.2 203.1 107.7 272 107.7z" fill="#EA4335"/>
						</svg>
						Continue with Google
					</a>
					
					<a href="/auth/oauth/github" class="btn-secondary btn-md w-full group">
						<svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path fill="currentColor" d="M12 .5C5.7.5.9 5.3.9 11.6c0 4.9 3.2 9.1 7.6 10.6.6.1.8-.3.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.6-1.5-1.4-1.9-1.4-1.9-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.9 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.5-.3-5.1-1.3-5.1-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.4 0 0 1-.3 3.3 1.2.9-.2 1.9-.4 2.9-.4s2 .1 2.9.4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.8.2 3.1.1 3.4.8.8 1.2 1.9 1.2 3.2 0 4.6-2.6 5.6-5.1 5.9.4.3.8 1 .8 2v3c0 .3.2.7.8.6 4.4-1.5 7.6-5.7 7.6-10.6C23.1 5.3 18.3.5 12 .5z"/>
						</svg>
						Continue with GitHub
					</a>
				</div>
			</div>
		</div>

		<!-- Sign Up Link -->
		<div class="text-center animate-fade-in-up" bind:this={animatedElements[3]} style="animation-delay: 400ms;">
			<p class="text-gray-600">
				Don't have an account? 
				<a href="/auth/register" class="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200">
					Sign up for free
				</a>
			</p>
		</div>

		<!-- Additional Links -->
		<div class="text-center animate-fade-in-up" bind:this={animatedElements[4]} style="animation-delay: 600ms;">
			<div class="space-y-2">
				<a href="/auth/forgot-password" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 block">
					Forgot your password?
				</a>
				<a href="/" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 block">
					← Back to home
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.bg-grid-pattern {
		background-image: 
			linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
		background-size: 20px 20px;
	}
</style>
