# Enchanted Park Pickups - Project Documentation

## Project Overview

**Project Name:** Enchanted Park Pickups CRM
**URL:** https://enchantedparkpickups.com
**Server:** AWS EC2 (same server as Magic Shine Portal)
**Server IP:** 3.19.9.21
**Location:** `/home/ubuntu/enchanted-park-crm`
**Owner:** Tracy U - Enchanted Park Pickups

## Business Information

```
Business Name: Enchanted Park Pickups
Service: Personal shoppers for Disney World, Universal Orlando, and SeaWorld
Email Domain: enchantedparkpickups.com
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **UI:** Tailwind CSS, shadcn/ui, Radix UI
- **Backend:** Supabase (PostgreSQL + Auth)
- **Forms:** React Hook Form + Zod
- **Shipping:** Shippo API
- **Payments:** PayPal (planned)
- **Web Server:** Nginx (Docker container `portal_nginx`)
- **SSL:** Let's Encrypt (auto-renew)

## Server Configuration

### Nginx (Docker)

The site runs through the `portal_nginx` Docker container which handles multiple sites.

**Config file location:** `/home/ubuntu/portal/nginx/default.conf`

**Enchanted Park config block:**
```nginx
# Enchanted Park CRM - enchantedparkpickups.com
server {
  listen 80;
  server_name enchantedparkpickups.com www.enchantedparkpickups.com;

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl;
  server_name enchantedparkpickups.com www.enchantedparkpickups.com;

  ssl_certificate /etc/letsencrypt/live/enchantedparkpickups.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/enchantedparkpickups.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  location / {
    proxy_pass http://172.18.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### SSL Certificate

- **Provider:** Let's Encrypt
- **Issued:** December 24, 2025
- **Expires:** March 24, 2026
- **Auto-renewal:** Configured via certbot

## Supabase Configuration

### Project Details

- **Project URL:** https://jtqnjvczkywfkobwddbu.supabase.co
- **Project Ref:** jtqnjvczkywfkobwddbu

### Environment Variables (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL="https://jtqnjvczkywfkobwddbu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMDUzODYsImV4cCI6MjA4MTc4MTM4Nn0.zI0E8jaHGsE73daed71bBAtoviRjZ7HS9LqsKK8w3A4"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak"

# Shippo Integration
SHIPPO_API_TOKEN=shippo_test_2768d14afa316cc67e59733ea9f5e4c24f8761b4

# Ship From Address
SHIPPO_FROM_NAME="Enchanted Park Pickups"
SHIPPO_FROM_CITY="Orlando"
SHIPPO_FROM_STATE="FL"
```

### Admin User (Supabase Auth)

- **User ID:** 17ad3a04-7961-4cd3-92cf-8a9dd663b34b
- **Email:** tracyu@enchantedparkpickups.com
- **Password:** Davenport123!

### Database Schema

Schema file: `/home/ubuntu/enchanted-park-crm/supabase/migrations/001_initial_schema.sql`

**Tables:**
- `admin_users` - CRM admin access
- `customers` - Customer information
- `shopping_trips` - Planned park visits
- `requests` - Customer shopping requests
- `request_items` - Items in each request
- `invoices` - PayPal invoices
- `shipments` - Shippo shipments
- `new_releases` - Merchandise feed
- `unclaimed_inventory` - Shop items
- `settings` - App configuration

**Note:** Schema needs to be run in Supabase SQL Editor. Auth bypass is currently ON in middleware for development.

## Email Configuration

### Mail Server

- **Server:** Mailu 2.0
- **IP:** 18.216.240.232
- **Hostname:** mail.magicshineautospa.com
- **Webmail:** https://mail.magicshineautospa.com/webmail

### Mailboxes Created

| Email | Type | Password |
|-------|------|----------|
| hello@enchantedparkpickups.com | Mailbox | Davenport123! |
| kelsi@enchantedparkpickups.com | Mailbox | Davenport123! |
| kira@enchantedparkpickups.com | Mailbox | Davenport123! |
| support@enchantedparkpickups.com | Mailbox | Davenport123! |
| tracyu@enchantedparkpickups.com | Mailbox | Davenport123! |
| tracy@enchantedparkpickups.com | Alias | -> tracyu@ |

### DNS Records for GoDaddy

| Type | Name | Priority | Value |
|------|------|----------|-------|
| A | @ | - | 3.19.9.21 |
| A | www | - | 3.19.9.21 |
| MX | @ | 10 | mail.magicshineautospa.com |
| TXT | @ | - | v=spf1 mx a:mail.magicshineautospa.com ~all |
| TXT | dkim._domainkey | - | v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs+5xEKaW+B6EXWXaJYd4A1uka42VjWFNjuVH+0S4H4tNJ0BxKoM6nOMZ2P6F+OsCWamZ5jMLF5ySxbqkLkMsYp43WEpb2X48rd8L6uEcDGnhxdsTwXtjdAZMwMg91qGWVslbsi6qwctBh5NundOeNFqgaqT81hoiTFv8kH9G1FV+1V9l5RgU0JfGukvf1nF7rAeYas+BohvOrtrC23M4s6ADhgNQRqxAZtdIrFMANf1Z91lhOo0X9Gx4LD6piuCRISlQwx1hpSwaLrTtFo2aBhBiFrDmadQOCrrRpaQPTPfZeVHPAgyu4Sf1uVsHMUZcY0B84l5tfgL3C88lhjIedwIDAQAB |
| TXT | _dmarc | - | v=DMARC1; p=reject; adkim=s; aspf=s |

## Directory Structure

```
/home/ubuntu/enchanted-park-crm/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage
│   │   ├── layout.tsx                  # Root layout
│   │   ├── admin/                      # Admin pages
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── customers/             # Customer management
│   │   │   ├── requests/              # Request management
│   │   │   ├── shopping-trips/        # Trip planning
│   │   │   ├── invoices/              # Invoice management
│   │   │   ├── shipments/             # Shipment tracking
│   │   │   └── settings/              # App settings
│   │   └── auth/
│   │       └── login/                 # Login page
│   ├── components/
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client
│   │   │   └── server.ts              # Server client
│   │   └── utils.ts
│   └── middleware.ts                   # Auth middleware
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql     # Database schema
├── scripts/
│   ├── create-user.ts                 # User creation script
│   └── setup-admin.ts                 # Admin setup script
├── public/
│   └── images/                        # Site images
├── .env.local                         # Environment variables
├── package.json
├── tailwind.config.ts
├── next.config.mjs
└── ENCHANTED.md                       # This file
```

## Common Commands

### Development

```bash
# Navigate to project
cd /home/ubuntu/enchanted-park-crm

# Start dev server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Nginx (Docker)

```bash
# View nginx config
docker exec portal_nginx cat /etc/nginx/conf.d/default.conf

# Test nginx config
docker exec portal_nginx nginx -t

# Reload nginx after config changes
docker cp /home/ubuntu/portal/nginx/default.conf portal_nginx:/etc/nginx/conf.d/default.conf
docker exec portal_nginx nginx -s reload

# View nginx logs
docker logs portal_nginx --tail 100
```

### SSL Certificate

```bash
# Renew SSL (usually automatic)
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -connect enchantedparkpickups.com:443 -servername enchantedparkpickups.com 2>/dev/null | openssl x509 -noout -dates
```

### Supabase Admin Setup

```bash
# Run admin setup script
cd /home/ubuntu/enchanted-park-crm
npx tsx scripts/setup-admin.ts
```

## CRM Features

### Completed
- [x] Homepage with hero, parks section, how it works
- [x] Admin dashboard layout
- [x] Customer management (list, detail, add, edit)
- [x] Customer import/export (Pirateship CSV compatible)
- [x] Request management with status workflow
- [x] Shopping trip planning
- [x] Invoice creation
- [x] Shipment tracking with Shippo integration
- [x] Settings page (business info, fees, shipping)
- [x] Supabase authentication (ENABLED)
- [x] Responsive design with dark theme
- [x] Database schema deployed to Supabase
- [x] DNS records configured in GoDaddy

### Pending
- [ ] Mobile-first CRM redesign (see roadmap below)
- [ ] PayPal integration
- [ ] Email notifications
- [ ] New releases feed scraping
- [ ] Public shop page for unclaimed items

---

## Mobile-First Feature Roadmap

### Design Philosophy
- **Mobile-first:** Build for phone first, enhance for tablet/desktop
- **Touch-optimized:** Big tap targets (44px minimum), swipe gestures
- **Quick actions:** Minimize taps to complete common tasks
- **Offline-capable:** Work in parks with spotty WiFi

### Bottom Navigation (Mobile)
| Icon | Label | Page |
|------|-------|------|
| Home | Dashboard | `/admin` |
| Users | Customers | `/admin/customers` |
| List | Requests | `/admin/requests` |
| Calendar | Trips | `/admin/trips` |
| Settings | Settings | `/admin/settings` |

### Customer Card (Mobile)
```
┌─────────────────────────────────┐
│ [Avatar] Sarah Johnson          │
│          Orlando, FL            │
│          3 requests             │
│                                 │
│  [Call]  [Text]  [Email]  [...] │
└─────────────────────────────────┘
```
- Tap card → Customer detail
- Call/Text/Email → Native app links
- [...] → Edit, Delete options

### Request Card (Swipeable)
- **Swipe right** → Mark as found
- **Swipe left** → More options (invoice, cancel, etc.)
- **Tap** → View full details

### Quick Add Request
- Big floating **+** button
- Opens bottom sheet modal
- Recent customers shown at top for quick selection
- Voice-to-text for item descriptions

### Shopping List (At Parks Mode)
- Large checkboxes for easy tapping
- Item photo displayed prominently
- Tap to mark found + enter actual price
- Camera button to snap photo of found item
- Optimized for one-handed use

### Feature Priority
1. **Phase 1:** Customers page mobile redesign
2. **Phase 2:** Requests page with swipe gestures
3. **Phase 3:** Quick Add Request bottom sheet
4. **Phase 4:** Shopping List "park mode"
5. **Phase 5:** Bottom navigation + offline support

## Authentication

### Current Status: ENABLED

Authentication is active and working.

### Login Credentials
- **Email:** tracyu@enchantedparkpickups.com
- **Password:** Davenport123!
- **Login URL:** https://enchantedparkpickups.com/auth/login
- **Admin Panel:** https://enchantedparkpickups.com/admin

## Troubleshooting

### Site Not Loading
```bash
# Check if dev server is running
curl -s http://localhost:3000 | head -5

# Start dev server if needed
cd /home/ubuntu/enchanted-park-crm && npm run dev &
```

### SSL Issues
```bash
# Verify certificate
curl -sI https://enchantedparkpickups.com | head -5

# Check certificate details
echo | openssl s_client -connect enchantedparkpickups.com:443 2>/dev/null | openssl x509 -noout -text | head -20
```

### Nginx Not Serving Site
```bash
# Reload config into container
docker cp /home/ubuntu/portal/nginx/default.conf portal_nginx:/etc/nginx/conf.d/default.conf
docker exec portal_nginx nginx -s reload
```

### Email Issues
```bash
# Check mail server status
ssh -i /home/ubuntu/magicshine.pem ubuntu@18.216.240.232 "docker ps | grep mailu"

# Test SMTP
ssh -i /home/ubuntu/magicshine.pem ubuntu@18.216.240.232 "nc -zv localhost 25"
```

---

## Session: December 25, 2025 - Image System & Gateway-Agnostic Invoicing

### S3 Image Upload System

**Features Implemented:**
- Image upload to S3 bucket with presigned URLs
- Camera capture support for mobile (using `capture="environment"`)
- Image gallery with lightbox viewer
- Signed URL generation for private S3 bucket access

**Files Created/Modified:**
- `/src/components/ImageUploader.tsx` - Upload component with camera, lightbox
- `/src/components/ImageGallery.tsx` - Gallery with signed URL fetching
- `/src/app/api/image/route.ts` - API for presigned read URLs
- `/src/lib/s3.ts` - S3 client with presigned URL functions
- `/scripts/configure-s3-cors.ts` - CORS configuration for S3

**S3 Configuration:**
- **Bucket:** enchantedbucket
- **Region:** us-east-2
- Private bucket with presigned URL access

**CORS Config (run via script):**
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"]
}
```

### Gateway-Agnostic Invoicing System

**Purpose:** Internal invoicing that works without PayPal/Stripe, allowing payment gateway to be added later.

**Features Implemented:**

1. **Create Invoice Button** (`/admin/requests/[id]`)
   - Appears when request status is "found"
   - Auto-calculates totals from found items with Florida tax (6.5%)
   - Creates invoice and updates request status to "invoiced"

2. **Customer-Facing Invoice View** (`/invoice/[id]`)
   - Public page - no login required
   - Clean, printable invoice with business branding
   - Shows invoice number, items, totals, payment status
   - Print button for PDF saving

3. **Enhanced Admin Invoice Page** (`/admin/invoices/[id]`)
   - **Copy Link** - Share invoice URL with customers
   - **Mark as Sent** - Update status without payment gateway
   - **Record Payment** dialog:
     - Payment method: PayPal, Stripe, or Manual
     - Optional payment reference/transaction ID
   - Customer invoice link display

**Database Changes (Migration Required):**

Run in Supabase SQL Editor:
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('paypal', 'stripe', 'manual'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Invoice number auto-generation
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
```

**Files Created/Modified:**
- `/src/app/invoice/[id]/page.tsx` - Customer invoice view (NEW)
- `/src/app/admin/invoices/[id]/page.tsx` - Enhanced admin invoice page
- `/src/app/admin/requests/[id]/page.tsx` - Added Create Invoice button
- `/src/lib/database.types.ts` - Updated Invoice type
- `/supabase/migrations/20241225_invoice_enhancements.sql` - Migration SQL
- `/src/app/api/admin/run-migration/route.ts` - Migration check endpoint

**Invoice Workflow:**
1. Request status reaches "found"
2. Admin clicks "Create Invoice" → calculates totals
3. Invoice created in "draft" status
4. Admin clicks "Mark as Sent" or uses PayPal
5. Share link with customer via Copy Link
6. Customer views invoice at `/invoice/[id]`
7. When paid, admin clicks "Record Payment" with method/reference
8. Request status updates to "paid"

---

## Session: December 25, 2025 - AI-Powered New Releases System

### Overview

Built a comprehensive AI-powered merchandise discovery system that:
- Monitors RSS feeds from Disney/Universal/SeaWorld blogs
- Uses Claude AI to parse articles and extract merchandise information
- Matches new releases to customer interests
- Provides admin review queue for AI-discovered items
- Powers a public-facing new releases page

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW RELEASES PIPELINE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RSS Feeds ──┐                                              │
│              │                                              │
│  Blog URLs ──┼──→ Scraper ──→ Claude AI ──→ Database       │
│              │              (parse/enrich)       │          │
│  Manual ─────┘                                   ▼          │
│                                            ┌─────────┐      │
│                                            │ Website │      │
│                                            │ /new-releases │
│                                            └────┬────┘      │
│                                                 │           │
│                              Customer Match ◄───┘           │
│                                    │                        │
│                                    ▼                        │
│                              Notifications                  │
│                         "Hey, this dropped!"                │
└─────────────────────────────────────────────────────────────┘
```

### Files Created

**AI/Backend:**
- `/src/lib/ai/parseArticle.ts` - Claude-powered article parser
- `/src/lib/ai/feedFetcher.ts` - RSS feed fetcher and scraper
- `/src/lib/ai/customerMatcher.ts` - Customer interest matching
- `/src/lib/ai/notifications.ts` - Notification system

**API Routes:**
- `/src/app/api/releases/route.ts` - CRUD for releases
- `/src/app/api/releases/[id]/route.ts` - Single release operations
- `/src/app/api/releases/process/route.ts` - Trigger feed processing
- `/src/app/api/sources/route.ts` - CRUD for feed sources
- `/src/app/api/sources/[id]/route.ts` - Single source operations
- `/src/app/api/customer-interests/route.ts` - Customer preferences
- `/src/app/api/customer-interests/[id]/route.ts` - Update interests
- `/src/app/api/notifications/route.ts` - Preview/send notifications

**UI:**
- `/src/app/admin/releases/page.tsx` - Full admin panel with tabs:
  - All Releases (filterable grid)
  - Review Queue (approve/reject AI discoveries)
  - Feed Sources (manage RSS feeds)
- `/src/app/new-releases/page.tsx` - Public page with:
  - Featured releases section
  - Filterable grid with search
  - Request modal for items

**Scripts:**
- `/scripts/process-feeds.ts` - Cron job script

### Database Migration

Run in Supabase SQL Editor:
```sql
-- See /supabase/migrations/20241225_new_releases_system.sql
```

**New Tables:**
- `release_sources` - RSS feeds and scrape sources
- `processed_articles` - Track processed URLs (dedup)
- `customer_interests` - Customer preferences for matching
- `release_notifications` - Track sent notifications

**New Columns on `new_releases`:**
- `ai_description` - AI-generated description
- `ai_tags` - AI-extracted tags (array)
- `ai_demand_score` - 1-10 popularity prediction
- `status` - pending/approved/rejected/archived
- `source_id` - FK to release_sources
- `raw_content` - Original scraped text

### Environment Variables

Add to `.env.local`:
```env
ANTHROPIC_API_KEY=your-claude-api-key

# Optional: for cron job auth
CRON_API_KEY=random-secure-key
```

### Cron Setup

Add to crontab for automated feed checking:
```bash
# Run every 4 hours
0 */4 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/process-feeds.ts >> /var/log/enchanted-feeds.log 2>&1
```

Or trigger manually via API:
```bash
curl -X POST https://enchantedparkpickups.com/api/releases/process
```

### Feed Sources (Pre-seeded)

| Name | URL | Park |
|------|-----|------|
| BlogMickey | https://blogmickey.com/feed/ | Disney |
| WDWNT | https://wdwnt.com/feed/ | Disney |
| Disney Food Blog | https://www.disneyfoodblog.com/feed/ | Disney |
| AllEars | https://allears.net/feed/ | Disney |
| Laughing Place | https://www.laughingplace.com/w/feed/ | Disney |
| Orlando Informer | https://orlandoinformer.com/feed/ | All |
| Inside Universal | https://insideuniversal.net/feed/ | Universal |

### AI Features

1. **Smart Article Parsing**
   - Extracts product name, description, category, park
   - Estimates price based on category
   - Assigns demand score (1-10) based on:
     - Limited editions: 8-10
     - Loungefly/Spirit Jerseys: 7-9
     - Popcorn buckets: 8-10
     - Regular merchandise: 3-5

2. **Customer Matching**
   - Scores releases against customer interests
   - Considers: park preference, category, keywords
   - High-demand items get bonus visibility

3. **Notifications (Ready for email integration)**
   - Generates HTML/text emails
   - Shows matched reasons
   - Tracks clicks and conversions

### Admin Workflow

1. Feeds are automatically checked (cron or manual)
2. AI parses articles, extracts merchandise
3. New items appear in "Review Queue" as pending
4. Admin approves/rejects items
5. Approved items show on public `/new-releases` page
6. Customers can request items directly

---

*Last Updated: December 25, 2025*
*Created for project continuity*
