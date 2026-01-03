/**
 * Invoice Email Templates
 *
 * Email templates for sending invoice links to customers.
 */

interface InvoiceEmailData {
  customerName: string;
  invoiceNumber: string;
  total: number;
  invoiceUrl: string;
  dueDate?: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

export function generateInvoiceSubject(invoiceNumber: string): string {
  return `Invoice ${invoiceNumber} from Enchanted Park Pickups`;
}

export function generateInvoiceEmailHtml(data: InvoiceEmailData): string {
  const itemsHtml = data.items
    .map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `)
    .join('');

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
      <p style="font-size: 16px; color: #333;">Hi ${data.customerName},</p>

      <p style="font-size: 16px; color: #333;">
        Your invoice <strong>${data.invoiceNumber}</strong> is ready for payment.
      </p>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f8f8f8;">
            <th style="padding: 10px; text-align: left; font-weight: 600;">Item</th>
            <th style="padding: 10px; text-align: center; font-weight: 600;">Qty</th>
            <th style="padding: 10px; text-align: right; font-weight: 600;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px 8px; text-align: right; font-weight: 600; font-size: 18px;">Total:</td>
            <td style="padding: 12px 8px; text-align: right; font-weight: 600; font-size: 18px; color: #d4a850;">$${data.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${data.dueDate ? `<p style="color: #666; font-size: 14px;">Due by: ${data.dueDate}</p>` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.invoiceUrl}" style="display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View & Pay Invoice
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        You can pay securely online using PayPal or credit card.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8f8f8; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">Enchanted Park Pickups</p>
      <p style="margin: 5px 0;">Your personal shoppers at Disney, Universal, and SeaWorld</p>
      <p style="margin: 10px 0 0;">
        <a href="https://enchantedparkpickups.com" style="color: #d4a850;">enchantedparkpickups.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateInvoiceEmailText(data: InvoiceEmailData): string {
  const itemsList = data.items
    .map(item => `  - ${item.name} x${item.quantity}: $${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');

  return `
Hi ${data.customerName},

Your invoice ${data.invoiceNumber} is ready for payment.

Items:
${itemsList}

Total: $${data.total.toFixed(2)}
${data.dueDate ? `Due by: ${data.dueDate}` : ''}

View and pay your invoice here:
${data.invoiceUrl}

Thank you for choosing Enchanted Park Pickups!

--
Enchanted Park Pickups
Your personal shoppers at Disney, Universal, and SeaWorld
https://enchantedparkpickups.com
  `.trim();
}
