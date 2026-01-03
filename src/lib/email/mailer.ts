/**
 * Email Transport
 *
 * Set EMAIL_DRY_RUN=true to log emails instead of sending (for testing)
 *
 * For production, configure:
 *   SMTP_HOST=mail.yourdomain.com
 *   SMTP_PORT=587
 *   SMTP_USER=releases@yourdomain.com
 *   SMTP_PASS=your-password
 *   EMAIL_FROM=Enchanted Park Pickups <releases@yourdomain.com>
 */

import nodemailer from 'nodemailer';

const DRY_RUN = !process.env.SMTP_HOST || process.env.EMAIL_DRY_RUN === 'true';

const transporter = DRY_RUN ? null : nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Enchanted Park Pickups <noreply@localhost>';

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (DRY_RUN) {
    console.log('═'.repeat(60));
    console.log('📧 EMAIL (dry run - not sent)');
    console.log('═'.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('─'.repeat(60));
    console.log(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
    console.log('═'.repeat(60));
    return;
  }

  await transporter!.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
}
