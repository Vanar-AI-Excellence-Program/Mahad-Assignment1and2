import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { verificationTokens } from '$lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const token = url.searchParams.get('token');
		if (!token) {
			return json({ error: 'Missing reset token' }, { status: 400 });
		}

		// Check token exists, is not expired, and is of correct type without consuming it
		const record = await db.query.verificationTokens.findFirst({
			where: and(
				eq(verificationTokens.token, token),
				eq(verificationTokens.type, 'password-reset'),
				gt(verificationTokens.expires, new Date())
			)
		});

		if (!record) {
			return json({ error: 'Invalid or expired reset token' }, { status: 400 });
		}

		return json({ valid: true }, { status: 200 });
	} catch (error) {
		console.error('Verify reset token error:', error);
		return json({ error: 'Failed to verify reset token' }, { status: 500 });
	}
};