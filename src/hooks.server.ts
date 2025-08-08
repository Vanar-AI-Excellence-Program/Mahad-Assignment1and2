import { handle as authHandle } from '$lib/auth';
import { buildCSPHeader, buildDevCSPHeader } from '$lib/csp';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const handle: Handle = async ({ event, resolve }) => {
  const response = await authHandle({ event, resolve });
  
  // Set CSP headers dynamically based on environment
  if (response instanceof Response) {
    const cspHeader = dev ? buildDevCSPHeader() : buildCSPHeader();
    response.headers.set('Content-Security-Policy', cspHeader);
  }
  
  return response;
};

export { handle }; 