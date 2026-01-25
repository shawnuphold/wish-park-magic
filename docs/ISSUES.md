# Issues Tracker

## Final Report - 2025-01-24

All 14 issues have been reviewed and closed.

| Category | Count | Issues |
|----------|-------|--------|
| **Bugs Fixed** | 6 | #001, #002, #004, #005, #007, #008 |
| **Features Implemented** | 1 | #014 |
| **Not Bugs** (feature exists) | 5 | #006, #010, #011, #012, #013 |
| **Config Required** | 1 | #009 |
| **Duplicate** | 1 | #003 |

### Key Fixes Applied:
- Request notes and price editing now works correctly (#001, #002)
- Shopping trip delete functionality added (#004)
- Customer placeholder email issue resolved (#005)
- Product images now save to `reference_images` array (#007)
- Nintendo Plush Headbands image manually fixed (#008)
- Null guard added to RSS scraper (#006)
- Admin forgot password / password reset flow implemented (#014)

### Features Already Existed:
- Customer list sorting (Name, Contact, Joined columns)
- Notification history filters (Type and Status dropdowns)
- PayPal reverse calculator ("To receive $X, request: $Y")
- Settings save success toast

### Pending Configuration:
- SMTP variables needed for email notifications (#009)

### Pending Dependencies:
Email-related features require SMTP configuration before they will work:
- **Password Reset Emails** (#014): Supabase can use its built-in email OR custom SMTP
- **Notification Emails** (#009): Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

To configure Supabase email (for password reset):
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Either use Supabase's built-in email service, or configure custom SMTP under Settings → Auth

---

## Summary

| Priority | Open | In Progress | Closed |
|----------|------|-------------|--------|
| P0 - Critical | 0 | 0 | 5 |
| P1 - High | 0 | 0 | 5 |
| P2 - Medium | 0 | 0 | 3 |
| P3 - Low | 0 | 0 | 1 |
| **Total** | **0** | **0** | **14** |

---

## CRITICAL (P0) - Data Loss / Core Functionality Broken

### ISSUE-001: Request Detail - Notes and price changes don't persist
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Request Management > Detail view
- **Bug**: When adding notes or changing price on a request, changes don't save. Stays in original state.
- **Tester**: Casey Barnett
- **Root Cause**:
  1. Price editing: `editingPrices` state not initialized when new items added
  2. Notes editing: No edit UI existed - notes were read-only
- **Fix**:
  1. Initialize `editingPrices` for newly added items in `addNewItem()`
  2. Added full notes editing UI with edit/save/cancel functionality

---

### ISSUE-002: Invoice price reverts when created from request
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Invoices > Create from Request
- **Bug**: Creating invoice from request has preset price. When changed and saved, it reverts to original.
- **Tester**: Casey Barnett
- **Root Cause**: `fetchInvoice()` called after save was falling back to `request_items` prices instead of `invoice_items`
- **Fix**: Removed `fetchInvoice()` call - local state update is sufficient since totals are calculated dynamically

---

### ISSUE-003: Inventory Add Item button greyed out
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Inventory page
- **Bug**: "Add Item" button visible but disabled/greyed out. Cannot add inventory items.
- **Tester**: Casey Barnett
- **Resolution**: Duplicate entry - removed

---

### ISSUE-004: Shopping Trips not displaying, can't delete
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Shopping Trips > List
- **Bug**: Upcoming trips don't show. Delete function not working.
- **Tester**: Casey Barnett
- **Root Cause**:
  1. Display issue: Could not reproduce - trips display correctly when data exists
  2. Delete: No delete functionality existed in the UI
  3. Found `database.types.ts` was out of sync with actual DB (fixed: status uses 'planned'/'in_progress'/'completed'/'cancelled')
- **Fix**:
  1. Added delete functionality with confirmation dialog and proper request unassignment
  2. Corrected `database.types.ts` to match actual database schema

---

### ISSUE-005: Duplicate customers from placeholder emails
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Customer creation/database
- **Bug**: Placeholder emails causing duplicate customer records. Schema should allow NULL instead.
- **Source**: Developer identified
- **Root Cause**: Two files were still generating placeholder emails like `@pending.local` when creating customers without email:
  1. `SmartScreenshotParser.tsx` line 628
  2. `MultiCustomerScreenshotParser.tsx` line 296
- **Fix**:
  1. Changed both files to use `null` instead of placeholder emails
  2. Migration already exists (`20260105_allow_null_email.sql`) to drop NOT NULL constraint and clean up existing placeholders

---

## HIGH (P1) - Features Not Working

### ISSUE-006: RSS scraper not adding new releases
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Backend scraper service
- **Bug**: New releases not being scraped/added to database.
- **Source**: Developer identified
- **Root Cause**: Not a bug - scraper correctly skips existing releases (shows as "duplicates updated"). The "0 new releases" is expected when all scraped items already exist in the database.
- **Fix**: Added null guard to `mapParkLocation()` in `feedFetcher.ts:139` for safety when AI returns null park values.

---

### ISSUE-007: Product images not saving to reference_images
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Request items creation
- **Bug**: When adding products to requests, images don't save to request_items.reference_images column.
- **Source**: Developer identified
- **Root Cause**: Schema mismatch - database only had `reference_image_url` (single string) but code was trying to insert `reference_images` (array). Supabase silently ignored the unknown column.
- **Fix**:
  1. Created migration `20260124_add_reference_images_array.sql` to add `reference_images TEXT[]` column
  2. Migration also copies existing `reference_image_url` values to the new array
  3. Updated `database.types.ts` to include `reference_images: string[]`

---

### ISSUE-008: New Releases image not loading
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: New Releases > Admin
- **Bug**: "Nintendo Plush Headbands" image not displaying.
- **Tester**: Casey Barnett
- **Root Cause**: `image_url` was empty in database. The scraper likely failed to extract/match an image for this product during processing.
- **Fix**: Manually updated the database record with image URL from source article:
  ```
  https://r2-media.wdwnt.com/2025/12/uor-nintendo-headband-discount-5276.jpg
  ```

---

### ISSUE-014: Admin forgot password / password reset functionality
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Admin login page
- **Feature Request**: No forgot password link or password reset flow exists for admin users.
- **Source**: User request
- **Implementation**:
  1. Added "Forgot password?" link to login page (`/src/app/auth/login/page.tsx`)
  2. Created forgot password page (`/src/app/auth/forgot-password/page.tsx`) - sends reset email via Supabase Auth
  3. Created reset password page (`/src/app/auth/reset-password/page.tsx`) - validates token, allows setting new password
  4. Created auth callback route (`/src/app/auth/callback/route.ts`) - handles code exchange from email links
- **Note**: Requires Supabase email configuration. Uses Supabase Auth's built-in `resetPasswordForEmail()` and `updateUser()` methods.

---

### ISSUE-009: Email notifications - SMTP not configured
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Notifications > Email > Test Send
- **Bug**: "Failed to send: SMTP not configured" error.
- **Tester**: Casey Barnett
- **Resolution**: Configuration required - not a code bug
- **Required env vars**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- **Note**: SMTP environment variables need to be added to `.env.local`. Code correctly checks for config and reports error when missing.

---

## MEDIUM (P2) - Missing Features

### ISSUE-010: Customer list - No sortable columns
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Customer Management > List
- **Bug**: Column headers not clickable for sorting.
- **Tester**: Casey Barnett
- **Resolution**: Not a bug - feature already exists
- **Finding**: Sortable columns implemented at `customers/page.tsx:165-185`. Name, Contact, and Joined columns are all sortable with click handlers and sort icons.
- **UX Note**: Sortable columns exist but may not be visually obvious. Consider adding: cursor-pointer class, hover underline, or sort icon always visible (not just on active column).

---

### ISSUE-011: Notification History - No filter column
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Notifications > History
- **Bug**: Cannot filter by email/SMS type. No filter column exists.
- **Tester**: Casey Barnett
- **Resolution**: Not a bug - feature already exists
- **Finding**: Filters implemented at `notifications/page.tsx:159-161, 891-910`. Type filter (All/Email/SMS) and Status filter (All/Sent/Delivered/Pending/Failed) exist as dropdown selects.
- **UX Note**: Filters exist in dropdown selects. User may have expected a column-based filter. Current implementation is correct.

---

### ISSUE-012: PayPal Fee Tool - No reverse calculator
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Tools > PayPal Fee
- **Bug**: Missing "To receive $X, charge $Y" reverse calculation feature.
- **Tester**: Casey Barnett
- **Resolution**: Not a bug - feature already exists
- **Finding**: Reverse calculator implemented at `tools/page.tsx:357-373`. Shows "To receive $X, request: $Y" with copy button after entering an amount.
- **UX Note**: Reverse calculator shows "To receive $X, request: $Y". May need clearer labeling or separate input field for direct reverse calculation.

---

## LOW (P3) - Polish

### ISSUE-013: Settings - No save success message
- **Status**: Closed
- **Closed**: 2025-01-24
- **Location**: Settings page
- **Bug**: Changes save correctly but no success toast/message shown.
- **Tester**: Casey Barnett
- **Resolution**: Not a bug - feature already exists
- **Finding**: Success toast implemented at `settings/page.tsx:147-150`. Shows "Settings saved" with description "Your settings have been updated successfully."
- **UX Note**: Toast may be appearing but user didn't notice. Could add more prominent visual feedback or longer toast duration.

---

## Issue Status Definitions

- **Open**: Issue identified, not yet started
- **In Progress**: Actively being worked on
- **Blocked**: Waiting on external dependency or decision
- **Closed**: Fix implemented and verified

## Changelog Integration

When closing an issue, add an entry to `CHANGELOG.md` with the format:
```
### Fixed
- Brief description [#ISSUE-XXX]
```
