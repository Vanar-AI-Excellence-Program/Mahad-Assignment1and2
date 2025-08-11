import { buildCSPHeader, buildDevCSPHeader } from '$lib/csp';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  
  // Set CSP headers dynamically based on environment
  const cspHeader = dev ? buildDevCSPHeader() : buildCSPHeader();
  response.headers.set('Content-Security-Policy', cspHeader);
  
  return response;
};

export { handle }; 