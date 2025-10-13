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
			update: ({ capacity: r.capacity, active: true, openMinutes: 540, closeMinutes: 1140, status: 'ACTIVE' } as any),
			create: ({ name: r.name, capacity: r.capacity, active: true, openMinutes: 540, closeMinutes: 1140, status: 'ACTIVE' } as any),
		});
	}

	// Deactivate any rooms not in the desired list, so frontend only sees these 4
	await prisma.room.updateMany({
		where: { name: { notIn: desiredRooms.map((r) => r.name) } },
		data: { active: false },
	});

	console.log('Seed complete: 4 rooms active (Room 1-4); others deactivated');

	// Seed default settings (idempotent by key)
	const defaultSettings = [
		{
			key: 'global_tax_rate',
			value: '8',
			valueType: 'number',
			description: 'Default tax rate percentage applied to all bookings',
			category: 'tax',
			isPublic: true,
		},
	];

	for (const setting of defaultSettings) {
		await prisma.setting.upsert({
			where: { key: setting.key },
			update: {
				value: setting.value,
				valueType: setting.valueType,
				description: setting.description,
				category: setting.category,
				isPublic: setting.isPublic,
			},
			create: setting,
		});
	}
	console.log('Seeded default settings: global_tax_rate');

	// Create admin user (idempotent by email)
	const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@kgolf.com';
	const adminName = process.env.SEED_ADMIN_NAME || 'Admin User';
	const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
	const adminPhone = process.env.SEED_ADMIN_PHONE || '+14165551000'; // Canadian phone format (Toronto area code)
	
	const existingAdmin = await prisma.user.findFirst({ 
		where: { 
			OR: [
				{ email: adminEmail },
				{ phone: adminPhone }
			]
		} 
	});
	
	if (!existingAdmin) {
		const adminPasswordHash = await hashPassword(adminPassword);
		await prisma.user.create({
			data: {
				email: adminEmail,
				name: adminName,
				phone: adminPhone,
				passwordHash: adminPasswordHash,
				passwordUpdatedAt: new Date(),
				emailVerifiedAt: new Date(),
				role: 'ADMIN',
				registrationSource: 'ONLINE',
			} as any,
		});
		console.log(`Seeded admin user: ${adminEmail} / ${adminPhone} / ${adminPassword} (role: ADMIN)`);
	} else {
		// Ensure existing admin has ADMIN role and updated phone
		if ((existingAdmin as any).role !== 'ADMIN' || (existingAdmin as any).phone !== adminPhone) {
			await prisma.user.update({
				where: { id: existingAdmin.id },
				data: { 
					role: 'ADMIN', 
					emailVerifiedAt: new Date(),
					phone: adminPhone,
				},
			});
			console.log(`Updated existing user to ADMIN role with phone: ${adminEmail} / ${adminPhone}`);
		} else {
			console.log(`Admin user already exists: ${adminEmail} / ${adminPhone}`);
		}
	}

	// Create a test user for manual login (idempotent by email)
	// Only in non-production by default. To force in prod/staging, set SEED_ENABLE_TEST_USER=true explicitly.
	const enableTestUser = (process.env.NODE_ENV !== 'production') || process.env.SEED_ENABLE_TEST_USER === 'true';
	if (enableTestUser) {
		const testEmail = process.env.SEED_TEST_EMAIL || 'test@example.com';
		const testName = process.env.SEED_TEST_NAME || 'Test User';
		const testPassword = process.env.SEED_TEST_PASSWORD || 'password123';
		const testPhone = process.env.SEED_TEST_PHONE || '+14165552000'; // Canadian phone format (Toronto area code)
		
		const existing = await prisma.user.findFirst({ 
			where: { 
				OR: [
					{ email: testEmail },
					{ phone: testPhone }
				]
			} 
		});
		
		if (!existing) {
			const passwordHash = await hashPassword(testPassword);
			await prisma.user.create({
				data: {
					email: testEmail,
					name: testName,
					phone: testPhone,
					passwordHash,
					passwordUpdatedAt: new Date(),
					emailVerifiedAt: new Date(),
					registrationSource: 'ONLINE',
				} as any,
			});
			console.log(`Seeded test user: ${testEmail} / ${testPhone} / ${testPassword}`);
		} else {
			if (!(existing as any).emailVerifiedAt) {
				await prisma.user.update({ 
					where: { id: existing.id }, 
					data: { 
						emailVerifiedAt: new Date(),
						phone: testPhone,
					} 
				});
				console.log(`Marked test user as verified: ${testEmail} / ${testPhone}`);
			} else {
				console.log(`Test user already exists: ${testEmail} / ${testPhone}`);
			}
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
