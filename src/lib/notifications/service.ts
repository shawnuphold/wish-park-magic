/**
 * Notification Service
 *
 * Sends email and SMS notifications using database-stored templates.
 * Supports variable substitution and logging.
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { createLogger } from '@/lib/logger';

const log = createLogger('NotificationService');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export interface NotificationData {
  // Customer info
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;

  // Invoice data
  invoice_number?: string;
  total_amount?: string;
  items_list?: string;
  items_list_text?: string;
  invoice_url?: string;
  invoice_id?: string;
  due_date?: string;

  // Shipping data
  tracking_number?: string;
  carrier?: string;
  tracking_url?: string;
  shipment_id?: string;

  // New release data
  item_name?: string;
  item_description?: string;
  item_price?: string;
  park?: string;
  image_url?: string;
  request_url?: string;
  unsubscribe_url?: string;
  release_id?: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string | null;
  sms_enabled: boolean;
  sms_from_name: string;
  send_invoice_notifications: boolean;
  send_shipping_notifications: boolean;
  send_delivery_notifications: boolean;
  send_new_release_notifications: boolean;
}

interface NotificationTemplate {
  id: string;
  type: 'email' | 'sms';
  trigger: string;
  name: string;
  email_subject?: string;
  email_html?: string;
  email_text?: string;
  sms_body?: string;
  enabled: boolean;
}

/**
 * Get notification settings from database
 */
async function getSettings(): Promise<NotificationSettings | null> {
  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .single();

  return data;
}

/**
 * Get a notification template by type and trigger
 */
async function getTemplate(
  type: 'email' | 'sms',
  trigger: string
): Promise<NotificationTemplate | null> {
  const { data } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('type', type)
    .eq('trigger', trigger)
    .single();

  return data;
}

/**
 * Replace template variables with actual values
 */
function replaceVariables(template: string, data: NotificationData): string {
  let result = template;

  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
  }

  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, content) => {
    return data[variable as keyof NotificationData] ? content : '';
  });

  return result;
}

/**
 * Log notification to database
 */
async function logNotification(params: {
  template_id?: string;
  customer_id?: string;
  recipient: string;
  type: 'email' | 'sms';
  subject?: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  external_id?: string;
  invoice_id?: string;
  shipment_id?: string;
  release_id?: string;
}) {
  await supabase.from('notification_log').insert({
    template_id: params.template_id,
    customer_id: params.customer_id,
    recipient: params.recipient,
    type: params.type,
    subject: params.subject,
    body: params.body,
    status: params.status,
    error_message: params.error_message,
    external_id: params.external_id,
    invoice_id: params.invoice_id,
    shipment_id: params.shipment_id,
    release_id: params.release_id,
    sent_at: params.status === 'sent' ? new Date().toISOString() : null,
  });
}

/**
 * Send an email using nodemailer
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    log.info('SMTP not configured, would send email', { subject: params.subject });
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const result = await transporter.sendMail({
      from: `"${params.fromName}" <${params.fromAddress}>`,
      replyTo: params.replyTo || params.fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    log.error('Failed to send email', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send an SMS using Twilio
 */
