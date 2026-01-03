-- Additional CRM notification templates for full customer journey
-- Adds: welcome, request_received, request_assigned_to_trip, shopping_started,
--       item_found, item_not_found, payment_received, special_offer

-- Update notification_settings with new toggle fields
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS send_welcome_notifications BOOLEAN DEFAULT true;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS send_request_notifications BOOLEAN DEFAULT true;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS send_shopping_notifications BOOLEAN DEFAULT true;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS send_payment_notifications BOOLEAN DEFAULT true;
ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS send_offer_notifications BOOLEAN DEFAULT false;

-- Add request_id to notification_log for tracking
ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES requests(id);

-- Email Templates
INSERT INTO notification_templates (type, trigger, name, email_subject, email_html, email_text) VALUES
-- Welcome New Customer
(
  'email',
  'welcome_new_customer',
  'Welcome Email',
  'Welcome to Enchanted Park Pickups! ✨',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .feature-box { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .btn { display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Welcome to Enchanted Park Pickups!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Welcome to your magical personal shopping experience! We''re thrilled to have you.</p>

      <div class="feature-box">
        <h3>🏰 What We Offer</h3>
        <ul>
          <li>Personal shoppers at Disney World, Universal, & SeaWorld</li>
          <li>Hard-to-find merchandise and new releases</li>
          <li>Real-time notifications when your items are found</li>
          <li>Fast, secure shipping nationwide</li>
        </ul>
      </div>

      <p style="text-align: center; margin-top: 20px;">
        <a href="{{portal_url}}" class="btn">Browse New Releases</a>
      </p>

      <p>Ready to start? Just reply to this email or visit our website to submit your first request!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Welcome to Enchanted Park Pickups! ✨

We''re thrilled to have you. Here''s what we offer:

🏰 Personal shoppers at Disney World, Universal, & SeaWorld
📦 Hard-to-find merchandise and new releases
📱 Real-time notifications when your items are found
🚀 Fast, secure shipping nationwide

Browse new releases: {{portal_url}}

Ready to start? Just reply to this email or visit our website to submit your first request!

- Enchanted Park Pickups'
),
-- Request Received
(
  'email',
  'request_received',
  'Request Received',
  'We Got Your Request! 🎯',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .request-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Request Received!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>We''ve got your request and we''re on it! Here''s what you asked for:</p>

      <div class="request-box">
        <p><strong>Request ID:</strong> {{request_id}}</p>
        <p><strong>Items:</strong></p>
        {{items_list}}
      </div>

      <p><strong>What happens next?</strong></p>
      <ol>
        <li>We''ll assign your request to our next shopping trip</li>
        <li>You''ll get a notification when we start shopping</li>
        <li>We''ll let you know as soon as we find your items</li>
      </ol>

      <p style="text-align: center;">
        <a href="{{request_url}}" class="btn">Track Your Request</a>
      </p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

We''ve got your request! 🎯

Request ID: {{request_id}}
Items:
{{items_list_text}}

What happens next?
1. We''ll assign your request to our next shopping trip
2. You''ll get a notification when we start shopping
3. We''ll let you know as soon as we find your items

Track your request: {{request_url}}

- Enchanted Park Pickups'
),
-- Request Assigned to Trip
(
  'email',
  'request_assigned_to_trip',
  'Request Assigned to Trip',
  'Your Request is Scheduled! 📅',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .trip-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .date { font-size: 28px; color: #4a1d6a; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Shopping Trip Scheduled!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Great news! Your request has been assigned to an upcoming shopping trip.</p>

      <div class="trip-box">
        <p><strong>Scheduled Date:</strong></p>
        <p class="date">{{trip_date}}</p>
        <p><strong>Parks:</strong> {{parks}}</p>
      </div>

      <p><strong>Your Items:</strong></p>
      {{items_list}}

      <p>We''ll send you another notification when we start shopping. Stay tuned!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Great news! Your request has been scheduled! 📅

Shopping Trip: {{trip_date}}
Parks: {{parks}}

Your Items:
{{items_list_text}}

We''ll send you another notification when we start shopping!

- Enchanted Park Pickups'
),
-- Shopping Started
(
  'email',
  'shopping_started',
  'Shopping Started',
  'We''re Shopping for You Now! 🛍️',
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
      <h1>🛍️ We''re Shopping Now!</h1>
    </div>
    <div class="content">
      <div class="emoji">🏃‍♀️🏰</div>
      <p>Hi {{customer_name}},</p>
      <p>Exciting news! We''re at the parks right now shopping for your items!</p>

      <p><strong>Looking for:</strong></p>
      {{items_list}}

      <p>Keep an eye on your inbox - we''ll update you as soon as we find your items!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Exciting news! We''re at the parks right now shopping for your items! 🛍️

Looking for:
{{items_list_text}}

Keep an eye on your inbox - we''ll update you as soon as we find your items!

- Enchanted Park Pickups'
),
-- Item Found
(
  'email',
  'item_found',
  'Item Found',
  'We Found It! 🎉 {{item_name}}',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .item-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .checkmark { font-size: 64px; text-align: center; }
    .price { font-size: 24px; color: #4a1d6a; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Found It!</h1>
    </div>
    <div class="content">
      <div class="checkmark">✅</div>
      <p>Hi {{customer_name}},</p>
      <p>Great news! We found your item!</p>

      <div class="item-box">
        <h2>{{item_name}}</h2>
        {{#if item_image_url}}
        <img src="{{item_image_url}}" alt="{{item_name}}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;">
        {{/if}}
        <p class="price">${{actual_price}}</p>
        <p><strong>Found at:</strong> {{store_location}}</p>
      </div>

      <p>We''ll continue shopping for any remaining items. Once we have everything, we''ll send your invoice!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Great news! We found your item! 🎉

✅ {{item_name}}
Price: ${{actual_price}}
Found at: {{store_location}}

We''ll continue shopping for any remaining items. Once we have everything, we''ll send your invoice!

- Enchanted Park Pickups'
),
-- Item Not Found
(
  'email',
  'item_not_found',
  'Item Not Found',
  'Update on Your Request 📋',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .item-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .btn { display: inline-block; background: #d4a850; color: #1e293b; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Request Update</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Unfortunately, we weren''t able to find one of your requested items today:</p>

      <div class="item-box">
        <h3>❌ {{item_name}}</h3>
        <p><strong>Reason:</strong> {{reason}}</p>
      </div>

      <p><strong>What happens next?</strong></p>
      <ul>
        <li>We can try again on our next trip</li>
        <li>We can suggest similar alternatives</li>
        <li>Or we can remove the item from your request</li>
      </ul>

      <p>Just reply to this email and let us know how you''d like to proceed!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Unfortunately, we weren''t able to find one of your requested items today:

❌ {{item_name}}
Reason: {{reason}}

What happens next?
- We can try again on our next trip
- We can suggest similar alternatives
- Or we can remove the item from your request

Just reply to this email and let us know how you''d like to proceed!

- Enchanted Park Pickups'
),
-- Payment Received
(
  'email',
  'payment_received',
  'Payment Received',
  'Payment Received - Thank You! 💳',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #22c55e; }
    .amount { font-size: 32px; color: #22c55e; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Payment Received!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>Thank you! We''ve received your payment.</p>

      <div class="receipt-box">
        <p><strong>Invoice:</strong> {{invoice_number}}</p>
        <p class="amount">${{amount_paid}}</p>
        <p><strong>Payment Method:</strong> {{payment_method}}</p>
        <p><strong>Date:</strong> {{payment_date}}</p>
      </div>

      <p><strong>What happens next?</strong></p>
      <p>We''ll package your items with care and ship them out shortly. You''ll receive tracking information once your order ships!</p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

Thank you! We''ve received your payment. 💳

Invoice: {{invoice_number}}
Amount: ${{amount_paid}}
Payment Method: {{payment_method}}
Date: {{payment_date}}

We''ll package your items with care and ship them out shortly. You''ll receive tracking information once your order ships!

- Enchanted Park Pickups'
),
-- Special Offer
(
  'email',
  'special_offer',
  'Special Offer',
  '🎁 A Special Offer Just For You!',
  E'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #4a1d6a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; color: #d4a850; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .offer-box { background: linear-gradient(135deg, #d4a850, #f59e0b); padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; color: #1e293b; }
    .discount { font-size: 48px; font-weight: bold; }
    .btn { display: inline-block; background: #1e293b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎁 Special Offer!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      <p>As a valued customer, we have a special offer just for you!</p>

      <div class="offer-box">
        <p class="discount">{{discount_amount}}</p>
        <p><strong>{{offer_description}}</strong></p>
        <p>Use code: <strong>{{promo_code}}</strong></p>
        <p>Valid until: {{expiry_date}}</p>
      </div>

      <p style="text-align: center;">
        <a href="{{shop_url}}" class="btn">Shop Now</a>
      </p>

      <div class="footer">
        <p>Enchanted Park Pickups<br>Personal Shoppers for Disney World, Universal & SeaWorld</p>
        <p><a href="{{unsubscribe_url}}">Unsubscribe from promotional emails</a></p>
      </div>
    </div>
  </div>
</body>
</html>',
  E'Hi {{customer_name}},

As a valued customer, we have a special offer just for you! 🎁

{{discount_amount}} - {{offer_description}}

Use code: {{promo_code}}
Valid until: {{expiry_date}}

Shop now: {{shop_url}}

- Enchanted Park Pickups

Unsubscribe: {{unsubscribe_url}}'
)
ON CONFLICT (type, trigger) DO NOTHING;

-- SMS Templates
INSERT INTO notification_templates (type, trigger, name, sms_body) VALUES
(
  'sms',
  'welcome_new_customer',
  'Welcome SMS',
  'Welcome to Enchanted Park Pickups! ✨ We''re your personal shoppers for Disney World, Universal & SeaWorld. Reply HELP for info or START to submit your first request!'
),
(
  'sms',
  'request_received',
  'Request Received SMS',
  'Enchanted Park Pickups: We got your request! 🎯 Request ID: {{request_id}}. We''ll notify you when it''s assigned to a shopping trip.'
),
(
  'sms',
  'request_assigned_to_trip',
  'Trip Assigned SMS',
  'Enchanted Park Pickups: Your request is scheduled for {{trip_date}}! 📅 We''ll shop at {{parks}}. Stay tuned!'
),
(
  'sms',
  'shopping_started',
  'Shopping Started SMS',
  'Enchanted Park Pickups: We''re at the parks now shopping for you! 🛍️ Updates coming soon...'
),
(
  'sms',
  'item_found',
  'Item Found SMS',
  'Enchanted Park Pickups: Found it! ✅ "{{item_name}}" - ${{actual_price}}. We''ll keep looking for any remaining items!'
),
(
  'sms',
  'item_not_found',
  'Item Not Found SMS',
  'Enchanted Park Pickups: Update - we couldn''t find "{{item_name}}" today. Reason: {{reason}}. Reply to discuss options.'
),
(
  'sms',
  'payment_received',
  'Payment Received SMS',
  'Enchanted Park Pickups: Payment received! 💳 ${{amount_paid}} for invoice {{invoice_number}}. We''ll ship soon!'
),
(
  'sms',
  'special_offer',
  'Special Offer SMS',
  'Enchanted Park Pickups: 🎁 Special offer! {{discount_amount}} with code {{promo_code}}. Valid until {{expiry_date}}. Shop: {{shop_url}}'
)
ON CONFLICT (type, trigger) DO NOTHING;
