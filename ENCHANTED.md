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
- **Payments:** PayPal & Stripe (infrastructure ready, disabled by default)
- **Notifications:** Email (SMTP), Push (VAPID), SMS (Twilio) - all disabled by default
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

**SECURITY NOTE:** All credentials are stored in `.env.local` on the server. See the file directly or ask admin for access.

```env
NEXT_PUBLIC_SUPABASE_URL="https://jtqnjvczkywfkobwddbu.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see .env.local>
SUPABASE_SERVICE_ROLE_KEY=<see .env.local>

# Shippo Integration
SHIPPO_API_TOKEN=<see .env.local>

# Ship From Address
SHIPPO_FROM_NAME="Enchanted Park Pickups"
SHIPPO_FROM_STREET1=<see .env.local>
SHIPPO_FROM_CITY="Davenport"
SHIPPO_FROM_STATE="FL"
SHIPPO_FROM_ZIP=<see .env.local>
```

### Admin User (Supabase Auth)

- **User ID:** 17ad3a04-7961-4cd3-92cf-8a9dd663b34b
- **Email:** tracyu@enchantedparkpickups.com
- **Password:** <ask admin>

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
| hello@enchantedparkpickups.com | Mailbox | <ask admin> |
| kelsi@enchantedparkpickups.com | Mailbox | <ask admin> |
| kira@enchantedparkpickups.com | Mailbox | <ask admin> |
| support@enchantedparkpickups.com | Mailbox | <ask admin> |
| tracyu@enchantedparkpickups.com | Mailbox | <ask admin> |
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
- [x] Shopping trip planning with printable lists
- [x] Invoice creation (gateway-agnostic)
- [x] Shipment tracking with Shippo integration
- [x] Shipping label purchase with Shippo
- [x] Customer portal (requests, invoices, shipments)
- [x] Dashboard analytics (revenue charts, request status)
- [x] Settings page (business info, fees, shipping)
- [x] Supabase authentication (ENABLED)
- [x] Responsive design with dark theme
- [x] Database schema deployed to Supabase
- [x] DNS records configured in GoDaddy
- [x] AI-powered new releases system
- [x] S3 image upload with camera support

### Built (Disabled by Default)
- [x] PayPal integration (needs PAYPAL_CLIENT_ID, PAYPAL_SECRET)
- [x] Stripe integration (needs STRIPE_SECRET_KEY)
- [x] Email notifications (needs SMTP_HOST)
- [x] Public shop page (needs ENABLE_SHOP=true)
- [x] Shippo webhook tracking updates
- [x] PWA / Offline support (needs manifest link in layout)
- [x] Voice input component
- [x] Push notifications (needs VAPID keys)
- [x] SMS notifications via Twilio (needs TWILIO credentials)
- [x] Mobile bottom navigation component

### Future Enhancements
- [ ] Mobile-first CRM redesign (full implementation - see roadmap below)
- [ ] Swipe gestures for request cards
- [ ] "Park mode" shopping list interface

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
- **Password:** <ask admin>
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

## Session: December 26-27, 2025 - WDWNT Image Blocking & Filter Bug Fixes

### WDWNT CloudFront Blocking Issue

**Problem:** WDWNT started blocking image requests with 403 Forbidden errors from CloudFront. This affected all images from `media.wdwnt.com`.

**Root Cause:** WDWNT's CloudFront CDN blocks requests from server IPs (likely anti-hotlinking/bot protection).

**Solution Implemented:** RSS Content Fallback

1. Modified `feedFetcher.ts` to use RSS `content:encoded` field when scraping fails
2. Images are extracted from RSS HTML content using regex
3. Images are downloaded and stored to S3, replacing WDWNT URLs

**Files Modified:**
- `/src/lib/ai/feedFetcher.ts` - Added RSS fallback with `contentEncoded` support (lines 516-523)

**RSS Feed Details:**
- WDWNT RSS retains ~15 items (~8 hours of content)
- 30-minute cron interval is sufficient to catch all new items

### Scripts Created for Image Recovery

**`/scripts/fix-wdwnt-images.ts`** - Original script to fix blocked WDWNT images
**`/scripts/fix-wdwnt-images-v2.ts`** - Enhanced version with manual URL mappings
**`/scripts/find-wdwnt-images.ts`** - Find working URLs from RSS content
**`/scripts/check-remaining.ts`** - Check for remaining blocked images
**`/scripts/clear-blocked-images.ts`** - Set aged-out blocked images to placeholder

