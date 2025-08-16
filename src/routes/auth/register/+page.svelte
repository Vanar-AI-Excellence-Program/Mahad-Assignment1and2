<script lang="ts">
	import { registerSchema, type RegisterFormData } from '$lib/validations/auth';
	import { registerUser } from '$lib/utils/auth';
	import { error, clearError } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let formData: RegisterFormData = {
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
		bio: ''
	};

	let isLoading = false;
	let formErrors: Record<string, string> = {};

	onMount(() => {
		clearError();
	});

	async function handleSubmit() {
		isLoading = true;
		clearError();
		formErrors = {};

		try {
			// Validate form data
			const validation = registerSchema.safeParse(formData);
			if (!validation.success) {
				formErrors = validation.error.flatten().fieldErrors as Record<string, string>;
				return;
			}

			// Attempt registration
			const result = await registerUser(validation.data);
			
			// Redirect to verification page with email
			await goto(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}`);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Registration failed';
			error.set(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	function handleInput(field: keyof RegisterFormData) {
		if (formErrors[field]) {
			delete formErrors[field];
		}
		clearError();
	}
</script>

<svelte:head>
	<title>Create Account - AuthFlow</title>
	<meta name="description" content="Join AuthFlow today and experience secure, modern authentication for your applications." />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
	<!-- Background decorative elements -->
	<div class="absolute inset-0 bg-grid-pattern opacity-5"></div>
	<div class="absolute top-20 left-10 w-32 h-32 bg-primary-200 rounded-full opacity-20 animate-float"></div>
	<div class="absolute bottom-20 right-10 w-24 h-24 bg-success-200 rounded-full opacity-20 animate-float" style="animation-delay: 1s;"></div>
	
	<div class="max-w-md w-full space-y-8 relative z-10">
		<!-- Header -->
		<div class="text-center animate-fade-in-up">
			<div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
				</svg>
			</div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				Create your account
			</h1>
			<p class="text-gray-600">
				Join thousands of developers using AuthFlow
			</p>
		</div>

		<!-- Error Alert -->
		{#if $error}
			<div class="alert-error animate-fade-in-up">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-error-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
					<span class="font-medium">{$error}</span>
				</div>
			</div>
		{/if}

		<!-- Registration Form -->
		<div class="card animate-fade-in-up" style="animation-delay: 200ms;">
			<div class="card-body">
				<form on:submit|preventDefault={handleSubmit} class="space-y-6">
		<div class="form-group">
			<label for="email" class="form-label">Email address</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				bind:value={formData.email}
				on:input={() => handleInput('email')}
				class="form-input {formErrors.email ? 'error' : ''}"
				placeholder="Enter your email address"
			/>
			{#if formErrors.email}
				<p class="form-error">{formErrors.email}</p>
			{/if}
		</div>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<div class="form-group">
				<label for="firstName" class="form-label">First Name</label>
				<input
					id="firstName"
					name="firstName"
					type="text"
					autocomplete="given-name"
					required
					bind:value={formData.firstName}
					on:input={() => handleInput('firstName')}
					class="form-input {formErrors.firstName ? 'error' : ''}"
					placeholder="Enter your first name"
				/>
				{#if formErrors.firstName}
					<p class="form-error">{formErrors.firstName}</p>
				{/if}
			</div>

			<div class="form-group">
				<label for="lastName" class="form-label">Last Name</label>
				<input
					id="lastName"
					name="lastName"
					type="text"
					autocomplete="family-name"
					required
					bind:value={formData.lastName}
					on:input={() => handleInput('lastName')}
					class="form-input {formErrors.lastName ? 'error' : ''}"
					placeholder="Enter your last name"
				/>
				{#if formErrors.lastName}
					<p class="form-error">{formErrors.lastName}</p>
				{/if}
			</div>
		</div>

		<div class="form-group">
			<label for="bio" class="form-label">Bio (Optional)</label>
			<textarea
				id="bio"
				name="bio"
				rows="3"
				bind:value={formData.bio}
				on:input={() => handleInput('bio')}
				class="form-textarea {formErrors.bio ? 'error' : ''}"
				placeholder="Tell us about yourself..."
			></textarea>
			{#if formErrors.bio}
				<p class="form-error">{formErrors.bio}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="password" class="form-label">Password</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				required
				bind:value={formData.password}
				on:input={() => handleInput('password')}
				class="form-input {formErrors.password ? 'error' : ''}"
				placeholder="Create a password"
			/>
			<p class="form-help">
				Password must be at least 8 characters with uppercase, lowercase, and number
			</p>
			{#if formErrors.password}
				<p class="form-error">{formErrors.password}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="confirmPassword" class="form-label">Confirm Password</label>
			<input
				id="confirmPassword"
				name="confirmPassword"
				type="password"
				autocomplete="new-password"
				required
				bind:value={formData.confirmPassword}
				on:input={() => handleInput('confirmPassword')}
				class="form-input {formErrors.confirmPassword ? 'error' : ''}"
				placeholder="Confirm your password"
			/>
			{#if formErrors.confirmPassword}
				<p class="form-error">{formErrors.confirmPassword}</p>
			{/if}
		</div>

		<button
			type="submit"
			disabled={isLoading}
			class="btn-primary btn-lg w-full group"
		>
			{#if isLoading}
				<span class="spinner-md mr-3"></span>
				Creating account...
			{:else}
				Create account
				<svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
				</svg>
			{/if}
		</button>
	</form>
			</div>
		</div>

		<!-- Sign In Link -->
		<div class="text-center animate-fade-in-up" style="animation-delay: 400ms;">
			<p class="text-gray-600">
				Already have an account? 
				<a href="/auth/login" class="text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200">
					Sign in here
				</a>
			</p>
		</div>

		<!-- Back to Home -->
		<div class="text-center animate-fade-in-up" style="animation-delay: 600ms;">
			<a href="/" class="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200">
				← Back to home
			</a>
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