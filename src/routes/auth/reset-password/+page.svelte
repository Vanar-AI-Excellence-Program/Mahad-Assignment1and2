<script lang="ts">
  import { z } from 'zod';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { error, clearError } from '$lib/stores/auth';
  
  const resetPasswordSchema = z.object({
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  });
  
  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
  
  let formData: ResetPasswordFormData = {
    password: '',
    confirmPassword: ''
  };
  
  let token = '';
  let isLoading = false;
  let isSuccess = false;
  let isTokenValid = true;
  let formErrors: Record<string, string> = {};
  
  onMount(async () => {
    clearError();
    
    // Get token from URL
    token = $page.url.searchParams.get('token') || '';
    
    if (!token) {
      isTokenValid = false;
      error.set('Missing reset token');
      return;
    }
    
    // Verify token validity without consuming it
    try {
      const response = await fetch(`/api/auth/reset-password/verify?token=${token}`);
      const result = await response.json();
      
      if (!response.ok) {
        isTokenValid = false;
        error.set(result.error || 'Invalid or expired reset token');
      }
    } catch (err) {
      isTokenValid = false;
      error.set('Failed to verify reset token');
    }
  });
  
  async function handleSubmit() {
    isLoading = true;
    clearError();
    formErrors = {};
    
    try {
      // Validate form data
      const validation = resetPasswordSchema.safeParse(formData);
      if (!validation.success) {
        formErrors = validation.error.flatten().fieldErrors as Record<string, string>;
        isLoading = false;
        return;
      }
      
      // Submit password reset
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password: formData.password
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        error.set(result.error || 'Failed to reset password');
        isLoading = false;
        return;
      }
      
      // Show success message
      isSuccess = true;
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        goto('/auth/login?reset=true');
      }, 3000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      error.set(errorMessage);
    } finally {
      isLoading = false;
    }
  }
  
  function handleInput(field: keyof ResetPasswordFormData) {
    if (formErrors[field]) {
      delete formErrors[field];
    }
    clearError();
  }
</script>

<div class="card">
  {#if isSuccess}
    <div class="text-center py-8">
      <div class="bg-green-100 text-green-800 p-4 rounded-full inline-flex items-center justify-center h-16 w-16 mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Password reset successful!</h2>
      <p class="text-gray-600 mb-4">Your password has been reset successfully.</p>
      <p class="text-sm text-gray-500">Redirecting to login page...</p>
    </div>
  {:else if !isTokenValid}
    <div class="text-center py-8">
      <div class="bg-red-100 text-red-800 p-4 rounded-full inline-flex items-center justify-center h-16 w-16 mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Invalid reset link</h2>
      <p class="text-red-600 mb-4">{$error}</p>
      <p class="text-gray-600 mb-6">The password reset link is invalid or has expired.</p>
      <div class="flex justify-center space-x-4">
        <a href="/auth/forgot-password" class="btn-primary">
          Request new reset link
        </a>
        <a href="/auth/login" class="btn-secondary">
          Back to Login
        </a>
      </div>
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <div>
        <label for="password" class="form-label">New Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="new-password"
          required
          bind:value={formData.password}
          on:input={() => handleInput('password')}
          class="input-field {formErrors.password ? 'border-red-500' : ''}"
          placeholder="Enter new password"
        />
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
          placeholder="Confirm new password"
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
            Resetting...
          </div>
        {:else}
          Reset Password
        {/if}
      </button>
      
      <div class="text-center">
        <a href="/auth/login" class="text-sm text-primary-600 hover:text-primary-500">
          Back to Login
        </a>
      </div>
    </form>
  {/if}
</div>