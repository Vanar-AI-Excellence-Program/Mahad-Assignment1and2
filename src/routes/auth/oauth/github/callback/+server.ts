import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { users, sessions, userProfiles } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const storedState = cookies.get('oauth_state_github');

		if (!code || !state || !storedState || state !== storedState) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('Invalid OAuth state')}`);
		}

		cookies.delete('oauth_state_github', { path: '/' });

		const clientId = env.GITHUB_CLIENT_ID;
		const clientSecret = env.GITHUB_CLIENT_SECRET;
		const redirectUri = `${url.origin}/auth/callback/github`;

		if (!clientId || !clientSecret) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('GitHub OAuth not configured')}`);
		}

		// Exchange code for access token
		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri,
				state
			})
		});
        if (!tokenRes.ok) {
            const errText = await tokenRes.text().catch(() => '');
            throw redirect(302, `/auth/login?error=${encodeURIComponent('Failed to authenticate with GitHub: ' + errText)}`);
        }
		const tokenJson = await tokenRes.json();
		const accessToken = tokenJson.access_token as string | undefined;
		if (!accessToken) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('Missing GitHub access token')}`);
		}

		// Fetch user emails to get primary email
		const emailsRes = await fetch('https://api.github.com/user/emails', {
			headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'AuthFlow' }
		});
        if (!emailsRes.ok) {
            const errText = await emailsRes.text().catch(() => '');
            throw redirect(302, `/auth/login?error=${encodeURIComponent('Failed to fetch GitHub email: ' + errText)}`);
        }
		const emails = await emailsRes.json() as Array<{email: string, primary: boolean, verified: boolean}>;
		const primaryEmail = emails.find(e => e.primary && e.verified)?.email || emails[0]?.email;
		if (!primaryEmail) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('GitHub account has no accessible email')}`);
		}

		// Fetch basic profile for names
		const userRes = await fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'AuthFlow' }
		});
		const gh = await userRes.json();
		const name = (gh.name as string | undefined) || '';
		const [firstName, ...rest] = name.split(' ');
		const lastName = rest.join(' ') || null;

		// Upsert user
		let user = await db.query.users.findFirst({ where: eq(users.email, primaryEmail) });
        if (!user) {
			const newUser = await db.insert(users).values({
				email: primaryEmail,
				hashedPassword: 'oauth-github',
                emailVerified: true,
                role: 'user'
			}).returning();
			user = newUser[0];
			await db.insert(userProfiles).values({
				userId: user.id,
				firstName: firstName || null,
				lastName
			});
		}

		// Create session
		const sessionToken = randomUUID();
		const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		await db.insert(sessions).values({
			id: randomUUID(),
			sessionToken,
			userId: user.id,
			expires
		});
		cookies.set('authjs.session-token', sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60
		});

		throw redirect(302, '/dashboard');
    } catch (e) {
        // Preserve earlier redirects that include detailed error messages
        const maybe: any = e;
        if (maybe && typeof maybe === 'object' && 'status' in maybe && maybe.status >= 300 && maybe.status < 400) {
            throw e as any;
        }
        console.error('GitHub OAuth callback error:', e);
        throw redirect(302, `/auth/login?error=${encodeURIComponent('GitHub OAuth failed')}`);
    }
};


