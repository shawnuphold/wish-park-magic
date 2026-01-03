# Cron Schedule Documentation

## Overview

This document describes the automated tasks that run on a schedule to keep the Enchanted Park Pickups CRM data fresh.

## Cron Jobs

### 1. RSS Feed Processing
**Script:** `scripts/process-feeds.ts`
**Schedule:** Every 4 hours
**Purpose:** Discovers new merchandise releases from blog RSS feeds

```bash
# Run every 4 hours
0 */4 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/process-feeds.ts >> /var/log/enchanted-feeds.log 2>&1
```

**What it does:**
- Fetches RSS feeds from configured blog sources (WDW News Today, Inside the Magic, etc.)
- Parses articles for merchandise mentions using AI
- Creates new releases or updates existing ones
- Sends email notifications to customers with matching preferences
- Stores images from articles in S3

### 2. Online Availability Check
**Script:** `scripts/check-online-availability.ts`
**Schedule:** Every 6 hours
**Purpose:** Determines if releases are park exclusive or available online

```bash
# Run every 6 hours
0 */6 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/check-online-availability.ts >> /var/log/enchanted-availability.log 2>&1
```

**What it does:**
- Searches shopDisney for releases that haven't been checked in 7+ days
- Updates `available_online` and `park_exclusive` flags
- Records price and URL for admin reference
- Rate limited to respect shopDisney servers

### 3. shopDisney Scraper
**Script:** `scripts/scrape-shopdisney.ts`
**Schedule:** Daily at 6 AM
**Purpose:** Discovers new products on shopDisney for intel

```bash
# Run daily at 6 AM
0 6 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/scrape-shopdisney.ts >> /var/log/enchanted-shopdisney.log 2>&1
```

**What it does:**
- Scrapes shopDisney new arrivals pages
- Matches products against existing releases
- Updates availability status for matched releases
- Creates new releases for unmatched products (for admin review)
- **IMPORTANT:** shopDisney images are admin-only, never shown to customers

## Setup Instructions

### 1. Install crontab
```bash
crontab -e
```

### 2. Add all cron jobs
```bash
# Enchanted Park Pickups CRM Cron Jobs

# RSS Feed Processing - every 4 hours
0 */4 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/process-feeds.ts >> /var/log/enchanted-feeds.log 2>&1

# Online Availability Check - every 6 hours
0 */6 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/check-online-availability.ts >> /var/log/enchanted-availability.log 2>&1

# shopDisney Scraper - daily at 6 AM
0 6 * * * cd /home/ubuntu/enchanted-park-crm && npx tsx scripts/scrape-shopdisney.ts >> /var/log/enchanted-shopdisney.log 2>&1
```

### 3. Create log directory with proper permissions
```bash
sudo touch /var/log/enchanted-feeds.log
sudo touch /var/log/enchanted-availability.log
sudo touch /var/log/enchanted-shopdisney.log
sudo chown ubuntu:ubuntu /var/log/enchanted-*.log
```

## Manual Execution

You can run any script manually for testing:

```bash
cd /home/ubuntu/enchanted-park-crm
npx tsx scripts/process-feeds.ts
npx tsx scripts/check-online-availability.ts
npx tsx scripts/scrape-shopdisney.ts
```

## Monitoring

Check logs for each job:

```bash
tail -f /var/log/enchanted-feeds.log
tail -f /var/log/enchanted-availability.log
tail -f /var/log/enchanted-shopdisney.log
```

## Environment Variables Required

These scripts require the following environment variables in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_S3_REGION=...

# Email (your own mail server)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=releases@yourdomain.com
SMTP_PASS=your-password
EMAIL_FROM=Enchanted Park Pickups <releases@yourdomain.com>
```

## Troubleshooting

### Script fails with "Cannot find module"
Make sure you're running from the project directory and dependencies are installed:
```bash
cd /home/ubuntu/enchanted-park-crm
npm install
```

### Puppeteer crashes
Ensure Chrome/Chromium is installed:
```bash
sudo apt-get install chromium-browser
```

### Emails not sending
Check that RESEND_API_KEY is set and the domain is verified in Resend dashboard.