### Items with Permanently Blocked Images

These items aged out of RSS before we could get working URLs:
- Gabby's Dollhouse Light-Up Hat (`36a46987-e30e-470f-813e-d272230ec68c`)
- Sorcery Mickey Coffee Mug (`18f1386d-156a-4dfc-b0eb-d4f08a53c2e6`)
- Universal Orlando Resort Reusable Shopping Bag - Small (`f6f279b8-cd5a-4ca3-949c-507c5d3b1dab`)
- Universal Orlando Resort Reusable Shopping Bag - Large (`b8dc068c-87f6-4337-863e-98f1addf709c`)

These have been set to `/placeholder.svg`.

### Article Filter Bug Fix - "dca" Matching "wildcats"

**Problem:** High School Musical Wildcats Sweatshirt article was being skipped as "non-Orlando" despite being a Disney World item.

**Root Cause:** The keyword `"dca"` (Disney California Adventure) was matching as a substring inside `"wildcats"` (wil**dca**ts).

```javascript
// OLD: Simple substring matching
const isNonOrlandoArticle = nonOrlandoKeywords.some(kw => lowerTitle.includes(kw));
// "wildcats".includes("dca") returns TRUE - bug!
```

**Fix Applied:** Word boundary regex matching for short keywords

```javascript
// NEW: Word boundary matching for short keywords
const nonOrlandoKeywords = ['disneyland', 'california adventure', 'anaheim', ...];
const nonOrlandoShortKeywords = ['dca', 'nyc']; // These need word boundary matching
const isNonOrlandoArticle = nonOrlandoKeywords.some(kw => lowerTitle.includes(kw)) ||
  nonOrlandoShortKeywords.some(kw => new RegExp(`\\b${kw}\\b`).test(lowerTitle));
```

**File Modified:**
- `/src/lib/ai/feedFetcher.ts` - Lines 475-479

**Result:** High School Musical Wildcats Sweatshirt now properly imports.

### Image Cropping Safety

**Verified:** The ImageCropper component creates NEW files with naming pattern `cropped-{timestamp}.jpg`. Original images are preserved in `original_image_url` database field. AI and cropping never modify source images.

**Files Verified:**
- `/src/components/admin/ImageCropper.tsx` - Creates new files, doesn't modify originals
- `/src/app/admin/releases/[id]/page.tsx` - Stores originals before cropping

### S3 Image Storage

All images are now stored in S3 bucket `enchantedbucket`:
- Path format: `releases/{release_id}/{filename}.jpg`
- Images downloaded from RSS/blogs are stored to S3
- S3 URLs replace original source URLs in database

---

## Session: December 27, 2025 - Shippo Shipping Integration

### Overview

Migrated from Pirate Ship to Shippo for shipping. Built complete shipping quote and label purchase workflow.

### Features Implemented

1. **Shipping Quote Page** (`/admin/shipping-quote`)
   - Customer search with address auto-fill
   - Preset package sizes (Small Box, Medium Box, Large Box, Flat Rate Envelope)
   - Custom dimensions input with validation
   - Rate comparison for USPS and UPS carriers
   - Copy-to-clipboard for sharing quotes with customers
   - Direct link to purchase labels

2. **Shippo API Routes**
   - `/api/shippo/rates` - Get shipping quotes
   - `/api/shippo/purchase` - Purchase shipping labels
   - `/api/shippo/webhook` - Receive tracking updates

3. **Navigation Update**
   - Added "Shipping Quote" to admin sidebar with Calculator icon

### Files Created

**API Routes:**
- `/src/app/api/shippo/rates/route.ts` - Validates addresses, calls Shippo, returns sorted rates
- `/src/app/api/shippo/purchase/route.ts` - Purchases labels, returns tracking info and label URL
- `/src/app/api/shippo/webhook/route.ts` - Updates shipment status on tracking events

**UI:**
- `/src/app/admin/shipping-quote/page.tsx` - Standalone quote page with customer lookup

### Files Modified

- `/src/app/admin/layout.tsx` - Added Calculator icon and Shipping Quote nav item
- `/src/app/admin/shipments/page.tsx` - Fixed Supabase query (explicit FK reference)
- `/.env.local` - Added ship-from address configuration

### Configuration

