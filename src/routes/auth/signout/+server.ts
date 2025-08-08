import { signOut } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ url }) => {
  const callbackUrl = url.searchParams.get('callbackUrl') || '/';
  
  try {
    await signOut({ redirect: false });
    throw redirect(302, callbackUrl);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    // Handle unexpected errors
    throw redirect(302, '/');
  }
};
