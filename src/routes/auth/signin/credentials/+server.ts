import { signIn } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const callbackUrl = formData.get('callbackUrl') as string || '/dashboard';

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // Redirect back to login with error
      throw redirect(302, `/auth/login?error=${encodeURIComponent(result.error)}`);
    }

    // Successful login, redirect to callback URL
    throw redirect(302, callbackUrl);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    // Handle unexpected errors
    throw redirect(302, `/auth/login?error=${encodeURIComponent('An unexpected error occurred')}`);
  }
};
