import type { RegisterFormData, LoginFormData } from '$lib/validations/auth';

export async function registerUser(data: RegisterFormData) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    return result;
  } catch (error) {
    throw error;
  }
}

export async function loginUser(data: LoginFormData) {
  try {
    console.log('🔐 [loginUser] Starting login process for:', data.email);

    // Create a form and submit it to trigger Auth.js authentication
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/auth/signin/credentials';
    form.style.display = 'none';

    // // Add form fields
    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'email';
    emailInput.value = data.email;
    form.appendChild(emailInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'password';
    passwordInput.value = data.password;
    form.appendChild(passwordInput);

    const callbackInput = document.createElement('input');
    callbackInput.type = 'hidden';
    callbackInput.name = 'callbackUrl';
    callbackInput.value = '/dashboard';
    form.appendChild(callbackInput);

    // // Add form to document and submit
    // document.body.appendChild(form);
    // form.submit();

  } catch (error) {
    console.error('🔐 [loginUser] Login error:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    console.log('🚪 [logoutUser] Starting logout process');
    
    // Use Auth.js signout endpoint
    const response = await fetch('/auth/signout', {
      method: 'POST',
      redirect: 'manual', // Handle redirects manually
    });

    console.log('🚪 [logoutUser] Response status:', response.status);

    if (response.status === 302 || response.redirected) {
      const redirectUrl = response.headers.get('location') || '/';
      console.log('🚪 [logoutUser] Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
      return;
    }

    // If no redirect, go to home page
    console.log('🚪 [logoutUser] No redirect, going to home page');
    window.location.href = '/';
  } catch (error) {
    console.error('🚪 [logoutUser] Logout error:', error);
    window.location.href = '/';
  }
} 