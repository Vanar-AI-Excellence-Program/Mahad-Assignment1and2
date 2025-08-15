import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { users, sessions } from '$lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ request, cookies }) => {
	try {
		const sessionToken = cookies.get('authjs.session-token');
		if (!sessionToken) return json({ error: 'Unauthorized' }, { status: 401 });

		const session = await db.query.sessions.findFirst({
			where: and(eq(sessions.sessionToken, sessionToken), gt(sessions.expires, new Date())),
			with: { user: true }
		});
		if (!session || !session.user || (session.user as any).role !== 'admin') {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { userId, role } = body as { userId?: string; role?: 'admin' | 'user' };
		if (!userId || (role !== 'admin' && role !== 'user')) {
			return json({ error: 'Invalid payload' }, { status: 400 });
		}

		await db.update(users).set({ role }).where(eq(users.id, userId));
		return json({ success: true });
	} catch (error) {
		console.error('Update role error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


