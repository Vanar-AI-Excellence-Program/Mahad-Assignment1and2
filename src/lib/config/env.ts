import { env } from '$env/dynamic/private';

// Set the environment variable that Google AI SDK expects
if (env.GEMINI_API_KEY) {
	process.env.GOOGLE_GENERATIVE_AI_API_KEY = env.GEMINI_API_KEY;
}

export const config = {
	GEMINI_API_KEY: env.GEMINI_API_KEY,
	GOOGLE_GENERATIVE_AI_API_KEY: env.GEMINI_API_KEY, // Also set the expected Google AI SDK variable
	DATABASE_URL: env.DATABASE_URL,
	AUTH_SECRET: env.AUTH_SECRET,
	AUTH_URL: env.AUTH_URL,
	GMAIL_USER: env.GMAIL_USER,
	GMAIL_APP_PASSWORD: env.GMAIL_APP_PASSWORD,
	PUBLIC_APP_URL: env.PUBLIC_APP_URL,
	ENCRYPTION_KEY: env.ENCRYPTION_KEY,
	DEBUG: env.DEBUG === 'true',
	NODE_ENV: env.NODE_ENV || 'development',
	GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
	GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
	EMBEDDING_API_URL: env.EMBEDDING_API_URL || 'http://localhost:8000/embed',
} as const;

// Validate required environment variables
export function validateEnv() {
	const required = ['GEMINI_API_KEY', 'DATABASE_URL', 'AUTH_SECRET'];
	const missing = required.filter(key => !config[key as keyof typeof config]);
	
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}
}
