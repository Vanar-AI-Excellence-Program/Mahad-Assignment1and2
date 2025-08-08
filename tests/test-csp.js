console.log('🧪 Testing CSP Configuration...\n');

// Define CSP directives (matching src/lib/csp.ts)
const cspDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // unsafe-eval needed for Auth.js
  'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for TailwindCSS
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'frame-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

// Development CSP (more permissive)
const devCspDirectives = {
  ...cspDirectives,
  'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", 'ws:', 'wss:'], // Allow WebSocket connections for HMR
};

function buildCSPHeader(directives) {
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Test production CSP
console.log('📋 Production CSP:');
const productionCSP = buildCSPHeader(cspDirectives);
console.log(productionCSP);
console.log('');

// Test development CSP
console.log('📋 Development CSP:');
const developmentCSP = buildCSPHeader(devCspDirectives);
console.log(developmentCSP);
console.log('');

// Verify required directives are present
console.log('✅ CSP Validation:');

const requiredDirectives = [
  'script-src',
  'style-src',
  'default-src'
];

const productionDirectives = productionCSP.split(';').map(d => d.trim().split(' ')[0]);
const developmentDirectives = developmentCSP.split(';').map(d => d.trim().split(' ')[0]);

requiredDirectives.forEach(directive => {
  const prodHas = productionDirectives.includes(directive);
  const devHas = developmentDirectives.includes(directive);
  
  console.log(`  ${directive}: ${prodHas ? '✅' : '❌'} (prod) ${devHas ? '✅' : '❌'} (dev)`);
});

// Check for unsafe-eval (required for Auth.js)
const hasUnsafeEval = productionCSP.includes('unsafe-eval');
console.log(`  unsafe-eval: ${hasUnsafeEval ? '✅' : '❌'} (required for Auth.js)`);

// Check for unsafe-inline (required for TailwindCSS)
const hasUnsafeInline = productionCSP.includes('unsafe-inline');
console.log(`  unsafe-inline: ${hasUnsafeInline ? '✅' : '❌'} (required for TailwindCSS)`);

// Check for WebSocket support in development
const hasWebSocket = developmentCSP.includes('ws:');
console.log(`  WebSocket support: ${hasWebSocket ? '✅' : '❌'} (dev only)`);

console.log('\n🎉 CSP Configuration Test Complete!');
