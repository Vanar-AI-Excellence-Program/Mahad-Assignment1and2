<script lang="ts">
  import { z } from 'zod';
  import { error, clearError } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  
  const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address')
  });
  
  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
  
  let formData: ForgotPasswordFormData = {
    email: ''
  };
  
  let isLoading = false;
  let isSuccess = false;
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
      const validation = forgotPasswordSchema.safeParse(formData);
      if (!validation.success) {
        formErrors = validation.error.flatten().fieldErrors as Record<string, string>;
        isLoading = false;
        return;
      }
      
      // Send password reset request
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validation.data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        error.set(result.error || 'Failed to send password reset email');
        isLoading = false;
        return;
      }
      
      // Show success message
      isSuccess = true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
      error.set(errorMessage);
    } finally {
      isLoading = false;
    }
  }
  
  function handleInput(field: keyof ForgotPasswordFormData) {
    if (formErrors[field]) {
      delete formErrors[field];
    }
    clearError();
  }
</script>

<div class="form-card">
  {#if isSuccess}
    <div class="card-body text-center py-8">
      <div class="bg-green-100 text-green-800 p-4 rounded-full inline-flex items-center justify-center h-16 w-16 mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
      <p class="text-gray-600 mb-4">
        If an account exists for {formData.email}, we've sent password reset instructions to this email address.
      </p>
      <p class="text-sm text-gray-500 mb-6">Please check your inbox and spam folder.</p>
      <div class="flex justify-center">
        <a href="/auth/login" class="btn-primary">
          Back to Login
        </a>
      </div>
    </div>
  {:else}
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
            placeholder="Enter your email"
          />
          {#if formErrors.email}
            <p class="form-error">{formErrors.email}</p>
          {/if}
        </div>
        
        {#if $error}
          <div class="alert-error">
            <p class="text-sm">{$error}</p>
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
              Sending...
            </div>
          {:else}
            Reset Password
          {/if}
        </button>
        
        <div class="text-center space-y-2">
          <a href="/auth/login" class="text-sm text-primary-600 hover:text-primary-500">
            Back to Login
          </a>
          <div>
            <a href="/" class="text-sm text-primary-600 hover:text-primary-500 flex items-center justify-center">
              ← Back to home
            </a>
          </div>
        </div>
      </form>
    </div>
  {/if}
</div>