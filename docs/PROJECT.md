# Enchanted Park Pickups - Project Overview

A CRM and e-commerce platform for a personal shopping service specializing in Walt Disney World, Universal Studios, and SeaWorld merchandise.

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Library:** React 18
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** TanStack Query (React Query)
- **Animations:** Framer Motion
- **Theming:** next-themes (light/dark mode)
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod validation

### Backend
- **API:** Next.js API Routes (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with SSR support
- **File Storage:** AWS S3
- **Image Processing:** Sharp

### Integrations
- **Payments:** Stripe, PayPal
- **Shipping:** Shippo API
- **Notifications:** Telegram (Telegraf), Web Push, Nodemailer
- **AI:** Anthropic Claude SDK
- **Vision:** Google Cloud Vision
- **Scraping:** Puppeteer, Cheerio, RSS Parser

### DevOps
- **Package Manager:** npm (with Bun lockfile)
- **Linting:** ESLint
- **Build:** Next.js

## File Structure

```
enchanted-park-crm/
├── docs/                    # Project documentation
├── migrations/              # Legacy SQL migrations
├── public/                  # Static assets
├── scripts/                 # Utility scripts (setup-admin, etc.)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── api/             # API route handlers
│   │   ├── auth/            # Authentication pages
│   │   ├── portal/          # Customer portal
│   │   └── [other pages]/   # Public pages
│   ├── assets/              # Images and media
│   ├── components/          # React components
│   │   ├── admin/           # Admin-specific components
│   │   ├── new-releases/    # Release tracking components
│   │   ├── park-shopping/   # Shopping list components
│   │   ├── shop/            # E-commerce components
│   │   └── ui/              # shadcn/ui components
│   ├── data/                # Mock data and constants
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Supabase client setup
│   └── lib/                 # Shared utilities
│       ├── ai/              # AI integration
│       ├── auth/            # Auth utilities
│       ├── customers/       # Customer utilities
│       ├── email/           # Email templates and sending
│       ├── hooks/           # Server-side hooks
│       ├── images/          # Image processing
│       ├── notifications/   # Push/Telegram notifications
│       ├── pricing/         # Price calculations
│       ├── releases/        # Release processing
│       ├── scraper/         # Web scraping
│       ├── supabase/        # Supabase client/middleware
│       ├── telegram/        # Telegram bot
│       └── validations/     # Zod schemas
├── supabase/
│   └── migrations/          # Supabase migrations
├── middleware.ts            # Next.js middleware (auth)
├── next.config.js           # Next.js configuration
├── tailwind.config.ts       # Tailwind configuration
└── package.json             # Dependencies
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `admin_users` | Staff accounts (admin, manager, shopper roles) |
| `customers` | Customer records with contact info and preferences |
| `customer_aliases` | Multiple identifiers per customer (FB, IG, email, phone) |
| `requests` | Shopping requests from customers |
| `request_items` | Individual items within each request (includes `reference_images TEXT[]`) |
| `shopping_trips` | Scheduled park visits for shopping |
| `invoices` | Invoice records with payment tracking |
| `invoice_items` | Line items on invoices |
| `shipments` | Shipping records with carrier tracking |

### New Releases System

| Table | Description |
|-------|-------------|
| `new_releases` | Product releases from blogs/RSS feeds |
| `release_article_sources` | Article sources mentioning products |
| `feed_sources` | RSS feed configuration |
| `processed_articles` | Tracking of processed articles |
| `customer_interests` | Customer category/park preferences |
| `release_notifications` | Sent notification tracking |
| `shopdisney_products` | shopDisney product tracking |

### Other Tables

| Table | Description |
|-------|-------------|
| `unclaimed_inventory` | Shop inventory for resale |
| `settings` | Key-value application settings |

### Key Enums/Types

- **RequestStatus:** pending → quoted → approved → scheduled → shopping → found → invoiced → paid → shipped → delivered
- **Park:** disney, universal, seaworld
- **ParkLocation:** disney_mk, disney_epcot, disney_hs, disney_ak, disney_springs, universal_usf, universal_ioa, universal_citywalk, universal_epic, seaworld, multiple
- **ItemCategory:** loungefly, ears, spirit_jersey, popcorn_bucket, pins, plush, apparel, drinkware, collectible, home_decor, toys, jewelry, other
- **ReleaseStatus:** rumored → announced → coming_soon → available → sold_out

### Business Constants
- Standard pickup fee: $6.00
- Specialty pickup fee: 10% (loungefly, popcorn_bucket)
- Florida tax rate: 6.5%

## API Routes

### Payments
- `POST /api/payments/stripe/create-checkout` - Create Stripe checkout
- `POST /api/payments/stripe/webhook` - Stripe webhook handler
- `POST /api/payments/paypal/create-invoice` - Create PayPal invoice
- `POST /api/payments/paypal/webhook` - PayPal webhook handler

### Customer Management
- `GET/POST /api/customers/[id]/aliases` - Customer aliases
- `DELETE /api/customers/[id]/aliases/[aliasId]` - Delete alias
- `GET/POST /api/customer-interests` - Customer interests
- `PUT/DELETE /api/customer-interests/[id]` - Manage interests

### Notifications
- `POST /api/notifications` - Send notifications
- `POST /api/notifications/push` - Web push notifications
- `POST /api/notifications/push/test` - Test push
- `POST /api/notifications/test` - Test notification
- `POST /api/telegram/webhook` - Telegram bot webhook
- `POST /api/telegram/setup` - Setup Telegram webhook

### Shopping Operations
- `GET /api/shopping/parks` - List parks with items
- `GET /api/shopping/[park]` - Get items for park
- `POST /api/shopping/items/[id]/found` - Mark item found
- `POST /api/shopping/items/[id]/not-found` - Mark not found
- `POST /api/shopping/items/[id]/reset` - Reset item status
- `GET /api/park-shopping/counts` - Get shopping counts
- `POST /api/park-shopping/items/[id]/found` - Mark found (alt)
- `POST /api/park-shopping/items/[id]/not-found` - Mark not found (alt)
- `POST /api/park-shopping/items/[id]/reset` - Reset (alt)
- `DELETE /api/park-shopping/items/[id]/delete` - Delete item

### Releases
- `GET/POST /api/releases` - List/create releases
- `GET/PUT/DELETE /api/releases/[id]` - Manage release
- `POST /api/releases/process` - Process new releases
- `POST /api/releases/refetch-image` - Refetch release image

### Shipping
- `POST /api/shippo/rates` - Get shipping rates
- `POST /api/shippo/purchase` - Purchase shipping label
- `POST /api/shippo/webhook` - Shippo tracking webhook

### Other
- `POST /api/upload` - File upload (S3)
- `POST /api/email/send` - Send email
- `POST /api/ai/analyze-screenshot` - AI screenshot analysis
- `GET /api/products/lookup` - Product lookup
- `GET /api/shop/inventory` - Get shop inventory
- `GET /api/park-stores` - Get park store data
- `POST /api/requests/parse-screenshot` - Parse request screenshot
- `POST /api/requests/parse-multi-customer` - Parse multi-customer request
- `GET/PUT /api/settings/product-lookup` - Product lookup settings
- `GET/POST /api/sources` - Manage feed sources
- `GET /api/image` - Image proxy

### Portal (Customer)
- `POST /api/portal/login` - Customer portal login
- `POST /api/portal/lookup/send-code` - Send verification code
- `POST /api/portal/lookup/verify-code` - Verify code

### Admin
- `POST /api/admin/run-migration` - Run database migration

### Authentication
- `GET /auth/callback` - OAuth/email link code exchange (redirects to appropriate page)
- Pages (not API routes):
  - `/auth/login` - Admin login page
  - `/auth/forgot-password` - Request password reset email
  - `/auth/reset-password` - Set new password after email verification
