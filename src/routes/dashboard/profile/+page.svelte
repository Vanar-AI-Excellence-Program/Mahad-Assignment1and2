<script lang="ts">
	import { profileUpdateSchema, type ProfileUpdateData } from '$lib/validations/auth';
	import { onMount } from 'svelte';

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

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
	<div class="max-w-4xl mx-auto">
		<!-- Enhanced Header Section -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-6 shadow-lg">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
				</svg>
			</div>
			<h1 class="text-4xl font-bold text-gray-900 mb-4">Profile Settings</h1>
			<p class="text-lg text-gray-600 max-w-2xl mx-auto">
				Update your personal information and profile details to keep your account current and personalized.
			</p>
		</div>

		<!-- Enhanced Main Content Card -->
		<div class="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
			<!-- Card Header with Gradient -->
			<div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
				<div class="flex items-center space-x-3">
					<div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-semibold text-white">Personal Information</h2>
						<p class="text-blue-100 text-sm">Manage your profile details and preferences</p>
					</div>
				</div>
			</div>

			<!-- Card Body -->
			<div class="p-8">
				{#if isLoadingProfile}
					<div class="py-16 flex flex-col justify-center items-center">
						<div class="relative">
							<div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
							<div class="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" style="animation-delay: -0.5s;"></div>
						</div>
						<span class="mt-6 text-gray-600 text-lg font-medium">Loading your profile...</span>
					</div>
				{:else}
				<form on:submit|preventDefault={handleSubmit} class="space-y-8">
					<!-- Enhanced Form Fields -->
					<div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
						<div class="space-y-3">
							<label for="firstName" class="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
								First Name
							</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
									</svg>
								</div>
								<input
									id="firstName"
									name="firstName"
									type="text"
									required
									bind:value={formData.firstName}
									on:input={() => handleInput('firstName')}
									class="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 hover:border-gray-300 hover:bg-white {formErrors.firstName ? 'border-red-300 focus:ring-red-100 focus:border-red-500' : ''}"
									placeholder="Enter your first name"
								/>
							</div>
							{#if formErrors.firstName}
								<div class="flex items-center space-x-2 text-red-600 text-sm">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
									</svg>
									<span>{formErrors.firstName}</span>
								</div>
							{/if}
						</div>

						<div class="space-y-3">
							<label for="lastName" class="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
								Last Name
							</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
									<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
									</svg>
								</div>
								<input
									id="lastName"
									name="lastName"
									type="text"
									required
									bind:value={formData.lastName}
									on:input={() => handleInput('lastName')}
									class="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 hover:border-gray-300 hover:bg-white {formErrors.lastName ? 'border-red-300 focus:ring-red-100 focus:border-red-500' : ''}"
									placeholder="Enter your last name"
								/>
							</div>
							{#if formErrors.lastName}
								<div class="flex items-center space-x-2 text-red-600 text-sm">
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
									</svg>
									<span>{formErrors.lastName}</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="space-y-3">
						<label for="bio" class="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
							Bio
						</label>
						<div class="relative">
							<div class="absolute top-4 left-4 flex items-start pointer-events-none">
								<svg class="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
								</svg>
							</div>
							<textarea
								id="bio"
								name="bio"
								rows="4"
								bind:value={formData.bio}
								on:input={() => handleInput('bio')}
								class="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 hover:border-gray-300 hover:bg-white resize-none {formErrors.bio ? 'border-red-300 focus:ring-red-100 focus:border-red-500' : ''}"
								placeholder="Tell us about yourself, your interests, or what you're passionate about..."
							></textarea>
						</div>
						{#if formErrors.bio}
							<div class="flex items-center space-x-2 text-red-600 text-sm">
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
								</svg>
								<span>{formErrors.bio}</span>
							</div>
						{/if}
					</div>

					<!-- Enhanced Success/Error Messages -->
					{#if successMessage}
						<div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
							<div class="flex items-center space-x-3">
								<div class="flex-shrink-0">
									<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
									</svg>
								</div>
								<div>
									<p class="text-sm font-medium text-green-800">{successMessage}</p>
								</div>
							</div>
						</div>
					{/if}

					{#if formErrors.general}
						<div class="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4">
							<div class="flex items-center space-x-3">
								<div class="flex-shrink-0">
									<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
									</svg>
								</div>
								<div>
									<p class="text-sm font-medium text-red-800">{formErrors.general}</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- Enhanced Action Buttons -->
					<div class="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-100">
						<a href="/dashboard" class="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-400 transform hover:scale-[1.02] active:scale-[0.98]">
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
							Cancel
						</a>
						<button
							type="submit"
							disabled={isLoading}
							class="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						>
							{#if isLoading}
								<div class="flex items-center">
									<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
									Updating Profile...
								</div>
							{:else}
								<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
								</svg>
								Update Profile
							{/if}
						</button>
					</div>
				</form>
				{/if}
			</div>
		</div>
	</div>
</div>