**Ship-From Address (`.env.local`):**
```env
SHIPPO_FROM_NAME="Enchanted Park Pickups"
SHIPPO_FROM_STREET1="4238 Cortland Drive"
SHIPPO_FROM_CITY="Davenport"
SHIPPO_FROM_STATE="FL"
SHIPPO_FROM_ZIP="33837"
```

### Bug Fixes

1. **Supabase Ambiguous Relationship**
   - Error: `Could not embed because more than one relationship was found`
   - Fix: Added explicit FK reference `!shipments_request_id_fkey` to query

2. **Custom Size Validation**
   - Error: API error when custom parcel fields were empty
   - Fix: Added validation to check all dimensions before API call

### Shippo Webhook Setup

Register webhook URL in Shippo Dashboard:
```
https://enchantedparkpickups.com/api/shippo/webhook
```

Events to subscribe:
- `track_updated` - Tracking status changes

### Workflow

1. Admin navigates to Shipping Quote page
2. Searches for customer (address auto-fills)
3. Selects package size or enters custom dimensions
4. Clicks "Get Rates" to fetch USPS/UPS options
5. Copies rate info to share with customer
6. Clicks "Buy Label" to proceed to purchase (future: integrate with invoices)

---

## Session: December 27, 2025 - Customer Import from Pirate Ship

### Overview

Imported 464 customers from Pirate Ship transaction history using Excel export and GraphQL API scraping.

### Import Process

1. **Excel Import** (`/scripts/import-pirateship-customers.ts`)
   - Read `Pirate Ship Transactions.xlsx` from Downloads
   - Extracted unique customers with addresses
   - Imported 464 customers to Supabase

2. **Address Scraping** (`/scripts/scrape-pirateship-addresses.ts`)
   - Discovered Pirate Ship uses GraphQL API internally
   - Authenticated with existing session cookies
   - Scraped full addresses for 463 customers
   - Added phone/company data for 9 customers

### Scripts Created

- `/scripts/import-pirateship-customers.ts` - Excel import
- `/scripts/scrape-pirateship-addresses.ts` - Address scraping via GraphQL

### Note

Pirate Ship does not have a public API. Address scraping required browser session authentication.

---

## Session: December 27, 2025 - Label Purchase, Portal, Analytics & Trip Integration

### 1. Label Purchase Integration

**Location:** `/admin/shipping-quote`

Added complete label purchase workflow to the shipping quote page:

**Features:**
- Confirmation dialog showing rate details before purchase
- Success dialog with tracking number and label download
- Copy tracking number to clipboard
- Direct label PDF download
- Auto-saves shipment to database when customer selected

**Database Migration Required:**
```sql
-- Run in Supabase SQL Editor
ALTER TABLE shipments ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_name TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_street1 TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_city TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_state TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS to_zip TEXT;
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
```

**Files Modified:**
- `/src/app/admin/shipping-quote/page.tsx` - Full purchase flow with dialogs
- `/src/lib/database.types.ts` - Updated shipments type

### 2. Customer Portal

**Location:** `/portal`

Public page where customers can view their requests, invoices, and shipments.

**Features:**
- Email/password login (uses customer email from database)
- Tabbed interface: Requests | Invoices | Shipments
- Request details with status badges and item descriptions
- Invoice list with amounts and payment status
- Shipment tracking with carrier badges

**Files Modified:**
- `/src/app/portal/page.tsx` - Added tabs and shipment/invoice display
- `/src/app/api/portal/login/route.ts` - Added invoices and shipments to response

### 3. Dashboard Analytics

**Location:** `/admin` (Dashboard)

Added visual analytics to the admin dashboard.

**Features:**
- **Revenue Trend Chart:** 6-month AreaChart showing paid invoice totals
- **Request Status Chart:** Donut PieChart with status breakdown
- Color-coded status indicators

**Libraries Used:**
- Recharts (AreaChart, PieChart, Tooltip, ResponsiveContainer)

**Files Modified:**
- `/src/app/admin/page.tsx` - Added charts with data fetching

### 4. Shopping Trip Integration

**Printable Shopping Lists** (`/admin/trips/[id]`)
- "Print List" button in trip detail page
- Print-optimized CSS with checkboxes and price fields
- Clean header with trip date, parks, shopper info
- Items grouped by park

**Trip Assignment from Requests** (`/admin/requests/[id]`)
- Shopping Trip card in request info grid
- Dropdown to select from upcoming trips
- "Plan New Trip" button
- Unassign from trip option
- Auto-updates request status to "scheduled"

