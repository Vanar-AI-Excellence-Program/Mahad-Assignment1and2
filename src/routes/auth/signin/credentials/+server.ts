import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const callbackUrl = formData.get('callbackUrl') as string || '/dashboard';

  try {
    // For now, redirect to the login page with the credentials
    // The actual authentication will be handled by the login page
    const params = new URLSearchParams({
      email,
      password,
      callbackUrl
    });
    
    throw redirect(302, `/auth/login?${params.toString()}`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    // Handle unexpected errors
    throw redirect(302, `/auth/login?error=${encodeURIComponent('An unexpected error occurred')}`);
  }
};
