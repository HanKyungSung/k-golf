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

export interface BookingConfirmationParams {
  to: string;
  customerName: string;
  bookingId: string;
  roomName: string;
  date: string; // YYYY-MM-DD
  startTime: Date;
  endTime: Date;
  players: number;
  hours: number;
  price: string;
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

/**
 * Generate ICS calendar file content
 */
function generateICS(params: BookingConfirmationParams): string {
  const { customerName, bookingId, roomName, startTime, endTime, players, hours, price } = params;
  
  // Format dates for ICS (YYYYMMDDTHHMMSSZ)
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const now = new Date();
  const dtstamp = formatICSDate(now);
  const dtstart = formatICSDate(startTime);
  const dtend = formatICSDate(endTime);
  
  // Generate UID
  const uid = `booking-${bookingId}@konegolf.ca`;
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//K one Golf//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:K one Golf - ${roomName}`,
    `DESCRIPTION:Your screen golf booking at K one Golf\\n\\nRoom: ${roomName}\\nPlayers: ${players}\\nDuration: ${hours} hour${hours > 1 ? 's' : ''}\\nPrice: $${price}\\n\\nBooking ID: ${bookingId}\\n\\nAddress: 5 Keltic Dr #6\\, Sydney\\, NS\\nPhone: (902) 270-2259`,
    'LOCATION:K one Golf\\, 5 Keltic Dr #6\\, Sydney\\, NS',
    `ORGANIZER;CN=K one Golf:mailto:${process.env.EMAIL_FROM || 'no-reply@konegolf.ca'}`,
    `ATTENDEE;CN=${customerName};RSVP=TRUE:mailto:${params.to}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:K one Golf booking in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

/**
 * Generate HTML for booking confirmation email
 */
function generateBookingConfirmationHTML(params: BookingConfirmationParams): string {
  const { customerName, roomName, date, startTime, endTime, players, hours, price } = params;
  
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - K one Golf</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">K ONE GOLF</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Premium Screen Golf</p>
    </div>
    
    <!-- Confirmation Content -->
    <div style="background: white; padding: 32px 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Success Message -->
      <div style="text-align: center; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9;">
        <table style="width: 64px; height: 64px; margin: 0 auto 16px; background: #dcfce7; border-radius: 50%;">
          <tr>
            <td style="text-align: center; vertical-align: middle;">
              <span style="font-size: 32px; line-height: 1; color: #15803d;">✓</span>
            </td>
          </tr>
        </table>
        <h2 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">Booking Confirmed!</h2>
        <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">We're excited to see you, ${customerName}!</p>
      </div>
      
      <!-- Booking Details -->
      <div style="padding: 24px 0;">
        <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px; font-weight: 600;">Booking Details</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 16px; background: #f8fafc; border-radius: 8px 0 0 0;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Room</p>
              <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 600;">${roomName}</p>
            </td>
            <td style="padding: 12px 16px; background: #f8fafc; border-radius: 0 8px 0 0;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Players</p>
              <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 600;">${players}</p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 12px 16px; background: #f8fafc;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
              <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 600;">${formatDate(date)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; background: #f8fafc; border-radius: 0 0 0 8px;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time</p>
              <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 600;">${formatTime(startTime)} - ${formatTime(endTime)}</p>
            </td>
            <td style="padding: 12px 16px; background: #f8fafc; border-radius: 0 0 8px 0;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Duration</p>
              <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 16px; font-weight: 600;">${hours} hour${hours > 1 ? 's' : ''}</p>
            </td>
          </tr>
        </table>
        
        <!-- Price -->
        <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #78350f; font-size: 14px; font-weight: 600;">Total Amount</p>
          <p style="margin: 4px 0 0 0; color: #78350f; font-size: 32px; font-weight: 700;">$${price}</p>
          <p style="margin: 4px 0 0 0; color: #92400e; font-size: 12px;">Payment due at the venue</p>
        </div>
      </div>
      
      <!-- Location -->
      <div style="padding: 20px 0; border-top: 1px solid #f1f5f9;">
        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 600;">📍 Location</h3>
        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
          <strong>K one Golf</strong><br>
          5 Keltic Dr #6<br>
          Sydney, NS<br>
          Phone: (902) 270-2259
        </p>
        <p style="margin: 12px 0 0 0;">
          <a href="https://maps.google.com/?q=5+Keltic+Dr+6+Sydney+NS" style="color: #f59e0b; text-decoration: none; font-weight: 600; font-size: 14px;">Get Directions →</a>
        </p>
      </div>
      
      <!-- Calendar Attachment Info -->
      <div style="padding: 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-top: 20px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          <strong>📅 Add to Calendar</strong>
        </p>
        <p style="margin: 4px 0 0 0; color: #3b82f6; font-size: 13px;">
          A calendar file (.ics) is attached. Click it to add this booking to your calendar app.
        </p>
      </div>
      
      <!-- Manage Booking -->
      <div style="margin-top: 24px; text-align: center;">
        <a href="${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/dashboard" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">View My Bookings</a>
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Questions? Contact us at (902) 270-2259 or visit our website
        </p>
        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">
          Hours: 10:00 AM - 12:00 AM Daily
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send booking confirmation email with ICS calendar attachment
 */
export async function sendBookingConfirmation(params: BookingConfirmationParams) {
  const subject = `Booking Confirmed - K one Golf`;
  const html = generateBookingConfirmationHTML(params);
  const icsContent = generateICS(params);
  
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const text = `
K one Golf - Booking Confirmation

Hi ${params.customerName},

Your booking has been confirmed!

Booking Details:
- Room: ${params.roomName}
- Date: ${params.date}
- Time: ${formatTime(params.startTime)} - ${formatTime(params.endTime)}
- Players: ${params.players}
- Duration: ${params.hours} hour${params.hours > 1 ? 's' : ''}
- Total: $${params.price}

Location:
K one Golf
5 Keltic Dr #6
Sydney, NS
Phone: (902) 270-2259

A calendar file is attached to help you add this booking to your calendar.

See you soon!

---
K one Golf - Premium Screen Golf
Hours: 10:00 AM - 12:00 AM Daily
  `.trim();

  const transport = getTransport();
  if (!transport) {
    console.log(`[email:dev-log] Booking confirmation to=${params.to}`);
    console.log(text);
    console.log('ICS file would be attached');
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'K one Golf <no-reply@konegolf.ca>',
    to: params.to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'booking.ics',
        content: icsContent,
        contentType: 'text/calendar; charset=utf-8; method=REQUEST'
      }
    ]
  });
}

