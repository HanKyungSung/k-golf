import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/authService';

const prisma = new PrismaClient();

async function main() {
	const desiredRooms = [
		{ name: 'Room 1', capacity: 4, active: true },
		{ name: 'Room 2', capacity: 4, active: true },
		{ name: 'Room 3', capacity: 4, active: true },
		{ name: 'Room 4', capacity: 4, active: true },
	];

	for (const r of desiredRooms) {
		await prisma.room.upsert({
			where: { name: r.name },
			update: { capacity: r.capacity, active: true },
			create: { name: r.name, capacity: r.capacity, active: true },
		});
	}

	// Deactivate any rooms not in the desired list, so frontend only sees these 4
	await prisma.room.updateMany({
		where: { name: { notIn: desiredRooms.map((r) => r.name) } },
		data: { active: false },
	});

	console.log('Seed complete: 4 rooms active (Room 1-4); others deactivated');

	// Create a test user for manual login (idempotent by email)
	// Only in non-production by default. To force in prod/staging, set SEED_ENABLE_TEST_USER=true explicitly.
	const enableTestUser = (process.env.NODE_ENV !== 'production') || process.env.SEED_ENABLE_TEST_USER === 'true';
	if (enableTestUser) {
		const testEmail = process.env.SEED_TEST_EMAIL || 'test@example.com';
		const testName = process.env.SEED_TEST_NAME || 'Test User';
		const testPassword = process.env.SEED_TEST_PASSWORD || 'password123';
		const existing = await prisma.user.findUnique({ where: { email: testEmail } });
		if (!existing) {
			const passwordHash = await hashPassword(testPassword);
			await prisma.user.create({ data: { email: testEmail, name: testName, passwordHash, passwordUpdatedAt: new Date() } as any });
			console.log(`Seeded test user: ${testEmail} / ${testPassword}`);
		} else {
			console.log(`Test user already exists: ${testEmail}`);
		}
	} else {
		console.log('Skipping test user seeding (production and SEED_ENABLE_TEST_USER not set).');
	}
}

main()
	.catch((e) => {
		console.error('Seed error', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
