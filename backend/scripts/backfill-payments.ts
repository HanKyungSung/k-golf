import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const paidInvoices = await prisma.invoice.findMany({
    where: { status: 'PAID', paymentMethod: { not: null } },
    include: { payments: true },
  });

  // Check existing payment count first
  const existingPayments = await prisma.payment.count();
  console.log('Existing Payment records:', existingPayments);

  const toBackfill = paidInvoices.filter((inv) => inv.payments.length === 0);
  console.log('Paid invoices:', paidInvoices.length, '| Need backfill:', toBackfill.length);

  let created = 0;
  for (const inv of toBackfill) {
    await prisma.payment.create({
      data: {
        invoiceId: inv.id,
        method: inv.paymentMethod as string,
        amount: inv.totalAmount,
      },
    });
    created++;
  }

  const totalAfter = await prisma.payment.count();
  console.log('Created', created, 'Payment records | Total now:', totalAfter);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
