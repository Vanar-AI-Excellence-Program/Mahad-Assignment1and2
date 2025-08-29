import type { RequestHandler } from './$types';
import { config } from '$lib/config/env';

export const GET: RequestHandler = async () => {
	try {
		// Check environment variables
		const envStatus = {
			GEMINI_API_KEY: !!config.GEMINI_API_KEY,
			DATABASE_URL: !!config.DATABASE_URL,
			AUTH_SECRET: !!config.AUTH_SECRET,
			NODE_ENV: config.NODE_ENV,
			PUBLIC_APP_URL: config.PUBLIC_APP_URL
		};

		// Check if required variables are missing
		const missingVars = Object.entries(envStatus)
			.filter(([key, value]) => key !== 'NODE_ENV' && key !== 'PUBLIC_APP_URL' && !value)
			.map(([key]) => key);

		return new Response(JSON.stringify({
			status: missingVars.length === 0 ? 'ok' : 'missing_vars',
			environment: envStatus,
			missing: missingVars,
			timestamp: new Date().toISOString()
		}), {
			headers: {
				'Content-Type': 'application/json',
			},
		});

	} catch (error) {
		console.error('Environment check error:', error);
		return new Response(JSON.stringify({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString()
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	}
};
