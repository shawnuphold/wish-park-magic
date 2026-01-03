/**
 * Verification Code Email Template
 * Used for customer portal login verification
 */

export function generateVerificationEmailHtml({
  code,
  requestId,
}: {
  code: string;
  requestId: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #fbbf24; font-size: 24px; font-weight: 700;">
                Enchanted Park Pickups
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 20px; font-weight: 600;">
                Your Verification Code
              </h2>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.6;">
                Use the code below to access your request status. This code expires in 10 minutes.
              </p>

              <!-- Code Box -->
              <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">
                <strong>Request ID:</strong> ${requestId.slice(0, 8)}...
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

              <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email.
                Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Enchanted Park Pickups
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateVerificationEmailText({
  code,
  requestId,
}: {
  code: string;
  requestId: string;
}): string {
  return `
ENCHANTED PARK PICKUPS
======================

Your Verification Code: ${code}

Use this code to access your request status.
This code expires in 10 minutes.

Request ID: ${requestId.slice(0, 8)}...

If you didn't request this code, you can safely ignore this email.

---
© ${new Date().getFullYear()} Enchanted Park Pickups
  `.trim();
}
