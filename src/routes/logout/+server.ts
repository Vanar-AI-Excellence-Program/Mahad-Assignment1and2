import { json, redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { sessions } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		console.log('🚪 [logout API] Processing logout request');

		// Get the session token from cookies
		const sessionToken = cookies.get('authjs.session-token');
		
		if (sessionToken) {
			// Delete the session from the database
			await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
			console.log('✅ [logout API] Database session deleted successfully');
		}

		// Clear the session cookie
		cookies.delete('authjs.session-token', { path: '/' });
		console.log('✅ [logout API] Session cookie cleared');

		// Return success - the session has been removed from the database
		return json({
			success: true,
			message: 'Logout successful'
		});

	} catch (error) {
		console.error('❌ [logout API] Logout error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
