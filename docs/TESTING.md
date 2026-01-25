# Testing Guide

This document provides testing guidance for the Enchanted Park Pickups CRM application.

## Quick Reference: Feature Locations

### Admin Dashboard (`/admin`)
| Feature | Location | How to Test |
|---------|----------|-------------|
| Dashboard stats | `/admin` home | Verify counts match database |
| Customer list | `/admin/customers` | Click headers to sort |
| Request management | `/admin/requests` | Edit prices, add notes |
| Invoice creation | `/admin/invoices` | Create from request, verify prices |
| Shopping trips | `/admin/trips` | Create, schedule, delete |
| Notifications | `/admin/notifications` | Use filter dropdowns |
| Settings | `/admin/settings` | Save and verify toast appears |
| Tools | `/admin/tools` | Test PayPal calculator |

### Authentication (`/auth`)
| Feature | Location | How to Test |
|---------|----------|-------------|
| Admin login | `/auth/login` | Sign in with admin credentials |
| Forgot password | `/auth/forgot-password` | Enter email, check inbox |
| Reset password | `/auth/reset-password` | Click email link, set new password |

---

## Non-Obvious UI Patterns

### 1. Sortable Table Columns
**Where**: Customer list, Request list, Invoice list

**How it works**:
- Column headers are clickable (Name, Contact, Joined, etc.)
- Click once for ascending, again for descending
- Sort icon (▲ or ▼) appears on active column only

**Visual cue**: Cursor changes to pointer on hover

### 2. Dropdown Filters
**Where**: Notification History page

**How it works**:
- Filters are **dropdown selects**, not column-based
- Located **above** the table, not in column headers
- Two filters available:
  - **Type**: All / Email / SMS
  - **Status**: All / Sent / Delivered / Pending / Failed

**Tip**: Look for `<Select>` components with "All" default value

### 3. Toast Notifications
**Where**: After save operations (Settings, Invoices, etc.)

**How it works**:
- Brief popup in **bottom-right corner**
- Auto-dismisses after ~3 seconds
- May include title and description

**Tip**: Watch the corner immediately after clicking Save

### 4. Calculated Output Fields
**Where**: Tools > PayPal Fee Calculator

**How it works**:
- Enter an amount in the input field
- **Below** the main output, look for:
  - "To receive $X, request: $Y" (reverse calculation)
  - Copy button to copy the calculated amount

**Tip**: Scroll down if needed - secondary outputs are below primary

### 5. Inline Editing
**Where**: Request Detail page (notes, prices)

**How it works**:
- Click the edit icon (pencil) to enter edit mode
- Make changes
- Click checkmark to save, X to cancel

**Tip**: Look for pencil icons next to editable fields

---

## Feature-Specific Testing

### Request Management

#### Adding Items
1. Navigate to `/admin/requests/[id]`
2. Click "Add Item" button
3. Fill in item details
4. **Verify**: Price field should be editable immediately

#### Editing Notes
1. Find the Notes section
2. Click the pencil icon
3. Edit the text
4. Click checkmark to save
5. **Verify**: Changes persist after page refresh

### Invoice Creation

#### From Request
1. Go to a request with items
2. Click "Create Invoice"
3. **Verify**: Prices match request items
4. Edit a price
5. Save the invoice
6. **Verify**: Edited price persists (doesn't revert)

### Shopping Trips

#### Deletion
1. Navigate to `/admin/trips`
2. Find a trip to delete
3. Click the delete/trash icon
4. **Verify**: Confirmation dialog appears
5. Confirm deletion
6. **Verify**: Trip removed from list

### Password Reset

#### Forgot Password Flow
1. Go to `/auth/login`
2. Click "Forgot password?" link (below password field)
3. Enter email address
4. Click "Send Reset Link"
5. **Verify**: Success message appears
6. Check email inbox (and spam folder)
7. Click link in email
8. **Verify**: Redirected to reset password page
9. Enter new password twice
10. Click "Update Password"
11. **Verify**: Success message, redirect to login
12. **Verify**: Can log in with new password

---

## Environment-Dependent Features

### Email Features
Require SMTP configuration to work:
- Password reset emails
- Notification emails
- Invoice delivery

**If not configured**: Will show "SMTP not configured" error

### Payment Features
Require API keys:
- Stripe checkout
- PayPal invoicing

---

## Common Testing Pitfalls

### 1. "Feature doesn't exist"
**Before reporting**: Check for:
- Dropdown filters above tables
- Clickable column headers
- Secondary output below primary fields
- Scroll down for more content

### 2. "Save didn't work"
**Check**:
- Was there an error toast?
- Did you refresh too quickly?
- Check browser console for errors
- Check network tab for failed requests

### 3. "Data is missing"
**Check**:
- Are you looking at filtered view?
- Is there a search term applied?
- Try resetting all filters to "All"

### 4. "Button is disabled"
**Check**:
- Are required fields filled?
- Is an operation in progress (loading spinner)?
- Do you have permission (admin role)?

---

## Reporting Issues

When reporting a bug, include:

1. **Location**: URL path and page name
2. **Steps to reproduce**: Numbered list
3. **Expected behavior**: What should happen
4. **Actual behavior**: What did happen
5. **Screenshots**: If visual issue
6. **Browser console errors**: If any (F12 > Console)

### Issue Template
```markdown
### Issue: [Brief description]

**Location**: /admin/[page]
**Priority**: P0/P1/P2/P3

**Steps to Reproduce**:
1. Go to [page]
2. Click [button]
3. Enter [data]
4. Click [action]

**Expected**: [What should happen]

**Actual**: [What happens instead]

**Notes**: [Any additional context]
```
