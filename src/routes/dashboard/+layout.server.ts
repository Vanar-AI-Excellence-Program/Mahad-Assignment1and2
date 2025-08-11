import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { users, sessions } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const sessionToken = cookies.get('authjs.session-token');

	if (!sessionToken) {
		throw redirect(302, '/login');
	}

	// Check if session exists and is valid
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
		// Clear invalid session cookie
		cookies.delete('authjs.session-token', { path: '/' });
		throw redirect(302, '/login');
	}

	// Check if user still exists and is verified
	const user = await db.query.users.findFirst({
		where: eq(users.id, session.userId)
	});

	if (!user || !user.emailVerified) {
		// Clear invalid session
		await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
		cookies.delete('authjs.session-token', { path: '/' });
		throw redirect(302, '/login');
	}

	return {
		session: {
			user: {
				id: user.id,
				email: user.email,
				emailVerified: user.emailVerified,
			}
		}
	};
}; 