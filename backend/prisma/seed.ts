import { PrismaClient } from '@prisma/client';

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
}

main()
	.catch((e) => {
		console.error('Seed error', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
