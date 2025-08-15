import { json, redirect } from '@sveltejs/kit';
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
		const storedState = cookies.get('oauth_state_google');

		if (!code || !state || !storedState || state !== storedState) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('Invalid OAuth state')}`);
		}

		cookies.delete('oauth_state_google', { path: '/' });

		const clientId = env.GOOGLE_CLIENT_ID;
		const clientSecret = env.GOOGLE_CLIENT_SECRET;
		const redirectUri = `${url.origin}/auth/callback/google`;

		if (!clientId || !clientSecret) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('Google OAuth not configured')}`);
		}

		// Exchange code for tokens
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code'
			})
		});

		if (!tokenRes.ok) {
			const errText = await tokenRes.text().catch(() => '');
			throw redirect(302, `/auth/login?error=${encodeURIComponent(`Failed to authenticate with Google: ${errText}`)}`);
		}

		const tokens = await tokenRes.json();
		const idToken = tokens.id_token as string | undefined;
		const accessToken = tokens.access_token as string | undefined;
		const tokenType = tokens.token_type as string | undefined;

		if (!accessToken) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('Missing Google access token')}`);
		}

		// Fetch user info
		const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		if (!userInfoRes.ok) {
			const errText = await userInfoRes.text().catch(() => '');
			throw redirect(302, `/auth/login?error=${encodeURIComponent(`Failed to fetch Google user info: ${errText}`)}`);
		}
		const profile = await userInfoRes.json();
		const email = profile.email as string;
		const givenName = profile.given_name as string | undefined;
		const familyName = profile.family_name as string | undefined;

		if (!email) {
			throw redirect(302, `/auth/login?error=${encodeURIComponent('Google account has no email')}`);
		}

		// Upsert user
		let user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user) {
			const newUser = await db.insert(users).values({
				email,
				hashedPassword: 'oauth-google',
                emailVerified: true,
                role: 'user'
			}).returning();
			user = newUser[0];
			await db.insert(userProfiles).values({
				userId: user.id,
				firstName: givenName || null,
				lastName: familyName || null
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
        // Preserve earlier redirects with detailed error messages
        const maybe: any = e;
        if (maybe && typeof maybe === 'object' && 'status' in maybe && maybe.status >= 300 && maybe.status < 400) {
            throw e as any;
        }
        console.error('Google OAuth callback error:', e);
        throw redirect(302, `/auth/login?error=${encodeURIComponent('Google OAuth failed')}`);
    }
};


