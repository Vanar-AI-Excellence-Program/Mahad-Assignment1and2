import { db } from '$lib/db';
import { sessions } from '$lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function auth(cookies: any): Promise<any | null> {
    try {
        const sessionToken = cookies.get('authjs.session-token');
        if (!sessionToken) {
            return null;
        }

        const session = await db.query.sessions.findFirst({
            where: and(
                eq(sessions.sessionToken, sessionToken),
                gt(sessions.expires, new Date())
            ),
            with: {
                user: true
            }
        });

        return session;
    } catch (error) {
        console.error('Auth error:', error);
        return null;
    }
}
