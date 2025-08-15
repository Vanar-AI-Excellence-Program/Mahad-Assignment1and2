import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { email, secret } = body as { email?: string; secret?: string };
		
		// Simple secret check (in production, use proper authentication)
		if (secret !== 'admin-setup-2024') {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!email) {
			return json({ error: 'Email required' }, { status: 400 });
		}

		// Find user by email and promote to admin
		const result = await db.update(users)
			.set({ role: 'admin' })
			.where(eq(users.email, email))
			.returning({ id: users.id, email: users.email, role: users.role });

		if (result.length === 0) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		return json({ 
			success: true, 
			message: `User ${email} promoted to admin`,
			user: result[0]
		});
	} catch (error) {
		console.error('Setup admin error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
