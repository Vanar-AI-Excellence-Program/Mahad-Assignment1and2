<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let errorMessage = '';
	let errorDetails = '';

	$: {
		const error = $page.url.searchParams.get('error');
		if (error) {
			switch (error) {
				case 'CredentialsSignin':
					errorMessage = 'Invalid email or password';
					errorDetails = 'Please check your credentials and try again.';
					break;
				case 'EmailNotVerified':
					errorMessage = 'Email not verified';
					errorDetails = 'Please verify your email address before signing in.';
					break;
				case 'Configuration':
					errorMessage = 'Configuration error';
					errorDetails = 'There is a problem with the authentication configuration.';
					break;
				default:
					errorMessage = 'Authentication error';
					errorDetails = 'An unexpected error occurred during authentication.';
			}
		}
	}

	function goToLogin() {
		goto('/auth/login');
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h2 class="mt-6 text-3xl font-extrabold text-gray-900">
				Authentication Error
			</h2>
			<p class="mt-2 text-sm text-gray-600">
				{errorMessage}
			</p>
			<p class="mt-1 text-sm text-gray-500">
				{errorDetails}
			</p>
		</div>

		<div class="mt-8 space-y-6">
			<div class="bg-red-50 border border-red-200 rounded-md p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">
							Error Details
						</h3>
						<div class="mt-2 text-sm text-red-700">
							<p>Error code: {$page.url.searchParams.get('error')}</p>
						</div>
					</div>
				</div>
			</div>

			<div class="flex space-x-4">
				<button
					on:click={goToLogin}
					class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					Back to Login
				</button>
			</div>
		</div>
	</div>
</div>