**Files Modified:**
- `/src/app/admin/trips/[id]/page.tsx` - Print button and print-friendly layout
- `/src/app/admin/requests/[id]/page.tsx` - Trip assignment card
- `/src/app/globals.css` - Print media query styles

---

## Session: December 27, 2025 - Infrastructure Features (Disabled by Default)

### Overview

Built all remaining infrastructure features in a disabled-by-default pattern. Each feature requires specific environment variables to be enabled.

### 1. PayPal Integration

**Status:** DISABLED (needs PAYPAL_CLIENT_ID and PAYPAL_SECRET)

**Files Created:**
- `/src/app/api/payments/paypal/create-invoice/route.ts` - Creates PayPal invoice from CRM invoice
- `/src/app/api/payments/paypal/webhook/route.ts` - Handles INVOICING.INVOICE.PAID/CANCELLED events

**To Enable:**
```env
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_SECRET=your-secret
PAYPAL_MODE=sandbox  # or 'live' for production
```

**Workflow:**
1. Invoice created in CRM
2. Admin clicks "Send PayPal Invoice"
3. API creates PayPal invoice draft and sends to customer
4. Customer pays via PayPal link
5. Webhook updates CRM invoice and request status

### 2. Stripe Integration

**Status:** DISABLED (needs STRIPE_SECRET_KEY)

**Files Created:**
- `/src/app/api/payments/stripe/create-checkout/route.ts` - Creates Stripe Checkout Session
- `/src/app/api/payments/stripe/webhook/route.ts` - Handles checkout.session.completed event

**To Enable:**
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Workflow:**
1. Invoice ready in CRM
2. Customer clicks "Pay with Card"
3. Redirects to Stripe Checkout
4. On success, webhook updates invoice status

### 3. Email Notifications

**Status:** DISABLED (needs SMTP_HOST)

**Files Created:**
- `/src/lib/email/templates/invoiceEmail.ts` - Invoice ready email (HTML + text)
- `/src/lib/email/templates/shippingEmail.ts` - Shipping/delivery notifications
- `/src/app/api/email/send/route.ts` - Unified email send API

**Email Types:**
- `invoice` - Invoice ready with payment link
- `shipping` - Package shipped with tracking
- `delivery` - Package delivered confirmation

**To Enable:**
```env
SMTP_HOST=mail.magicshineautospa.com
SMTP_PORT=587
SMTP_USER=hello@enchantedparkpickups.com
SMTP_PASS=<see .env.local>
```

**Shippo Integration:**
Enhanced `/src/app/api/shippo/webhook/route.ts` to send delivery emails automatically when SMTP is configured.

### 4. Mobile Bottom Navigation

**Status:** READY (component available)

**Files Created:**
- `/src/components/admin/MobileNav.tsx` - Bottom navigation with quick action FAB

**Features:**
- 5-icon bottom navigation (Home, Customers, Requests, Trips, Settings)
- Floating Action Button for quick add
- Optimized for touch (44px+ tap targets)

**To Enable:**
Import and add to `/src/app/admin/layout.tsx`:
```tsx
import { MobileNav, QuickActionFab } from '@/components/admin/MobileNav';
// Add at bottom of layout
<MobileNav />
<QuickActionFab />
```

### 5. Public Shop Page

**Status:** DISABLED (needs ENABLE_SHOP=true)

**Files Created/Modified:**
- `/src/app/api/shop/inventory/route.ts` - Shop inventory API
- `/src/app/shop/page.tsx` - Updated to fetch from API

**To Enable:**
```env
ENABLE_SHOP=true
```

**Features:**
- Fetches from `unclaimed_inventory` table
- Filterable product grid
- Add to cart functionality (ready for Stripe integration)

### 6. PWA / Offline Support

**Status:** READY (assets created)

**Files Created:**
- `/public/manifest.json` - PWA manifest with app name, icons, shortcuts
- `/public/sw.js` - Service worker with:
  - Offline page caching
  - Push notification handling
  - Background sync support
- `/public/offline.html` - Friendly offline fallback page

**To Enable:**
Add to `/src/app/layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1e293b" />
```

Register service worker in client component:
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

### 7. Voice Input

**Status:** READY (component available)

**Files Created:**
- `/src/components/VoiceInput.tsx` - Voice input button and hook

