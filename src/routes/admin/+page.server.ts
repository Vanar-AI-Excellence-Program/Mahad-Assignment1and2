import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import { count, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Users list (limited)
	const allUsers = await db.query.users.findMany({
		columns: { id: true, email: true, emailVerified: true, role: true, createdAt: true, updatedAt: true },
		limit: 100,
		orderBy: (users, { desc }) => desc(users.createdAt)
	});

	// Simple analytics
	const totalUsers = await db.select({ c: count(users.id) }).from(users);
	const verifiedUsers = await db.select({ c: count(users.id) }).from(users).where(sql`${users.emailVerified} = true`);
	const adminUsers = await db.select({ c: count(users.id) }).from(users).where(sql`${users.role} = 'admin'`);

	return {
		users: allUsers,
		stats: {
			total: totalUsers[0]?.c ?? 0,
			verified: verifiedUsers[0]?.c ?? 0,
			admins: adminUsers[0]?.c ?? 0
		}
	};
};


