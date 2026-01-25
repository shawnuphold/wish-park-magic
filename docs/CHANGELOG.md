# Changelog

All notable changes to the Enchanted Park Pickups CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial documentation setup (PROJECT.md, ISSUES.md, CHANGELOG.md, CLAUDE.md)

---

## [1.1.0] - 2025-01-24

### Summary
Resolved 14 tester-reported issues, added forgot password functionality, and improved documentation.

### Bug Fixes
- **Request item price data loss** - `editingPrices` state now initialized for new items [#ISSUE-001]
- **Invoice prices reverting** - removed `fetchInvoice()` call overwriting local state [#ISSUE-002]
- **Shopping trips status mismatch** - `database.types.ts` corrected to match DB schema [#ISSUE-004]
- **Duplicate customers** - screenshot parsers now use NULL instead of placeholder emails [#ISSUE-005]
- **RSS scraper null handling** - added null guard to `mapParkLocation()` [#ISSUE-006]
- **Product images not saving** - added `reference_images TEXT[]` column [#ISSUE-007]
- **Nintendo Plush Headbands image** - manually fixed missing image URL [#ISSUE-008]

### New Features
- **Request notes editing** - inline edit/save/cancel UI for request notes [#ISSUE-001]
- **Shopping trip deletion** - delete button with confirmation dialog [#ISSUE-004]
- **Multiple reference images** - `reference_images` array column supports up to 5 images [#ISSUE-007]
- **Forgot password flow** [#ISSUE-014]:
  - "Forgot password?" link on login page
  - `/auth/forgot-password` - email input, sends reset via Supabase
  - `/auth/reset-password` - token validation, password update form
  - `/auth/callback` - handles email link code exchange

### Database Changes
- Added `reference_images TEXT[]` column to `request_items` table
- Migration: `20260124_add_reference_images_array.sql`

### Documentation
- Created `docs/PROJECT.md` - tech stack, file structure, API routes
- Created `docs/ISSUES.md` - issue tracker with 14 issues resolved
- Created `docs/CHANGELOG.md` - this file
- Created `docs/TESTING.md` - testing guidance for QA
- Updated `CLAUDE.md` - lessons learned from issue investigation

### Verified (Not Bugs)
Features that already existed but were not obvious to testers:
- Customer list sorting (clickable Name/Contact/Joined columns) [#ISSUE-010]
- Notification filters (Type/Status dropdown selects) [#ISSUE-011]
- PayPal reverse calculator ("To receive $X, request: $Y") [#ISSUE-012]
- Settings save toast ("Settings saved" message) [#ISSUE-013]

### Configuration Required
- SMTP variables for email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` [#ISSUE-009]
- Supabase email configuration for password reset [#ISSUE-014]

---

## Documentation Format

When adding entries, use the following categories:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

### Entry Format
```
- Brief description of change [#issue-number]
```

### Example
```
## [2024-01-24]

### Fixed
- Invoice total calculation not including CC processing fee [#3]
- Customer portal showing stale request data [#7]

### Added
- Bulk invoice generation from shopping trip [#5]
```
