/**
 * SMS Notifications via Twilio
 *
 * Infrastructure for sending SMS notifications to customers.
 *
 * DISABLED BY DEFAULT - Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to enable.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const isEnabled = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

/**
 * Send an SMS message
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isEnabled) {
    console.log(`[SMS] Would send to ${to} (Twilio not configured): ${message.slice(0, 50)}...`);
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Format phone number (ensure it has country code)
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number' };
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER!,
          Body: message,
        }).toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[SMS] Twilio error:', error);
      return { success: false, error: error.message };
    }

    const result = await response.json();
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('[SMS] Failed to send:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string | null {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // US number without country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Already has country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // International number
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return null;
}

/**
 * SMS message templates
 */
export const SMSTemplates = {
  invoiceReady: (invoiceNumber: string, amount: number, url: string) =>
    `Enchanted Park Pickups: Your invoice ${invoiceNumber} for $${amount.toFixed(2)} is ready! View & pay: ${url}`,

  orderShipped: (trackingNumber: string, carrier: string) =>
    `Enchanted Park Pickups: Your order has shipped! Tracking: ${trackingNumber} (${carrier.toUpperCase()})`,

  orderDelivered: () =>
    `Enchanted Park Pickups: Your order has been delivered! Enjoy your magical treasures! ✨`,

  newRelease: (itemName: string) =>
    `Enchanted Park Pickups: New item alert! "${itemName}" just dropped. Check it out before it sells out!`,
};

/**
 * Check if SMS is enabled
 */
export function isSMSEnabled(): boolean {
  return isEnabled;
}
