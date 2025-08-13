import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { generateToken } from '$lib/utils/token';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const clientId = env.GOOGLE_CLIENT_ID;
	const redirectUri = `${url.origin}/auth/callback/google`;

	if (!clientId) {
		throw redirect(302, `/auth/login?error=${encodeURIComponent('Google OAuth is not configured')}`);
	}

	const state = generateToken(16);
	cookies.set('oauth_state_google', state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 300
	});

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		include_granted_scopes: 'true',
		state
	});

	throw redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};


