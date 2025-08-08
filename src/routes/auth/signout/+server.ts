import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ url }) => {
  const callbackUrl = url.searchParams.get('callbackUrl') || '/';
  
  try {
    // For now, just redirect to the callback URL
    // In a real implementation, you would clear the session here
    throw redirect(302, callbackUrl);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    // Handle unexpected errors
    throw redirect(302, '/');
  }
};
