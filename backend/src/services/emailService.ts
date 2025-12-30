import nodemailer from 'nodemailer';
import type { ReceiptData } from '../repositories/receiptRepo';

export interface VerificationEmailParams {
  to: string;
  token: string;
  expiresAt: Date;
  email: string; // explicit duplicate
}

export interface ReceiptEmailParams {
  to: string;
  receipt: ReceiptData;
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('[email] Missing GMAIL_USER/GMAIL_APP_PASSWORD; logging emails only.');
    return null;
  }
  cachedTransport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  return cachedTransport;
}

export async function sendVerificationEmail({ to, token, expiresAt, email }: VerificationEmailParams) {
  // Always point verification links to the FRONTEND app
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  // Frontend page will handle POST /api/auth/verify
  const link = `${origin.replace(/\/$/, '')}/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const subject = 'Your K one Golf sign-in link';
  const text = `Sign in: ${link}\n\nExpires: ${expiresAt.toISOString()}\nIf you did not request this, ignore.`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif"><h2>K one Golf Sign-In</h2><p>Click the button below to sign in. Expires in 15 minutes.</p><p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify & Sign In</a></p><p style="font-size:12px;color:#555">If the button doesn't work, use this URL:<br>${link}</p></body></html>`;
  const transport = getTransport();
  if (!transport) {
    console.log(`[email:dev-log] to=${to} token=${token} link=${link}`);
    return;
  }
  await transport.sendMail({ from: process.env.EMAIL_FROM || 'K one Golf <no-reply@konegolf.ca>', to, subject, text, html });
}

/**
 * Generate HTML for receipt email
 */
function generateReceiptHTML(receipt: ReceiptData): string {
  const seatRows = receipt.items.seats
    .map(
      (seat) => `
        <tr>
          <td colspan="3" style="padding: 12px 0 4px 0; font-weight: 600; color: #334155; border-top: 1px solid #e2e8f0;">
            Seat ${seat.seatIndex}
          </td>
        </tr>
        ${seat.orders
          .map(
            (order) => `
          <tr>
            <td style="padding: 4px 8px; color: #475569;">${order.name}</td>
            <td style="padding: 4px 8px; text-align: center; color: #475569;">×${order.quantity}</td>
            <td style="padding: 4px 8px; text-align: right; color: #475569;">$${order.total.toFixed(2)}</td>
          </tr>
        `
          )
          .join('')}
      `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K one Golf Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">K ONE GOLF</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Premium Screen Golf</p>
    </div>
    
    <!-- Receipt Content -->
    <div style="background: white; padding: 32px 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Receipt Number -->
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9;">
        <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Receipt</p>
        <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 20px; font-weight: 600;">${receipt.receiptNumber}</p>
      </div>
      
      <!-- Customer Info -->
      <div style="padding: 20px 0; border-bottom: 1px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Customer:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 500;">${receipt.customer.name}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Phone:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 500;">${receipt.customer.phone}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Date:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 500;">${receipt.booking.date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-size: 13px;">Time:</td>
            <td style="padding: 4px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: 500;">${receipt.booking.startTime} - ${receipt.booking.endTime}</td>
          </tr>
        </table>
      </div>
      
      <!-- Items -->
      <div style="padding: 20px 0;">
        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 600;">Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${receipt.items.roomCharge.total > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #475569; font-weight: 500;">${receipt.items.roomCharge.description}</td>
            <td style="padding: 8px 0; text-align: center; color: #475569;">×${receipt.items.roomCharge.quantity}</td>
            <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">$${receipt.items.roomCharge.total.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${seatRows}
        </table>
      </div>
      
      <!-- Totals -->
      <div style="padding: 20px 0; border-top: 2px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Subtotal:</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 500;">$${receipt.totals.subtotal}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Tax (${receipt.totals.taxRate}%):</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 500;">$${receipt.totals.tax}</td>
          </tr>
          ${parseFloat(receipt.totals.tip) > 0 ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Tip:</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 500;">$${receipt.totals.tip}</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding: 12px 0 0 0; color: #0f172a; font-size: 18px; font-weight: 700;">Total:</td>
            <td style="padding: 12px 0 0 0; text-align: right; color: #f59e0b; font-size: 18px; font-weight: 700;">$${receipt.totals.grandTotal}</td>
          </tr>
        </table>
      </div>
      
      <!-- Payment Status -->
      <div style="padding: 16px; background: ${receipt.payment.status === 'PAID' ? '#dcfce7' : '#fef3c7'}; border-radius: 8px; text-align: center; margin-top: 20px;">
        <p style="margin: 0; color: ${receipt.payment.status === 'PAID' ? '#15803d' : '#a16207'}; font-size: 14px; font-weight: 600;">
          ${receipt.payment.status === 'PAID' ? '✓ PAID' : receipt.payment.status === 'PARTIAL' ? '◐ PARTIALLY PAID' : '○ UNPAID'}
        </p>
        ${receipt.payment.method ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Payment Method: ${receipt.payment.method}</p>` : ''}
      </div>
      
      <!-- Sign-Up CTA -->
      <div style="margin-top: 24px; padding: 24px; background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: white; font-size: 18px; font-weight: 700;">📱 Book Faster Next Time!</p>
        <p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.95); font-size: 14px;">Create a free account to view your booking history and enjoy a streamlined booking experience.</p>
        <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/signup" style="display: inline-block; padding: 12px 32px; background: white; color: #f59e0b; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Create Free Account</a>
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 600;">${receipt.business.name}</p>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">${receipt.business.address}</p>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">${receipt.business.phone}</p>
        <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 11px;">Thank you for choosing K one Golf!</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send receipt to customer via email
 */
export async function sendReceiptEmail({ to, receipt }: ReceiptEmailParams) {
  const subject = `K one Golf Receipt - ${receipt.receiptNumber}`;
  const html = generateReceiptHTML(receipt);
  const text = `
K one Golf Receipt
${receipt.receiptNumber}

Customer: ${receipt.customer.name}
Date: ${receipt.booking.date}
Time: ${receipt.booking.startTime} - ${receipt.booking.endTime}

${receipt.items.roomCharge.total > 0 ? `Room Charge: $${receipt.items.roomCharge.total.toFixed(2)}\n` : ''}
${receipt.items.seats.map((seat) => `
Seat ${seat.seatIndex}:
${seat.orders.map((order) => `  ${order.name} ×${order.quantity} - $${order.total.toFixed(2)}`).join('\n')}
`).join('\n')}

Subtotal: $${receipt.totals.subtotal}
Tax (${receipt.totals.taxRate}%): $${receipt.totals.tax}
${parseFloat(receipt.totals.tip) > 0 ? `Tip: $${receipt.totals.tip}\n` : ''}
Total: $${receipt.totals.grandTotal}

Payment Status: ${receipt.payment.status}
${receipt.payment.method ? `Payment Method: ${receipt.payment.method}` : ''}

Thank you for choosing K-Golf!
${receipt.business.name}
${receipt.business.address}
${receipt.business.phone}
  `.trim();

  const transport = getTransport();
  if (!transport) {
    console.log(`[email:dev-log] Receipt email to=${to} receipt=${receipt.receiptNumber}`);
    console.log(text);
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'K one Golf <no-reply@konegolf.ca>',
    to,
    subject,
    text,
    html,
  });
}
