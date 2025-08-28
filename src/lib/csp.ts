/**
 * Content Security Policy configuration for AuthFlow
 * 
 * This configuration allows Auth.js to work properly while maintaining security.
 * The 'unsafe-eval' directive is required for Auth.js internal functionality.
 */

export const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // unsafe-eval needed for Auth.js
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"], // unsafe-inline needed for TailwindCSS, Google Fonts
  'style-src-elem': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"], // Explicitly allow external stylesheets
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", "https://fonts.gstatic.com"], // Google Fonts
  'connect-src': ["'self'"],
  'frame-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

export function buildCSPHeader(): string {
  return Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Alternative CSP for development (more permissive)
export const devCspDirectives = {
  ...cspDirectives,
  'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'font-src': ["'self'", "https://fonts.gstatic.com"],
  'connect-src': ["'self'", 'ws:', 'wss:'], // Allow WebSocket connections for HMR
};

export function buildDevCSPHeader(): string {
  return Object.entries(devCspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}
