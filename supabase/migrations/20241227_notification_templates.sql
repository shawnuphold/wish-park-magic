-- Notification Templates System
-- Allows admins to customize email and SMS notifications

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  type TEXT NOT NULL, -- 'email' or 'sms'
  trigger TEXT NOT NULL, -- 'invoice_ready', 'order_shipped', 'order_delivered', 'new_release', 'custom'
  name TEXT NOT NULL, -- Display name for admin UI

  -- Email specific fields
  email_subject TEXT,
  email_html TEXT,
  email_text TEXT,

  -- SMS specific fields
  sms_body TEXT,

  -- Settings
  enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(type, trigger)
);

-- Notification log for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),

  -- Recipient info
  customer_id UUID REFERENCES customers(id),
  recipient TEXT NOT NULL, -- email or phone

  -- Content sent
  type TEXT NOT NULL, -- 'email' or 'sms'
  subject TEXT,
  body TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  error_message TEXT,
  external_id TEXT, -- Twilio SID or email message ID

  -- Related entities
  invoice_id UUID REFERENCES invoices(id),
  shipment_id UUID REFERENCES shipments(id),
  release_id UUID REFERENCES new_releases(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email settings
  email_enabled BOOLEAN DEFAULT false,
  email_from_name TEXT DEFAULT 'Enchanted Park Pickups',
  email_from_address TEXT DEFAULT 'hello@enchantedparkpickups.com',
  email_reply_to TEXT,

  -- SMS settings
  sms_enabled BOOLEAN DEFAULT false,
  sms_from_name TEXT DEFAULT 'Enchanted Park',

  -- General settings
  send_invoice_notifications BOOLEAN DEFAULT true,
  send_shipping_notifications BOOLEAN DEFAULT true,
  send_delivery_notifications BOOLEAN DEFAULT true,
  send_new_release_notifications BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default notification settings
INSERT INTO notification_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Insert default email templates
INSERT INTO notification_templates (type, trigger, name, email_subject, email_html, email_text) VALUES
(
  'email',
  'invoice_ready',
  'Invoice Ready',
  'Your Invoice from Enchanted Park Pickups - {{invoice_number}}',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .invoice-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount { font-size: 32px; color: #4a1d6a; font-weight: bold; }
    .btn { display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Enchanted Park Pickups</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Your invoice is ready! Here are the details:</p>

      <div class="invoice-box">
        <p><strong>Invoice:</strong> {{invoice_number}}</p>
        <p class="amount">${{total_amount}}</p>
        <p><strong>Items:</strong></p>
        {{items_list}}
      </div>

      <p style="text-align: center;">
        <a href="{{invoice_url}}" class="btn">View & Pay Invoice</a>
      </p>

      <p>Thank you for letting us bring a little magic to you!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Your invoice {{invoice_number}} is ready!

Total: ${{total_amount}}

Items:
{{items_list_text}}

View and pay your invoice here:
{{invoice_url}}

Thank you for letting us bring a little magic to you!

- Enchanted Park Pickups'
),
(
  'email',
  'order_shipped',
  'Order Shipped',
  'Your Order Has Shipped! 📦',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .tracking-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .tracking-number { font-size: 24px; color: #4a1d6a; font-weight: bold; font-family: monospace; }
    .btn { display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Your Order Has Shipped!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Great news! Your magical treasures are on their way!</p>

      <div class="tracking-box">
        <p><strong>Carrier:</strong> {{carrier}}</p>
        <p class="tracking-number">{{tracking_number}}</p>
        <p style="margin-top: 15px;">
          <a href="{{tracking_url}}" class="btn">Track Your Package</a>
        </p>
      </div>

      <p><strong>Items Shipped:</strong></p>
      {{items_list}}

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Great news! Your magical treasures are on their way!

Carrier: {{carrier}}
Tracking Number: {{tracking_number}}

Track your package: {{tracking_url}}

Items Shipped:
{{items_list_text}}

- Enchanted Park Pickups'
),
(
  'email',
  'order_delivered',
  'Order Delivered',
  'Your Package Has Been Delivered! ✨',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .emoji { font-size: 64px; text-align: center; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Package Delivered!</h1>
    </div>
    <div class="content">
      <div class="emoji">🎁</div>
      <p>Hi {{customer_name}},</p>
      <p>Your package has been delivered! We hope you love your magical treasures!</p>

      <p>If you have any questions or concerns about your order, please don''t hesitate to reach out.</p>

      <p>Thank you for choosing Enchanted Park Pickups. We''d love to help you again soon!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Your package has been delivered! 🎁

We hope you love your magical treasures!

If you have any questions or concerns about your order, please don''t hesitate to reach out.

Thank you for choosing Enchanted Park Pickups!

- Enchanted Park Pickups'
),
(
  'email',
  'new_release',
  'New Release Alert',
  'New Drop Alert: {{item_name}} 🎉',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .product-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .product-image { width: 100%; border-radius: 8px; }
    .price { font-size: 24px; color: #4a1d6a; font-weight: bold; }
    .btn { display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Drop Alert!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>A new item just dropped that we think you''ll love!</p>

      <div class="product-box">
        {{#if image_url}}
        <img src="{{image_url}}" alt="{{item_name}}" class="product-image">
        {{/if}}
        <h2>{{item_name}}</h2>
        <p>{{item_description}}</p>
        <p class="price">${{item_price}}</p>
        <p><strong>Park:</strong> {{park}}</p>
      </div>

      <p style="text-align: center;">
        <a href="{{request_url}}" class="btn">Request This Item</a>
      </p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
        <p><a href="{{unsubscribe_url}}">Unsubscribe from new release alerts</a></p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

A new item just dropped that we think you''ll love!

{{item_name}}
{{item_description}}
Price: ${{item_price}}
Park: {{park}}

Request this item: {{request_url}}

- Enchanted Park Pickups

Unsubscribe: {{unsubscribe_url}}'
)
ON CONFLICT (type, trigger) DO NOTHING;

-- Insert default SMS templates
INSERT INTO notification_templates (type, trigger, name, sms_body) VALUES
(
  'sms',
  'invoice_ready',
  'Invoice Ready SMS',
  'Enchanted Park Pickups: Your invoice {{invoice_number}} for ${{total_amount}} is ready! View & pay: {{invoice_url}}'
),
(
  'sms',
  'order_shipped',
  'Order Shipped SMS',
  'Enchanted Park Pickups: Your order has shipped! Tracking: {{tracking_number}} ({{carrier}}). Track: {{tracking_url}}'
),
(
  'sms',
  'order_delivered',
  'Order Delivered SMS',
  'Enchanted Park Pickups: Your order has been delivered! Enjoy your magical treasures! ✨'
),
(
  'sms',
  'new_release',
  'New Release SMS',
  'Enchanted Park Pickups: New drop! "{{item_name}}" just arrived at {{park}}. Check it out: {{request_url}}'
)
ON CONFLICT (type, trigger) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_trigger ON notification_templates(trigger);
CREATE INDEX IF NOT EXISTS idx_notification_log_customer ON notification_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_notification_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_templates_timestamp ON notification_templates;
CREATE TRIGGER update_notification_templates_timestamp
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_template_timestamp();
