import { env } from '$env/dynamic/private';

// Set the environment variable that Google AI SDK expects
process.env.GOOGLE_GENERATIVE_AI_API_KEY = env.GEMINI_API_KEY;

// Add EMBEDDING_API_URL to the environment
export const EMBEDDING_API_URL = env.EMBEDDING_API_URL || 'http://localhost:8000';

export const config = {
	GEMINI_API_KEY: env.GEMINI_API_KEY,
	DATABASE_URL: env.DATABASE_URL,
	AUTH_SECRET: env.AUTH_SECRET,
	AUTH_URL: env.AUTH_URL,
	GMAIL_USER: env.GMAIL_USER,
	GMAIL_PASS: env.GMAIL_PASS,
	GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
	GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
	EMBEDDING_API_URL: EMBEDDING_API_URL
};

// Validate required environment variables
export function validateEnv() {
	const required = ['GEMINI_API_KEY', 'DATABASE_URL', 'AUTH_SECRET'];
	const missing = required.filter(key => !config[key as keyof typeof config]);
	
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}
}
