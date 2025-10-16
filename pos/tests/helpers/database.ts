import { PrismaClient, UserRole, RoomStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Prisma client for test database
 * Hardcoded to use k_golf_test database (from docker-compose.yml credentials)
 */
const TEST_DATABASE_URL = 'postgresql://kgolf:kgolf_password@localhost:5432/k_golf_test';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

/**
 * Reset database to clean state
 * Deletes all test data in correct order (respecting foreign keys)
 */
export async function resetDatabase() {
  console.log('🧹 Resetting test database...');
  
  await prisma.$transaction([
    // Delete in reverse FK dependency order
    prisma.booking.deleteMany(),
    prisma.user.deleteMany({ where: { role: UserRole.CUSTOMER } }),
    prisma.room.deleteMany(),
    prisma.setting.deleteMany(),
  ]);
  
  console.log('✅ Database reset complete');
}

/**
 * Seed database with test data
 * Creates admin user and test rooms
 */
export async function seedTestData() {
  console.log('🌱 Seeding test database...');
  
  // Create admin user (same as in seed.ts)
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kgolf.com' },
    update: {},
    create: {
      email: 'admin@kgolf.com',
      name: 'Admin User',
      phone: '+14165551000',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  
  console.log(`✅ Admin user: ${admin.email} / ${admin.phone}`);
  
  // Create test rooms
  const rooms = [];
  for (let i = 1; i <= 4; i++) {
    const room = await prisma.room.upsert({
      where: { name: `Room ${i}` },
      update: { status: RoomStatus.ACTIVE },
      create: {
        name: `Room ${i}`,
        capacity: 4,
        status: RoomStatus.ACTIVE,
        openMinutes: 540,  // 9:00 AM
        closeMinutes: 1140, // 7:00 PM
      },
    });
    rooms.push(room);
  }
  
  console.log(`✅ Created ${rooms.length} test rooms`);
  
  // Create global settings
  await prisma.setting.upsert({
    where: { key: 'global_tax_rate' },
    update: {},
    create: {
      key: 'global_tax_rate',
      value: '0.08',
      valueType: 'decimal',
      description: 'Global tax rate (8%)',
      category: 'tax',
      isPublic: false,
      updatedBy: admin.id,
    },
  });
  
  console.log('✅ Test data seeding complete');
  
  return {
    admin,
    rooms,
  };
}

/**
 * Initialize test database
 * Call this before running test suite
 */
export async function initializeTestDatabase() {
  await resetDatabase();
  return await seedTestData();
}

/**
 * Cleanup and disconnect
 * Call this after test suite completes
 */
export async function cleanupDatabase() {
  await prisma.$disconnect();
}

/**
 * Get Prisma client for direct database operations in tests
 */
export function getTestPrisma() {
  return prisma;
}

/**
 * Create a test customer for use in tests
 */
export async function createTestCustomer(data: {
  name: string;
  phone: string;
  email?: string;
  registeredBy: string;
}) {
  const customer = await prisma.user.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      role: UserRole.CUSTOMER,
      registrationSource: 'WALK_IN',
      registeredBy: data.registeredBy,
      passwordHash: null,
    },
  });
  
  return customer;
}

export default prisma;
