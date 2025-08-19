import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const rooms = [
		{ name: 'Suite A', capacity: 4 },
		{ name: 'Suite B', capacity: 4 },
		{ name: 'VIP Lounge', capacity: 6 },
	];

	for (const r of rooms) {
		await prisma.room.upsert({
			where: { name: r.name },
			update: { capacity: r.capacity },
			create: { name: r.name, capacity: r.capacity },
		});
	}
	console.log('Seed complete: rooms ensured');
}

main()
	.catch((e) => {
		console.error('Seed error', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
