<script lang="ts">
	import { registerSchema, type RegisterFormData } from '$lib/validations/auth';
	import { registerUser } from '$lib/utils/auth';
	import { error, clearError } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let formData: RegisterFormData = {
		email: '',
		password: '',
		confirmPassword: ''
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
			await registerUser(validation.data);
			
			// Show success message and redirect to login
			alert('Registration successful! Please sign in.');
			await goto('/auth/login');
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
				autocomplete="new-password"
				required
				bind:value={formData.password}
				on:input={() => handleInput('password')}
				class="input-field {formErrors.password ? 'border-red-500' : ''}"
				placeholder="Create a password"
			/>
			<p class="mt-1 text-xs text-gray-500">
				Password must be at least 8 characters with uppercase, lowercase, and number
			</p>
			{#if formErrors.password}
				<p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
			{/if}
		</div>

		<div>
			<label for="confirmPassword" class="form-label">Confirm Password</label>
			<input
				id="confirmPassword"
				name="confirmPassword"
				type="password"
				autocomplete="new-password"
				required
				bind:value={formData.confirmPassword}
				on:input={() => handleInput('confirmPassword')}
				class="input-field {formErrors.confirmPassword ? 'border-red-500' : ''}"
				placeholder="Confirm your password"
			/>
			{#if formErrors.confirmPassword}
				<p class="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
			{/if}
		</div>

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
					Creating account...
				</div>
			{:else}
				Create account
			{/if}
		</button>

		<div class="text-center">
			<span class="text-sm text-gray-600">Already have an account?</span>
			<a href="/auth/login" class="text-sm text-primary-600 hover:text-primary-500 ml-1">
				Sign in
			</a>
		</div>
	</form>
</div> 