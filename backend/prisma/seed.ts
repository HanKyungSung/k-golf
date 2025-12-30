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

	// Seed menu items (idempotent by ID)
	const defaultMenuItems = [
		// Hours (Room booking time)
		{ id: 'hour-1', name: '1 Hour', description: 'Screen golf room for 1 hour', price: 35.00, category: 'HOURS', hours: 1, available: true, sortOrder: 1 },
		{ id: 'hour-2', name: '2 Hours', description: 'Screen golf room for 2 hours', price: 70.00, category: 'HOURS', hours: 2, available: true, sortOrder: 2 },
		{ id: 'hour-3', name: '3 Hours', description: 'Screen golf room for 3 hours', price: 105.00, category: 'HOURS', hours: 3, available: true, sortOrder: 3 },
		{ id: 'hour-4', name: '4 Hours', description: 'Screen golf room for 4 hours', price: 140.00, category: 'HOURS', hours: 4, available: true, sortOrder: 4 },
		{ id: 'hour-5', name: '5 Hours', description: 'Screen golf room for 5 hours', price: 175.00, category: 'HOURS', hours: 5, available: true, sortOrder: 5 },
		// Food
		{ id: '1', name: 'Club Sandwich', description: 'Triple-decker with turkey, bacon, lettuce, and tomato', price: 12.99, category: 'FOOD', hours: null, available: true, sortOrder: 1 },
		{ id: '2', name: 'Korean Fried Chicken', description: 'Crispy chicken with sweet and spicy sauce', price: 15.99, category: 'FOOD', hours: null, available: true, sortOrder: 2 },
		{ id: '3', name: 'Bulgogi Burger', description: 'Korean-style marinated beef burger with kimchi', price: 14.99, category: 'FOOD', hours: null, available: true, sortOrder: 3 },
		{ id: '4', name: 'Caesar Salad', description: 'Fresh romaine with parmesan and croutons', price: 9.99, category: 'FOOD', hours: null, available: true, sortOrder: 4 },
		// Drinks
		{ id: '5', name: 'Soju', description: 'Korean distilled spirit (Original/Peach/Grape)', price: 8.99, category: 'DRINKS', hours: null, available: true, sortOrder: 1 },
		{ id: '6', name: 'Beer', description: 'Domestic and imported selection', price: 6.99, category: 'DRINKS', hours: null, available: true, sortOrder: 2 },
		{ id: '7', name: 'Soft Drinks', description: 'Coke, Sprite, Fanta, etc.', price: 2.99, category: 'DRINKS', hours: null, available: true, sortOrder: 3 },
		{ id: '8', name: 'Iced Coffee', description: 'Cold brew coffee with ice', price: 4.99, category: 'DRINKS', hours: null, available: true, sortOrder: 4 },
		// Appetizers
		{ id: '9', name: 'Chicken Wings', description: '6 pieces with choice of sauce', price: 10.99, category: 'APPETIZERS', hours: null, available: true, sortOrder: 1 },
		{ id: '10', name: 'French Fries', description: 'Crispy golden fries with ketchup', price: 5.99, category: 'APPETIZERS', hours: null, available: true, sortOrder: 2 },
		{ id: '11', name: 'Mozzarella Sticks', description: '6 pieces with marinara sauce', price: 8.99, category: 'APPETIZERS', hours: null, available: true, sortOrder: 3 },
		// Desserts
		{ id: '12', name: 'Ice Cream', description: 'Vanilla, chocolate, or strawberry', price: 5.99, category: 'DESSERTS', hours: null, available: true, sortOrder: 1 },
	];

	for (const menuItem of defaultMenuItems) {
		await prisma.menuItem.upsert({
			where: { id: menuItem.id },
			update: {
				name: menuItem.name,
				description: menuItem.description,
				price: menuItem.price,
				category: menuItem.category as any,
				hours: menuItem.hours,
				available: menuItem.available,
				sortOrder: menuItem.sortOrder,
			},
			create: menuItem as any,
		});
	}
	console.log(`Seeded ${defaultMenuItems.length} menu items`);

	// Create admin user (idempotent by email)
	// This admin user is used for both web login and POS API authentication
	const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@konegolf.ca';
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
				dateOfBirth: new Date('1985-03-15'),
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

	// Create a second admin account for testing (separate from primary admin)
	// Prevents issues from shared account access
	const admin2Email = 'admin2@konegolf.ca';
	const admin2Phone = '+14165553333'; // Separate phone for admin2
	const admin2Password = 'admin2password123';
	
	const existingAdmin2 = await prisma.user.findFirst({
		where: {
			OR: [
				{ email: admin2Email },
				{ phone: admin2Phone }
			]
		}
	});

	if (!existingAdmin2) {
		const passwordHash = await hashPassword(admin2Password);
		await prisma.user.create({
			data: {
				email: admin2Email,
				name: 'Admin 2 (Test)',
				phone: admin2Phone,
				dateOfBirth: new Date('1990-07-22'),
				passwordHash,
				passwordUpdatedAt: new Date(),
				emailVerifiedAt: new Date(),
				role: 'ADMIN',
				registrationSource: 'ONLINE',
			} as any,
		});
		console.log(`Seeded secondary admin user: ${admin2Email} / ${admin2Phone} / ${admin2Password} (role: ADMIN)`);
	} else {
		// Ensure existing admin2 has ADMIN role
		if ((existingAdmin2 as any).role !== 'ADMIN') {
			await prisma.user.update({
				where: { id: existingAdmin2.id },
				data: { role: 'ADMIN', emailVerifiedAt: new Date() },
			});
			console.log(`Updated existing user to ADMIN role: ${admin2Email} / ${admin2Phone}`);
		} else {
			console.log(`Admin 2 already exists: ${admin2Email} / ${admin2Phone}`);
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
					dateOfBirth: new Date('1995-11-30'),
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
					{ name: 'John Smith', phone: '+14165553001', email: 'john.smith@example.com', dateOfBirth: new Date('1988-05-12') },
					{ name: 'Sarah Johnson', phone: '+14165553002', email: 'sarah.j@example.com', dateOfBirth: new Date('1992-08-23') },
					{ name: 'Michael Brown', phone: '+14165553003', email: 'mbrown@example.com', dateOfBirth: new Date('1985-03-07') },
					{ name: 'Emily Davis', phone: '+14165553004', email: 'emily.davis@example.com', dateOfBirth: new Date('1994-11-15') },
					{ name: 'David Wilson', phone: '+14165553005', email: 'david.w@example.com', dateOfBirth: new Date('1987-01-28') },
					{ name: 'Jennifer Lee', phone: '+14165553006', email: 'jen.lee@example.com', dateOfBirth: new Date('1991-06-19') },
					{ name: 'Robert Taylor', phone: '+14165553007', email: 'robert.t@example.com', dateOfBirth: new Date('1983-09-30') },
					{ name: 'Lisa Anderson', phone: '+14165553008', email: 'lisa.a@example.com', dateOfBirth: new Date('1996-02-14') },
					{ name: 'James Martinez', phone: '+14165553009', email: 'james.m@example.com', dateOfBirth: new Date('1989-12-05') },
					{ name: 'Mary Garcia', phone: '+14165553010', email: 'mary.garcia@example.com', dateOfBirth: new Date('1993-04-17') },
					{ name: 'William Rodriguez', phone: '+14165553011', email: 'will.r@example.com', dateOfBirth: new Date('1986-07-08') },
					{ name: 'Patricia Hernandez', phone: '+14165553012', email: 'patricia.h@example.com', dateOfBirth: new Date('1990-10-22') },
					{ name: 'Thomas Moore', phone: '+14165553013', email: 'thomas.moore@example.com', dateOfBirth: new Date('1984-01-11') },
					{ name: 'Linda Jackson', phone: '+14165553014', email: 'linda.j@example.com', dateOfBirth: new Date('1995-05-26') },
					{ name: 'Christopher White', phone: '+14165553015', email: 'chris.white@example.com', dateOfBirth: new Date('1988-08-03') },
					{ name: 'Barbara Harris', phone: '+14165553016', email: 'barbara.h@example.com', dateOfBirth: new Date('1992-11-09') },
					{ name: 'Daniel Clark', phone: '+14165553017', email: 'daniel.clark@example.com', dateOfBirth: new Date('1987-02-18') },
					{ name: 'Jessica Lewis', phone: '+14165553018', email: 'jessica.l@example.com', dateOfBirth: new Date('1994-06-27') },
					{ name: 'Matthew Robinson', phone: '+14165553019', email: 'matt.r@example.com', dateOfBirth: new Date('1986-09-14') },
					{ name: 'Nancy Walker', phone: '+14165553020', email: 'nancy.w@example.com', dateOfBirth: new Date('1991-12-31') },
					{ name: 'Anthony Young', phone: '+14165553021', email: 'anthony.y@example.com', dateOfBirth: new Date('1989-03-20') },
					{ name: 'Karen Allen', phone: '+14165553022', email: 'karen.allen@example.com', dateOfBirth: new Date('1993-07-04') },
					{ name: 'Mark King', phone: '+14165553023', email: 'mark.king@example.com', dateOfBirth: new Date('1985-10-16') },
					{ name: 'Betty Wright', phone: '+14165553024', email: 'betty.w@example.com', dateOfBirth: new Date('1997-01-25') },
					{ name: 'Paul Lopez', phone: '+14165553025', email: 'paul.lopez@example.com', dateOfBirth: new Date('1990-04-08') },
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
						
						// Status: past bookings are completed, future are booked
						const isPast = startTime < today;
						const bookingStatus = isPast ? 'COMPLETED' : 'BOOKED';
					
					// Payment status: completed bookings are paid, future are unpaid
					const paymentStatus = isPast ? 'PAID' : 'UNPAID';
					
					// Payment details for completed/paid bookings
					const paymentMethod = isPast ? (Math.random() > 0.5 ? 'CARD' : 'CASH') : null;
					const paidAt = isPast ? endTime : null;
						
						// Random booking source: ONLINE, WALK_IN, or PHONE
						const sources = ['ONLINE', 'WALK_IN', 'PHONE'];
						const bookingSource = sources[Math.floor(Math.random() * sources.length)];
						
						// Created at: random time before start time
						const createdAt = new Date(startTime.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Up to 7 days before
						
					bookingsToCreate.push({
						roomId: room.id,
						userId: null, // Guest bookings have no userId
						customerName: customer.name,
						customerPhone: customer.phone,
						customerEmail: customer.email,
						startTime,
						endTime,
						players,
						price: basePrice,
						bookingStatus,
						paymentStatus,
						paidAt,
						bookingSource: bookingSource,
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

	// ============================================
	// Phase 1.3.5: Seed Orders and Invoices
	// ============================================
	console.log('\n=== Seeding Orders and Invoices ===');

	const TAX_RATE = 0.1; // 10% tax
	const HOURLY_RATE = 50;

	// Get all bookings to seed orders/invoices for
	const allBookings = await prisma.booking.findMany({
		include: { invoices: true },
	});

	console.log(`Found ${allBookings.length} bookings to process for orders/invoices`);

	let invoicesCreated = 0;
	let ordersCreated = 0;

	for (const booking of allBookings) {
		// Skip if invoices already exist for this booking
		if (booking.invoices.length > 0) {
			continue;
		}

		// Create empty invoices for each seat (1 per player)
		// Start at $0, orders will be added later
		const invoicesForBooking = [];

		for (let seatIndex = 1; seatIndex <= booking.players; seatIndex++) {
			const invoice = await prisma.invoice.create({
				data: {
					bookingId: booking.id,
					seatIndex,
					subtotal: 0,
					tax: 0,
					tip: null,
					totalAmount: 0,
					status: booking.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID',
					paymentMethod: booking.paymentStatus === 'PAID' ? (Math.random() > 0.5 ? 'CARD' : 'CASH') : null,
					paidAt: booking.paymentStatus === 'PAID' ? booking.paidAt : null,
				},
			});
			invoicesForBooking.push(invoice);
			invoicesCreated++;
		}

		// 50% chance to add orders (menu items) for completed bookings
		if (booking.bookingStatus === 'COMPLETED' && Math.random() > 0.5) {
			const menuItems = await prisma.menuItem.findMany({
				where: {
					available: true,
					category: { in: ['FOOD', 'DRINKS', 'APPETIZERS', 'DESSERTS'] },
				},
			});

			if (menuItems.length > 0) {
				// Add 1-3 random menu items per seat
				for (const invoice of invoicesForBooking) {
					const itemCount = Math.floor(Math.random() * 3) + 1;
					const selectedItems = menuItems
						.sort(() => Math.random() - 0.5)
						.slice(0, itemCount);

					for (const item of selectedItems) {
						const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 of each item
						const order = await prisma.order.create({
							data: {
								bookingId: booking.id,
								menuItemId: item.id,
								seatIndex: invoice.seatIndex,
								quantity,
								unitPrice: Number(item.price),
								totalPrice: Number(item.price) * quantity,
							},
						});
						ordersCreated++;
					}

					// Recalculate invoice totals with orders (no base price)
					const orders = await prisma.order.findMany({
						where: {
							bookingId: booking.id,
							seatIndex: invoice.seatIndex,
						},
					});

					const orderSubtotal = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
					const newTax = orderSubtotal * TAX_RATE;
					const newTotal = orderSubtotal + newTax;

					await prisma.invoice.update({
						where: { id: invoice.id },
						data: {
							subtotal: orderSubtotal,
							tax: newTax,
							totalAmount: newTotal,
						},
					});
				}
			}
		}
	}

	console.log(`Seeded ${invoicesCreated} invoices and ${ordersCreated} orders`);
}

main()
	.catch((e) => {
		console.error('Seed error', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
