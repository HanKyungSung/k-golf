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
	// This admin user is used for both web login and POS API authentication
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

	// Seed mock bookings for development/testing
	const enableMockBookings = (process.env.NODE_ENV !== 'production') || process.env.SEED_ENABLE_MOCK_BOOKINGS === 'true';
	if (enableMockBookings) {
		console.log('Seeding mock bookings...');
		
		// Get all rooms
		const rooms = await prisma.room.findMany({ where: { active: true } });
		if (rooms.length === 0) {
			console.log('No active rooms found, skipping mock bookings');
		} else {
			// Get admin user for bookings
			const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
			if (!adminUser) {
				console.log('Admin user not found, skipping mock bookings');
			} else {
				// Mock customer data
				const mockCustomers = [
					{ name: 'John Smith', phone: '+14165553001', email: 'john.smith@example.com' },
					{ name: 'Sarah Johnson', phone: '+14165553002', email: 'sarah.j@example.com' },
					{ name: 'Michael Brown', phone: '+14165553003', email: 'mbrown@example.com' },
					{ name: 'Emily Davis', phone: '+14165553004', email: 'emily.davis@example.com' },
					{ name: 'David Wilson', phone: '+14165553005', email: 'david.w@example.com' },
					{ name: 'Jennifer Lee', phone: '+14165553006', email: 'jen.lee@example.com' },
					{ name: 'Robert Taylor', phone: '+14165553007', email: 'robert.t@example.com' },
					{ name: 'Lisa Anderson', phone: '+14165553008', email: 'lisa.a@example.com' },
					{ name: 'James Martinez', phone: '+14165553009', email: 'james.m@example.com' },
					{ name: 'Mary Garcia', phone: '+14165553010', email: 'mary.garcia@example.com' },
					{ name: 'William Rodriguez', phone: '+14165553011', email: 'will.r@example.com' },
					{ name: 'Patricia Hernandez', phone: '+14165553012', email: 'patricia.h@example.com' },
					{ name: 'Thomas Moore', phone: '+14165553013', email: 'thomas.moore@example.com' },
					{ name: 'Linda Jackson', phone: '+14165553014', email: 'linda.j@example.com' },
					{ name: 'Christopher White', phone: '+14165553015', email: 'chris.white@example.com' },
					{ name: 'Barbara Harris', phone: '+14165553016', email: 'barbara.h@example.com' },
					{ name: 'Daniel Clark', phone: '+14165553017', email: 'daniel.clark@example.com' },
					{ name: 'Jessica Lewis', phone: '+14165553018', email: 'jessica.l@example.com' },
					{ name: 'Matthew Robinson', phone: '+14165553019', email: 'matt.r@example.com' },
					{ name: 'Nancy Walker', phone: '+14165553020', email: 'nancy.w@example.com' },
					{ name: 'Anthony Young', phone: '+14165553021', email: 'anthony.y@example.com' },
					{ name: 'Karen Allen', phone: '+14165553022', email: 'karen.allen@example.com' },
					{ name: 'Mark King', phone: '+14165553023', email: 'mark.king@example.com' },
					{ name: 'Betty Wright', phone: '+14165553024', email: 'betty.w@example.com' },
					{ name: 'Paul Lopez', phone: '+14165553025', email: 'paul.lopez@example.com' },
				];

				// Generate bookings for past 30 days and next 14 days
				const today = new Date();
				const bookingsToCreate = [];
				
				for (let dayOffset = -30; dayOffset <= 14; dayOffset++) {
					const bookingDate = new Date(today);
					bookingDate.setDate(today.getDate() + dayOffset);
					bookingDate.setHours(0, 0, 0, 0);

					// Create 2-4 random bookings per day
					const numBookingsToday = Math.floor(Math.random() * 3) + 2; // 2-4 bookings
					
					for (let i = 0; i < numBookingsToday; i++) {
						const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
						const room = rooms[Math.floor(Math.random() * rooms.length)];
						
						// Random time between 9:00 and 18:00 (to avoid conflicts)
						const hour = 9 + Math.floor(Math.random() * 9); // 9-17
						const minute = Math.random() < 0.5 ? 0 : 30;
						
						const startTime = new Date(bookingDate);
						startTime.setHours(hour, minute, 0, 0);
						
						// Random duration: 1-3 hours
						const duration = Math.floor(Math.random() * 3) + 1;
						const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
						
						// Random players: 1-4
						const players = Math.floor(Math.random() * 4) + 1;
						
						// Calculate price (base $50/hour)
						const basePrice = duration * 50;
						
						// Status: past bookings are completed, future are confirmed
						const isPast = startTime < today;
						const status = isPast ? 'CONFIRMED' : 'CONFIRMED'; // All confirmed for now
						
						// Created at: random time before start time
						const createdAt = new Date(startTime.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Up to 7 days before
						
						bookingsToCreate.push({
							roomId: room.id,
							userId: adminUser.id,
							customerName: customer.name,
							customerPhone: customer.phone,
							customerEmail: customer.email,
							startTime,
							endTime,
							players,
							price: basePrice,
							status,
							isGuestBooking: false,
							bookingSource: Math.random() < 0.5 ? 'WALK_IN' : 'PHONE',
							createdBy: adminUser.id,
							createdAt,
						});
					}
				}

				// Insert bookings (skip if already exists to make seed idempotent)
				let createdCount = 0;
				for (const booking of bookingsToCreate) {
					const existing = await prisma.booking.findFirst({
						where: {
							roomId: booking.roomId,
							startTime: booking.startTime,
							endTime: booking.endTime,
						},
					});
					
					if (!existing) {
						await prisma.booking.create({
							data: booking as any,
						});
						createdCount++;
					}
				}
				
				console.log(`Seeded ${createdCount} mock bookings (total attempted: ${bookingsToCreate.length})`);
			}
		}
	} else {
		console.log('Skipping mock bookings seeding (production and SEED_ENABLE_MOCK_BOOKINGS not set).');
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