**Features:**
- Web Speech API (Chrome, Safari, Edge)
- Real-time transcription
- `VoiceInput` component for forms
- `useVoiceInput` hook for custom integration

**Usage:**
```tsx
import { VoiceInput, useVoiceInput } from '@/components/VoiceInput';

// Component usage
<VoiceInput onResult={(text) => setItemName(text)} />

// Hook usage
const { transcript, isListening, start, stop } = useVoiceInput();
```

### 8. Push Notifications

**Status:** DISABLED (needs VAPID keys)

**Files Created:**
- `/src/lib/notifications/push.ts` - Web Push infrastructure
- `/src/app/api/notifications/push/route.ts` - Subscription management API

**To Enable:**
```env
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_EMAIL=hello@enchantedparkpickups.com
```

**Database Migration:**
```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, endpoint)
);
```

**Features:**
- Subscribe/unsubscribe from browser
- Send notifications with custom actions
- Rate limiting for bulk sends

### 9. SMS Notifications (Twilio)

**Status:** DISABLED (needs TWILIO credentials)

**Files Created:**
- `/src/lib/notifications/sms.ts` - Twilio SMS integration

**To Enable:**
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**Templates Included:**
- `SMSTemplates.invoiceReady(invoiceNumber, amount, url)`
- `SMSTemplates.orderShipped(trackingNumber, carrier)`
- `SMSTemplates.orderDelivered()`
- `SMSTemplates.newRelease(itemName)`

**Usage:**
```typescript
import { sendSMS, isSMSEnabled } from '@/lib/notifications/sms';

if (isSMSEnabled()) {
  await sendSMS('+15551234567', 'Your order has shipped!');
}
```

---

## Session: December 27, 2025 - Notification Management & Invoice Improvements

### Notification Management System

**Location:** `/admin/notifications`

Built a comprehensive admin interface for managing email and SMS notifications with database-stored templates.

**Features:**

1. **Settings Tab**
   - Enable/disable email and SMS globally
   - Configure from name/email address
   - Toggle which events trigger notifications:
     - Invoice Ready
     - Order Shipped
     - Order Delivered
     - New Release Alerts

2. **Email Templates Tab**
   - Edit HTML and plain text email templates
   - Preview emails in iframe
   - Test send to any email address
   - Enable/disable individual templates

3. **SMS Templates Tab**
   - Edit SMS message text
   - Character count with multi-message warning
   - Test send to any phone number

4. **History Tab**
   - View last 50 sent notifications
   - Status tracking (sent/failed/pending)
   - Recipient and timestamp info

**Template Variables:**
Templates use `{{variable}}` syntax:
- `{{customer_name}}`, `{{invoice_number}}`, `{{total_amount}}`
- `{{tracking_number}}`, `{{carrier}}`, `{{tracking_url}}`
- `{{item_name}}`, `{{item_price}}`, `{{park}}`

**Files Created:**
- `/src/app/admin/notifications/page.tsx` - Admin UI with 4 tabs
- `/src/lib/notifications/service.ts` - Notification service using DB templates
- `/src/app/api/notifications/test/route.ts` - Test send endpoint
- `/supabase/migrations/20241227_notification_templates.sql` - DB schema

**Database Tables:**
- `notification_templates` - Editable email/SMS templates
- `notification_settings` - Global notification settings
- `notification_log` - Tracks all sent notifications

### Invoice Page Improvements

**Bug Fix:** Fixed Supabase ambiguous relationship error
```typescript
// Changed from:
request:requests(...)
// To:
request:requests!invoices_request_id_fkey(...)
```

**New Invoice Page** (`/admin/invoices/new`)
- Customer search and selection dialog
- Optional linking to existing requests
- Dynamic line items (add/remove)
- Shipping cost field
- Auto-calculated Florida tax (6.5%)
- Real-time total calculation
- Notes field

**Files Created/Modified:**
- `/src/app/admin/invoices/page.tsx` - Fixed query, added "New Invoice" button
- `/src/app/admin/invoices/new/page.tsx` - New invoice creation page

---

## Feature Status Summary

