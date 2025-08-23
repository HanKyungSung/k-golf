import { hashPassword, verifyPassword } from '../src/services/authService';

async function main() {
  const pw = 'CorrectHorseBatteryStaple1';
  const wrong = 'CorrectHorseBatteryStaple2';
  const hash = await hashPassword(pw);
  const ok1 = await verifyPassword(pw, hash);
  const ok2 = await verifyPassword(wrong, hash);
  console.log(JSON.stringify({ hash, ok1, ok2 }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
