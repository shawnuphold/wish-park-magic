/**
 * Shipping Notification Email Templates
 *
 * Email templates for shipping updates.
 */

interface ShippingEmailData {
  customerName: string;
  trackingNumber: string;
  carrier: 'usps' | 'ups' | 'fedex';
  trackingUrl: string;
  estimatedDelivery?: string;
  items?: string[];
}

const carrierNames: Record<string, string> = {
  usps: 'USPS',
  ups: 'UPS',
  fedex: 'FedEx',
};

export function generateShippingSubject(carrier: string, trackingNumber: string): string {
  return `Your order has shipped! Tracking #${trackingNumber}`;
}

export function generateShippingEmailHtml(data: ShippingEmailData): string {
  const carrierName = carrierNames[data.carrier] || data.carrier.toUpperCase();

  const itemsHtml = data.items?.length
    ? `
      <div style="background: #f8f8f8; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px; font-size: 14px; color: #666;">Items in this shipment:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #333;">
          ${data.items.map(item => `<li style="margin: 5px 0;">${item}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #4a1d6a 100%); padding: 30px; text-align: center;">
      <h1 style="color: #d4a850; margin: 0; font-size: 24px;">✨ Enchanted Park Pickups</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 48px;">📦</span>
      </div>

      <h2 style="text-align: center; color: #333; margin: 0 0 20px;">Your Order Has Shipped!</h2>

      <p style="font-size: 16px; color: #333;">Hi ${data.customerName},</p>

      <p style="font-size: 16px; color: #333;">
        Great news! Your magical items are on their way to you.
      </p>

      <!-- Tracking Info -->
      <div style="background: #f0f7ff; border: 1px solid #d0e3f7; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #666; padding: 5px 0;">Carrier:</td>
            <td style="font-weight: 600; color: #333; padding: 5px 0;">${carrierName}</td>
          </tr>
          <tr>
            <td style="color: #666; padding: 5px 0;">Tracking Number:</td>
            <td style="font-family: monospace; font-weight: 600; color: #333; padding: 5px 0;">${data.trackingNumber}</td>
          </tr>
          ${data.estimatedDelivery ? `
          <tr>
            <td style="color: #666; padding: 5px 0;">Estimated Delivery:</td>
            <td style="font-weight: 600; color: #22c55e; padding: 5px 0;">${data.estimatedDelivery}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${itemsHtml}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.trackingUrl}" style="display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Track Your Package
        </a>
      </div>

      <p style="color: #666; font-size: 14px; text-align: center;">
        Click the button above to see real-time tracking updates.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">Thank you for choosing Enchanted Park Pickups!</p>
      <p style="margin: 10px 0 0;">
        <a href="https://enchantedparkpickups.com" style="color: #d4a850;">enchantedparkpickups.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateShippingEmailText(data: ShippingEmailData): string {
  const carrierName = carrierNames[data.carrier] || data.carrier.toUpperCase();
  const itemsList = data.items?.length
    ? `\nItems in this shipment:\n${data.items.map(item => `  - ${item}`).join('\n')}\n`
    : '';

  return `
Hi ${data.customerName},

Great news! Your order has shipped.

Carrier: ${carrierName}
Tracking Number: ${data.trackingNumber}
${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ''}
${itemsList}
Track your package here:
${data.trackingUrl}

Thank you for choosing Enchanted Park Pickups!

--
Enchanted Park Pickups
https://enchantedparkpickups.com
  `.trim();
}

// Delivery notification
export function generateDeliverySubject(): string {
  return `Your order has been delivered! 🎉`;
}

export function generateDeliveryEmailHtml(data: { customerName: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #4a1d6a 100%); padding: 30px; text-align: center;">
      <h1 style="color: #d4a850; margin: 0; font-size: 24px;">✨ Enchanted Park Pickups</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px; text-align: center;">
      <span style="font-size: 64px;">🎉</span>
      <h2 style="color: #22c55e; margin: 20px 0;">Your Order Has Been Delivered!</h2>

      <p style="font-size: 16px; color: #333;">
        Hi ${data.customerName}, your magical items have arrived!
      </p>

      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        We hope you love your new treasures. If you have any questions or concerns,
        please don't hesitate to reach out.
      </p>

      <div style="margin-top: 30px; padding: 20px; background: #f8f8f8; border-radius: 8px;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          Loved your experience? Tell your friends about us! ✨
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">Thank you for choosing Enchanted Park Pickups!</p>
      <p style="margin: 10px 0 0;">
        <a href="https://enchantedparkpickups.com" style="color: #d4a850;">enchantedparkpickups.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateDeliveryEmailText(data: { customerName: string }): string {
  return `
Hi ${data.customerName},

🎉 Your order has been delivered!

We hope you love your new treasures. If you have any questions or concerns,
please don't hesitate to reach out.

Thank you for choosing Enchanted Park Pickups!

--
Enchanted Park Pickups
https://enchantedparkpickups.com
  `.trim();
}