| Feature | Status | Enable With |
|---------|--------|-------------|
| PayPal Integration | 🔴 Disabled | PAYPAL_CLIENT_ID, PAYPAL_SECRET |
| Stripe Integration | 🔴 Disabled | STRIPE_SECRET_KEY |
| Email Notifications | 🔴 Disabled | SMTP_HOST |
| SMS (Twilio) | 🔴 Disabled | TWILIO credentials |
| Notification Management | 🟢 Active | Database templates ready |
| Mobile Navigation | 🟡 Ready | Import component |
| Public Shop | 🔴 Disabled | ENABLE_SHOP=true |
| PWA/Offline | 🟡 Ready | Add manifest link |
| Voice Input | 🟢 Available | Import component |
| Push Notifications | 🔴 Disabled | VAPID keys |

---

## Session: December 27, 2025 - Advanced Features Implementation

### Overview

Implemented 4 major features to enhance the CRM:
1. Advanced Pricing Settings
2. AI Location Extraction for RSS Feeds
3. Shopping Trip Store/Land Grouping
4. Full CRM Notification Templates

---

### Feature 1: Advanced Pricing Settings

**Location:** `/admin/settings`

Added comprehensive pricing controls for invoicing with credit card fee passthrough and volume discounts.

**New Settings:**

| Setting | Default | Description |
|---------|---------|-------------|
| CC Processing Fee % | 2.9% | PayPal/Stripe percentage fee |
| Fixed Transaction Fee | $0.30 | Per-transaction fee |
| Item Markup % | 15% | Added to item cost for profit |
| Shipping Markup % | 0% | Added to shipping for handling |
| Volume Discount Tiers | $500/5%, $1000/10% | Automatic bulk discounts |

**Files Created:**
- `/src/lib/pricing/calculator.ts` - Pricing calculation utility
  - `getPricingSettings()` - Fetch settings from database
  - `calculatePricing()` - Calculate full invoice breakdown
  - Returns: items_subtotal, pickup_fees, markup, discount, tax, shipping, CC fees, grand_total

**Files Modified:**
- `/src/app/admin/settings/page.tsx` - Added pricing cards with editable fields and discount tier management

---

### Feature 2: AI Location Extraction

Updated the AI article parser to extract specific store and land locations from RSS articles.

**New Data Extracted:**
```typescript
interface ProductLocation {
  park: ParkLocation;        // disney_mk, universal_usf, etc.
  land?: string;             // Fantasyland, Diagon Alley, etc.
  store?: string;            // Emporium, Creations Shop, etc.
  is_confirmed: boolean;     // true if explicitly mentioned in article
}
```

**Common Store Names:**
- Disney: Emporium (MK), Creations Shop (EPCOT), Celebrity 5 & 10 (HS), Island Mercantile (AK), World of Disney (Springs)
- Universal: Weasleys' Wizard Wheezes (Diagon Alley), Honeydukes (Hogsmeade), Universal Studios Store

**Files Modified:**
- `/src/lib/ai/parseArticle.ts` - Updated AI prompt for location extraction, added ProductLocation interface
- `/src/lib/ai/feedFetcher.ts` - Saves locations JSONB to new_releases

**Database Migration:**
```sql
-- /supabase/migrations/20241227_release_locations.sql
ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS idx_new_releases_locations ON new_releases USING GIN (locations);
```

---

### Feature 3: Shopping Trip Store Grouping

Updated the shopping trip detail page to group items by store within each park for efficient shopping.

**New UI Structure:**
```
Disney (15 items in 4 locations)
├── Emporium • Main Street U.S.A.  (5 items)
│   ├── Mickey Ear Hat - for John
│   └── Spirit Jersey - for Sarah
├── Creations Shop • EPCOT  (3 items)
│   └── Figment Plush - for Mike
└── General / Unknown Location  (7 items)
    └── Items without specific store info
```

**Files Created:**
- `/supabase/migrations/20241227_request_item_locations.sql` - Adds store_name, land_name to request_items

**Files Modified:**
- `/src/lib/database.types.ts` - Added store_name, land_name to request_items Row
- `/src/app/admin/trips/[id]/page.tsx` - Updated grouping logic and UI with store sections

---

### Feature 4: Full CRM Notification Templates

Added 8 new notification templates for complete customer journey coverage (12 total templates).

**New Templates:**

| Trigger | Event | Email | SMS |
|---------|-------|-------|-----|
| welcome_new_customer | Account created | Yes | Yes |
| request_received | Request submitted | Yes | Yes |
| request_assigned_to_trip | Added to shopping trip | Yes | Yes |
| shopping_started | Trip begins | Yes | Yes |
| item_found | Item located | Yes | Yes |
| item_not_found | Item unavailable | Yes | Yes |
| payment_received | Payment confirmed | Yes | Yes |
| special_offer | Promo for returning customers | Yes | Yes |