async function sendSMS(params: {
  to: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    log.info('Twilio not configured, would send SMS', { body: params.body.slice(0, 50) });
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Format phone number
    const digits = params.to.replace(/\D/g, '');
    let formattedPhone: string;

    if (digits.length === 10) {
      formattedPhone = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      formattedPhone = `+${digits}`;
    } else if (digits.length > 10) {
      formattedPhone = `+${digits}`;
    } else {
      return { success: false, error: 'Invalid phone number' };
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          Body: params.body,
        }).toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    const result = await response.json();
    return { success: true, messageId: result.sid };
  } catch (error) {
    log.error('Failed to send SMS', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a notification using a database template
 */
export async function sendNotification(
  trigger: string,
  data: NotificationData,
  options?: {
    emailOnly?: boolean;
    smsOnly?: boolean;
    forceEmail?: string; // Override recipient
    forcePhone?: string;
  }
): Promise<{ email?: { success: boolean; error?: string }; sms?: { success: boolean; error?: string } }> {
  const settings = await getSettings();
  if (!settings) {
    log.error('No notification settings found');
    return { email: { success: false, error: 'No settings' }, sms: { success: false, error: 'No settings' } };
  }

  const results: { email?: { success: boolean; error?: string }; sms?: { success: boolean; error?: string } } = {};

  // Check if this trigger type is enabled
  const triggerEnabled = {
    invoice_ready: settings.send_invoice_notifications,
    order_shipped: settings.send_shipping_notifications,
    order_delivered: settings.send_delivery_notifications,
    new_release: settings.send_new_release_notifications,
  }[trigger] ?? true;

  if (!triggerEnabled) {
    log.debug(`Trigger disabled in settings`, { trigger });
    return { email: { success: false, error: 'Trigger disabled' }, sms: { success: false, error: 'Trigger disabled' } };
  }

  // Send email notification
  if (!options?.smsOnly && settings.email_enabled) {
    const emailTemplate = await getTemplate('email', trigger);

    if (emailTemplate && emailTemplate.enabled) {
      const recipient = options?.forceEmail || data.customer_email;

      if (recipient) {
        const subject = replaceVariables(emailTemplate.email_subject || '', data);
        const html = replaceVariables(emailTemplate.email_html || '', data);
        const text = replaceVariables(emailTemplate.email_text || '', data);

        const emailResult = await sendEmail({
          to: recipient,
          subject,
          html,
          text,
          fromName: settings.email_from_name,
          fromAddress: settings.email_from_address,
          replyTo: settings.email_reply_to || undefined,
        });

        await logNotification({
          template_id: emailTemplate.id,
          customer_id: data.customer_id,
          recipient,
          type: 'email',
          subject,
          body: text,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.error,
          external_id: emailResult.messageId,
          invoice_id: data.invoice_id,
          shipment_id: data.shipment_id,
          release_id: data.release_id,
        });

        results.email = emailResult;
      } else {
        results.email = { success: false, error: 'No email address' };
      }
    } else {
      results.email = { success: false, error: 'Template not found or disabled' };
    }
  }

  // Send SMS notification
  if (!options?.emailOnly && settings.sms_enabled) {
    const smsTemplate = await getTemplate('sms', trigger);

    if (smsTemplate && smsTemplate.enabled) {
      const recipient = options?.forcePhone || data.customer_phone;

      if (recipient) {
        const body = replaceVariables(smsTemplate.sms_body || '', data);

        const smsResult = await sendSMS({
          to: recipient,
          body,
        });

        await logNotification({
          template_id: smsTemplate.id,
          customer_id: data.customer_id,
          recipient,
          type: 'sms',
          body,
          status: smsResult.success ? 'sent' : 'failed',
          error_message: smsResult.error,
          external_id: smsResult.messageId,
          invoice_id: data.invoice_id,
          shipment_id: data.shipment_id,
          release_id: data.release_id,
        });

        results.sms = smsResult;
      } else {
        results.sms = { success: false, error: 'No phone number' };
      }
    } else {
      results.sms = { success: false, error: 'Template not found or disabled' };
    }
  }

  return results;
}

/**
 * Send a test notification with sample data
 */
export async function sendTestNotification(
  templateId: string,
  recipient: string
): Promise<{ success: boolean; error?: string }> {
  // Get the template
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  const settings = await getSettings();
  if (!settings) {
    return { success: false, error: 'No settings found' };
  }

  // Sample data for testing
  const sampleData: NotificationData = {
    customer_name: 'Test Customer',
    invoice_number: 'INV-99999',
    total_amount: '127.50',
    items_list: '<ul><li>Mickey Spirit Jersey - $79.99</li><li>Loungefly Mini Backpack - $85.00</li></ul>',
    items_list_text: '- Mickey Spirit Jersey - $79.99\n- Loungefly Mini Backpack - $85.00',
    invoice_url: 'https://enchantedparkpickups.com/invoice/test',
    tracking_number: '9400111899223847563012',
    carrier: 'USPS',
    tracking_url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223847563012',
    item_name: 'Figment Popcorn Bucket',
    item_description: 'Limited edition Figment-shaped popcorn bucket from EPCOT Festival of the Arts',
    item_price: '35.00',
    park: 'Disney World - EPCOT',
    image_url: 'https://example.com/figment.jpg',
    request_url: 'https://enchantedparkpickups.com/new-releases?request=test',
    unsubscribe_url: 'https://enchantedparkpickups.com/unsubscribe?id=test',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  };

  if (template.type === 'email') {
    const subject = replaceVariables(template.email_subject || '', sampleData);
    const html = replaceVariables(template.email_html || '', sampleData);
    const text = replaceVariables(template.email_text || '', sampleData);

    const result = await sendEmail({
      to: recipient,
      subject: `[TEST] ${subject}`,
      html,
      text,
      fromName: settings.email_from_name,
      fromAddress: settings.email_from_address,
      replyTo: settings.email_reply_to || undefined,
    });

    await logNotification({
      template_id: template.id,
      recipient,
      type: 'email',
      subject: `[TEST] ${subject}`,
      body: text,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      external_id: result.messageId,
    });

    return result;
  } else {
    const body = replaceVariables(template.sms_body || '', sampleData);

    const result = await sendSMS({
      to: recipient,
      body: `[TEST] ${body}`,
    });

    await logNotification({
      template_id: template.id,
      recipient,
      type: 'sms',
      body: `[TEST] ${body}`,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      external_id: result.messageId,
    });

    return result;
  }
}

/**
 * Check if notifications are configured
 */
export async function getNotificationStatus(): Promise<{
  email: { configured: boolean; enabled: boolean };
  sms: { configured: boolean; enabled: boolean };
}> {
  const settings = await getSettings();

  return {
    email: {
      configured: !!(SMTP_HOST && SMTP_USER && SMTP_PASS),
      enabled: settings?.email_enabled ?? false,
    },
    sms: {
      configured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER),
      enabled: settings?.sms_enabled ?? false,
    },
  };
}
