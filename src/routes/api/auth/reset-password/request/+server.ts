import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions, users } from '$lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { createVerificationToken } from '$lib/utils/token';
import { sendPasswordResetEmail } from '$lib/utils/email';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Authenticate via session cookie
		const sessionToken = cookies.get('authjs.session-token');
		if (!sessionToken) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Validate session
		const session = await db.query.sessions.findFirst({
			where: and(
				eq(sessions.sessionToken, sessionToken),
				gt(sessions.expires, new Date())
			),
			with: {
				user: true
			}
		});

		if (!session || !session.user) {
			return json({ error: 'Invalid or expired session' }, { status: 401 });
		}

		const userEmail = session.user.email;
		if (!userEmail) {
			return json({ error: 'User email not found' }, { status: 400 });
		}

		// Create password reset token
		const token = await createVerificationToken(userEmail, 'password-reset', 60 * 60 * 24);

		// Send reset email
		const emailSent = await sendPasswordResetEmail(userEmail, token);
		if (!emailSent) {
			return json({ error: 'Failed to send password reset email' }, { status: 500 });
		}

		return json({ success: true, message: 'Password reset email sent' }, { status: 200 });
	} catch (error) {
		console.error('Send reset email error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


