import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { users, sessions } from '$lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const sessionToken = cookies.get('authjs.session-token');
	if (!sessionToken) throw redirect(302, '/login');

	const session = await db.query.sessions.findFirst({
		where: and(eq(sessions.sessionToken, sessionToken), gt(sessions.expires, new Date())),
		with: { user: true }
	});

	if (!session || !session.user) throw redirect(302, '/login');
	if ((session.user as any).role !== 'admin') throw redirect(302, '/dashboard');

	return { session: { user: { id: session.user.id, email: session.user.email, role: (session.user as any).role } } };
};


