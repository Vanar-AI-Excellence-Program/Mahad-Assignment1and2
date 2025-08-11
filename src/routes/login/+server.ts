import { json, redirect } from '@sveltejs/kit';
import { loginSchema } from '$lib/validations/auth';
import { db } from '$lib/db';
import { users, sessions } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		
		// Validate input
		const validatedFields = loginSchema.safeParse(body);
		if (!validatedFields.success) {
			return json(
				{ error: 'Invalid input', details: validatedFields.error.flatten() },
				{ status: 400 }
			);
		}

		const { email, password } = validatedFields.data;
		console.log('🔐 [login API] Attempting login for:', email);

		// Find user by email
		const user = await db.query.users.findFirst({
			where: eq(users.email, email),
		});

		if (!user || !user.hashedPassword) {
			console.log('❌ [login API] User not found or no password');
			return json(
				{ error: 'Invalid email or password' },
				{ status: 401 }
			);
		}

		// Check if email is verified
		if (!user.emailVerified) {
			console.log('❌ [login API] Email not verified');
			return json(
				{ error: 'Please verify your email before signing in. Check your inbox for the verification code.' },
				{ status: 401 }
			);
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
		
		if (!isPasswordValid) {
			console.log('❌ [login API] Invalid password');
			return json(
				{ error: 'Invalid email or password' },
				{ status: 401 }
			);
		}

		console.log('✅ [login API] Credentials validated, creating database session');

		// Generate session data
		const sessionId = randomUUID();
		const sessionToken = randomUUID();
		const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		// Create session in database
		await db.insert(sessions).values({
			id: sessionId,
			sessionToken: sessionToken,
			userId: user.id,
			expires: expires,
		});

		console.log('✅ [login API] Database session created successfully');

		// Set session cookie for Auth.js
		cookies.set('authjs.session-token', sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 30 * 24 * 60 * 60, // 30 days
		});

		// Return success - the session is now stored in the database
		return json({
			success: true,
			message: 'Login successful',
			user: {
				id: user.id,
				email: user.email,
				emailVerified: user.emailVerified,
			}
		});

	} catch (error) {
		console.error('❌ [login API] Login error:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
