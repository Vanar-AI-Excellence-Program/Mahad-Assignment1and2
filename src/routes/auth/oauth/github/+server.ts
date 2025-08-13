import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { generateToken } from '$lib/utils/token';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const clientId = env.GITHUB_CLIENT_ID;
	const redirectUri = `${url.origin}/auth/callback/github`;

	if (!clientId) {
		throw redirect(302, `/auth/login?error=${encodeURIComponent('GitHub OAuth is not configured')}`);
	}

	const state = generateToken(16);
	cookies.set('oauth_state_github', state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 300
	});

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'read:user user:email',
		state
	});

	throw redirect(302, `https://github.com/login/oauth/authorize?${params.toString()}`);
};