**Existing Templates (from previous session):**
- invoice_ready
- order_shipped
- order_delivered
- new_release

**Template Variables:**
- Customer: `{{customer_name}}`, `{{portal_url}}`
- Request: `{{request_id}}`, `{{items_list}}`, `{{items_list_text}}`
- Trip: `{{trip_date}}`, `{{parks}}`
- Item: `{{item_name}}`, `{{actual_price}}`, `{{store_location}}`, `{{reason}}`
- Payment: `{{amount_paid}}`, `{{payment_method}}`, `{{payment_date}}`
- Offer: `{{discount_amount}}`, `{{promo_code}}`, `{{expiry_date}}`, `{{shop_url}}`

**New Notification Settings:**
- `send_welcome_notifications`
- `send_request_notifications`
- `send_shopping_notifications`
- `send_payment_notifications`
- `send_offer_notifications`

**Files Created:**
- `/supabase/migrations/20241227_crm_notification_templates.sql` - All 8 new email + SMS templates

---

### Database Migrations (Run in Order)

```bash
# 1. Release locations
psql -f /supabase/migrations/20241227_release_locations.sql

# 2. Request item locations
psql -f /supabase/migrations/20241227_request_item_locations.sql

# 3. CRM notification templates
psql -f /supabase/migrations/20241227_crm_notification_templates.sql
```

---

## Session: December 27, 2025 (Part 3) - Feature 6, 7, Epic Universe

### Feature 6: Store Location Dropdowns

Created comprehensive store database for all Orlando theme parks with cascading dropdown UI.

**Database Schema:**
```sql
CREATE TABLE park_stores (
  id UUID PRIMARY KEY,
  park TEXT NOT NULL,        -- "Magic Kingdom", "EPCOT", etc.
  land TEXT,                  -- "Fantasyland", "World Showcase - Japan", etc.
  store_name TEXT NOT NULL,   -- "Emporium", "Mitsukoshi", etc.
  store_type TEXT DEFAULT 'gift_shop',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);
```

**Files Created:**
- `/supabase/migrations/20241227_park_stores.sql` - Database schema
- `/scripts/seed-park-stores.ts` - Comprehensive seed data (~200 stores)
- `/scripts/run-park-stores-migration.ts` - Migration helper
- `/src/app/api/park-stores/route.ts` - API endpoint for fetching stores
- `/src/components/StoreLocationPicker.tsx` - Cascading dropdown component

