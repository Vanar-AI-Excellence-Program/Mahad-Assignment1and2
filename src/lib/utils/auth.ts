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
    // Use Auth.js built-in signin endpoint
    const response = await fetch('/auth/signin/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: data.email,
        password: data.password,
        callbackUrl: '/dashboard',
      }),
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    // If no redirect, check for errors
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    return result;
  } catch (error) {
    throw error;
  }
}

export async function logoutUser() {
  try {
    // Use Auth.js built-in signout endpoint
    const response = await fetch('/auth/signout', {
      method: 'POST',
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    // If no redirect, go to home page
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = '/';
  }
} 