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

    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Important for session cookies
      body: JSON.stringify(data)
    });

    console.log('🔐 [loginUser] Status:', response.status);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    console.log('✅ [loginUser] Login successful, redirecting to dashboard');
    
    // Redirect to dashboard on successful login
    window.location.href = '/reset-password';

    
    return result;
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