**Store Coverage:**
- Magic Kingdom (5 lands, ~25 stores)
- EPCOT (World Celebration, Discovery, Nature, all World Showcase pavilions, ~40 stores)
- Hollywood Studios (6 areas including Galaxy's Edge, ~25 stores)
- Animal Kingdom (6 lands including Pandora, ~15 stores)
- Disney Springs (~15 stores)
- Universal Studios Florida (8 areas including Diagon Alley, ~25 stores)
- Islands of Adventure (8 lands including Hogsmeade, ~25 stores)
- CityWalk (~5 stores)
- Epic Universe (5 lands with placeholder stores - Coming 2025)
- SeaWorld (~10 stores)

**Component Features:**
- Cascading dropdowns: Park → Land → Store
- "+ Add Custom Location" option for unlisted stores
- Fetches epic_universe_enabled setting to show/hide Epic Universe
- "Coming Soon" label when Epic Universe is disabled

### Feature 7: Screenshot Request Parser

AI-powered screenshot parser that extracts customer request details from images of text messages, DMs, emails, etc.

**Files Created:**
- `/src/lib/ai/parseScreenshot.ts` - AI parsing with Claude vision
- `/src/app/api/requests/parse-screenshot/route.ts` - API endpoint
- `/src/components/ScreenshotRequestParser.tsx` - UI component

**Extracted Data:**
```typescript
interface ParsedCustomerRequest {
  items: Array<{
    item_name: string;
    quantity: number;
    estimated_price: number | null;
    category: ItemCategory | null;
    notes: string | null;
  }>;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  park_preference: ParkLocation | null;
  location_hints: string[];
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  budget_notes: string | null;
  shipping_notes: string | null;
  general_notes: string | null;
  confidence_score: number; // 0-100
}
```

**API Endpoints:**
- `POST /api/requests/parse-screenshot` - Parse uploaded screenshot(s)
- `GET /api/requests/parse-screenshot` - API documentation
- Supports multipart/form-data (file upload) and JSON (base64)
- Multiple screenshot support for conversation threads

### Epic Universe Toggle

Added Epic Universe to parks list with admin-controlled "Coming Soon" toggle.

**Changes:**
- Updated `/src/lib/database.types.ts` - Added `universal_epic` to ParkLocation
- Updated `/src/app/admin/settings/page.tsx` - Added Park Features card with toggle
- Updated `/src/components/StoreLocationPicker.tsx` - Respects epic_universe_enabled setting

**Settings:**
- `epic_universe_enabled` (boolean) - Toggle in Admin > Settings > Park Features
- When OFF: Shows "Epic Universe - Coming Soon" (disabled) in dropdown
- When ON: Shows Epic Universe with all its stores

**Admin UI:**
```
Park Features
├── Epic Universe
│   ├── Toggle: ON/OFF
│   ├── Badge: "Coming Soon" (when OFF) or "Active" (when ON)
│   └── Note: "Toggle on when the park opens in May 2025"
```

### Database Migrations (Run in Order)

```bash
# 4. Park stores table
# Run in Supabase SQL Editor or execute:
npx tsx scripts/run-park-stores-migration.ts

# Then seed the data:
npx tsx scripts/seed-park-stores.ts
```

---

## Session: December 28, 2025 - Mobile UX Improvements

### Overview

Several improvements to mobile user experience for the admin interface.

### 1. Request List - Show All Items

**Problem:** Request list only showed first item name with "+X more" count.

**Solution:** Updated to show all item names comma-separated in the subtitle.

**Files Modified:**
- `/src/app/admin/requests/page.tsx`
  - Changed `first_item_name?: string` to `item_names: string[]`
  - Updated mapping to collect all item names
  - Display shows `item_names.join(', ')` with truncation via CSS

**Result:**
```
Before: "Hair Bows +1 more"
After:  "Hair Bows, Spirit Jersey"
```

### 2. Mobile FAB Menu - From Screenshot Option

**Problem:** The floating action button (FAB) on mobile only opened a quick add form. The "From Screenshot" option was hidden in the header dropdown which users weren't finding.

**Solution:** Replaced FAB behavior with a bottom sheet menu offering both options prominently.

**Files Modified:**
- `/src/app/admin/requests/page.tsx`
  - Added `showMobileMenu` state
  - Replaced QuickAddRequest with custom bottom sheet
  - Two options: "From Screenshot" (highlighted in gold) and "Manual Entry"
  - Removed unused QuickAddRequest import

**UI:**
```
┌─────────────────────────────────────┐
│           New Request               │
├─────────────────────────────────────┤
│ [📷] From Screenshot                │
│      Upload a message screenshot    │
│                                     │
│ [✏️] Manual Entry                   │
│      Enter request details manually │
│                                     │
│           [Cancel]                  │
└─────────────────────────────────────┘
```

### 3. Screenshot Upload - Gallery Instead of Camera

**Problem:** On Android, tapping the upload area immediately opened the camera instead of the gallery/file picker.

**Root Cause:** The file input had `capture="environment"` which forces camera on mobile.

**Solution:** Removed the `capture` attribute so mobile shows a picker with Gallery/Camera options.

**Files Modified:**
- `/src/components/admin/SmartScreenshotParser.tsx`
  - Removed `capture="environment"` from file input (line 922)

**Result:**
- Android: Shows picker with Gallery, Files, Camera options
- iOS: Shows picker with Photo Library, Camera options

### 4. Admin Request Delete Function

**Problem:** No way to delete requests from the admin interface.

**Solution:** Added delete button with confirmation dialog.

**Files Modified:**
- `/src/app/admin/requests/[id]/page.tsx`
  - Added Trash2 icon import
  - Added `showDeleteDialog` and `deleting` state
  - Added `deleteRequest` function (deletes items first, then request)
  - Added trash icon button in header
  - Added AlertDialog confirmation

**Workflow:**
1. Admin clicks trash icon in request detail header
2. Confirmation dialog appears
3. On confirm: deletes request_items first, then request
4. Redirects to /admin/requests with success toast

---

*Last Updated: December 28, 2025*
*Created for project continuity*
