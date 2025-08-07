<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let isVerifying = true;
  let isSuccess = false;
  let errorMessage = '';
  
  onMount(async () => {
    try {
      const token = $page.url.searchParams.get('token');
      
      if (!token) {
        errorMessage = 'Missing verification token';
        isVerifying = false;
        return;
      }
      
      // Call the verification API
      const response = await fetch(`/api/auth/verify?token=${token}`);
      
      if (response.redirected) {
        // If the API redirects, follow the redirect
        window.location.href = response.url;
        return;
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        errorMessage = result.error || 'Verification failed';
        isVerifying = false;
        return;
      }
      
      isSuccess = true;
      isVerifying = false;
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        goto('/auth/login?verified=true');
      }, 3000);
      
    } catch (error) {
      console.error('Verification error:', error);
      errorMessage = 'An unexpected error occurred';
      isVerifying = false;
    }
  });
</script>

<div class="card">
  {#if isVerifying}
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Verifying your email...</h2>
      <p class="text-gray-600">Please wait while we verify your email address.</p>
    </div>
  {:else if isSuccess}
    <div class="text-center py-8">
      <div class="bg-green-100 text-green-800 p-4 rounded-full inline-flex items-center justify-center h-16 w-16 mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Email verified successfully!</h2>
      <p class="text-gray-600 mb-4">Your email has been verified. You can now sign in to your account.</p>
      <p class="text-sm text-gray-500">Redirecting to login page...</p>
    </div>
  {:else}
    <div class="text-center py-8">
      <div class="bg-red-100 text-red-800 p-4 rounded-full inline-flex items-center justify-center h-16 w-16 mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
      <p class="text-red-600 mb-4">{errorMessage}</p>
      <p class="text-gray-600 mb-6">Please try again or contact support if the problem persists.</p>
      <div class="flex justify-center space-x-4">
        <a href="/auth/login" class="btn-secondary">
          Go to Login
        </a>
        <a href="/" class="btn-primary">
          Back to Home
        </a>
      </div>
    </div>
  {/if}
</div>