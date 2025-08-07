<script lang="ts">
	import type { PageData } from './$types';
	import { profileUpdateSchema, type ProfileUpdateData } from '$lib/validations/auth';
	import { onMount } from 'svelte';

	export let data: PageData;

	let formData: ProfileUpdateData = {
		firstName: '',
		lastName: '',
		bio: ''
	};

	let isLoading = false;
	let isLoadingProfile = true;
	let formErrors: Record<string, string> = {};
	let successMessage = '';

	onMount(async () => {
		await fetchProfileData();
	});

	async function fetchProfileData() {
		try {
			isLoadingProfile = true;
			const response = await fetch('/api/profile');
			
			if (!response.ok) {
				throw new Error('Failed to fetch profile data');
			}
			
			const profileData = await response.json();
			
			formData = {
				firstName: profileData.profile.firstName || '',
				lastName: profileData.profile.lastName || '',
				bio: profileData.profile.bio || ''
			};
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
			formErrors.general = errorMessage;
		} finally {
			isLoadingProfile = false;
		}
	}

	async function handleSubmit() {
		isLoading = true;
		formErrors = {};
		successMessage = '';

		try {
			// Validate form data
			const validation = profileUpdateSchema.safeParse(formData);
			if (!validation.success) {
				formErrors = validation.error.flatten().fieldErrors as Record<string, string>;
				isLoading = false;
				return;
			}

			// Send profile update request
			const response = await fetch('/api/profile/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(validation.data)
			});
			
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Profile update failed');
			}
			
			successMessage = 'Profile updated successfully!';
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Profile update failed';
			formErrors.general = errorMessage;
		} finally {
			isLoading = false;
		}
	}

	function handleInput(field: keyof ProfileUpdateData) {
		if (formErrors[field]) {
			delete formErrors[field];
		}
		if (successMessage) {
			successMessage = '';
		}
	}
</script>

<div class="px-4 sm:px-6 lg:px-8">
	<div class="sm:flex sm:items-center">
		<div class="sm:flex-auto">
			<h1 class="text-2xl font-semibold text-gray-900">Profile Settings</h1>
			<p class="mt-2 text-sm text-gray-700">
				Update your personal information and profile details.
			</p>
		</div>
	</div>

	<div class="mt-8 max-w-2xl">
		<div class="card">
			{#if isLoadingProfile}
				<div class="py-12 flex justify-center items-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
					<span class="ml-3 text-gray-600">Loading profile data...</span>
				</div>
			{:else}
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<div>
						<label for="firstName" class="form-label">First Name</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							required
							bind:value={formData.firstName}
							on:input={() => handleInput('firstName')}
							class="input-field {formErrors.firstName ? 'border-red-500' : ''}"
							placeholder="Enter your first name"
						/>
						{#if formErrors.firstName}
							<p class="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
						{/if}
					</div>

					<div>
						<label for="lastName" class="form-label">Last Name</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							required
							bind:value={formData.lastName}
							on:input={() => handleInput('lastName')}
							class="input-field {formErrors.lastName ? 'border-red-500' : ''}"
							placeholder="Enter your last name"
						/>
						{#if formErrors.lastName}
							<p class="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
						{/if}
					</div>
				</div>

				<div>
					<label for="bio" class="form-label">Bio</label>
					<textarea
						id="bio"
						name="bio"
						rows="4"
						bind:value={formData.bio}
						on:input={() => handleInput('bio')}
						class="input-field {formErrors.bio ? 'border-red-500' : ''}"
						placeholder="Tell us about yourself..."
					></textarea>
					{#if formErrors.bio}
						<p class="mt-1 text-sm text-red-600">{formErrors.bio}</p>
					{/if}
				</div>

				{#if successMessage}
					<div class="bg-green-50 border border-green-200 rounded-lg p-3">
						<p class="text-sm text-green-600">{successMessage}</p>
					</div>
				{/if}

				{#if formErrors.general}
					<div class="bg-red-50 border border-red-200 rounded-lg p-3">
						<p class="text-sm text-red-600">{formErrors.general}</p>
					</div>
				{/if}

				<div class="flex justify-end space-x-3">
					<a href="/dashboard" class="btn-secondary">
						Cancel
					</a>
					<button
						type="submit"
						disabled={isLoading}
						class="btn-primary {isLoading ? 'opacity-50 cursor-not-allowed' : ''}"
					>
						{#if isLoading}
							<div class="flex items-center">
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
								Updating...
							</div>
						{:else}
							Update Profile
						{/if}
					</button>
				</div>
			</form>
			{/if}
		</div>
	</div>
</div>