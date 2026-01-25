# Claude Code Instructions

This file contains instructions for Claude Code when working on the Enchanted Park Pickups CRM.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Project Understanding

### Read First
1. `docs/PROJECT.md` - Tech stack, file structure, database schema, API routes
2. `docs/ISSUES.md` - Current bugs and feature requests with priorities
3. `docs/CHANGELOG.md` - Recent changes
4. `src/lib/database.types.ts` - All TypeScript types and database schema

### Key Directories
- `src/app/admin/` - Admin dashboard pages (protected routes)
- `src/app/api/` - API route handlers
- `src/components/` - Reusable React components
- `src/lib/` - Shared utilities, integrations, and business logic

## Testing Procedures

### Manual Testing
Since there's no automated test suite, test changes manually:

1. **Start dev server**: `npm run dev`
2. **Admin routes**: Navigate to `/admin/*` (requires auth)
3. **API routes**: Test with curl or Postman
4. **Check browser console** for client-side errors
5. **Check terminal** for server-side errors

### Testing API Routes
```bash
# Example: Test releases endpoint
curl http://localhost:3000/api/releases

# Test with auth (get token from browser devtools)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/admin/...
```

### Database Changes
- Migrations are in `supabase/migrations/`
- Test migrations locally before applying to production
- Update `src/lib/database.types.ts` when schema changes

## Code Standards

### TypeScript
- Strict mode enabled
- Use types from `src/lib/database.types.ts` for database entities
- Prefer `interface` for object shapes, `type` for unions/intersections

### React/Next.js Patterns
```typescript
// Server Component (default in app/ directory)
export default async function Page() {
  const data = await fetchData()
  return <Component data={data} />
}

// Client Component (for interactivity)
'use client'
export default function InteractiveComponent() {
  const [state, setState] = useState()
  // ...
}
```

### API Routes
```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check auth if needed
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch data
  const { data, error } = await supabase
    .from('table_name')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

### Supabase Client Usage
```typescript
// Server-side (API routes, Server Components)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client-side (Client Components)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### Styling
- Use Tailwind CSS classes
- shadcn/ui components in `src/components/ui/`
- Follow existing component patterns

### Imports
```typescript
// Use path aliases
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'
```

## Common Patterns

### Database Queries with Types
```typescript
import type { Database } from '@/lib/database.types'

type Customer = Database['public']['Tables']['customers']['Row']
type NewCustomer = Database['public']['Tables']['customers']['Insert']

const { data } = await supabase
  .from('customers')
  .select('*')
  .returns<Customer[]>()
```

### Form Handling
```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })
  // ...
}
```

### Toast Notifications
```typescript
import { toast } from 'sonner'

// Success
toast.success('Item saved successfully')

// Error
toast.error('Failed to save item')

// With description
toast.success('Saved', { description: 'Changes have been applied' })
```

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  return data
} catch (error) {
  console.error('Error:', error)
  toast.error('Operation failed')
}
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Shipping
SHIPPO_API_KEY=

# AI
ANTHROPIC_API_KEY=
GOOGLE_CLOUD_PROJECT=
```

## Debugging Tips

### Check Auth State
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user)
```

### Supabase Query Debugging
```typescript
const { data, error, status, statusText } = await supabase
  .from('table')
  .select('*')
console.log({ data, error, status, statusText })
```

### Middleware Issues
- Check `middleware.ts` for route protection logic
- Public routes are listed in `PUBLIC_ROUTES` array
- Admin routes require `admin_users` table membership

## Before Committing

1. Run `npm run build` to check for TypeScript errors
2. Run `npm run lint` to check for linting issues
3. Test the affected functionality manually
4. Update `docs/CHANGELOG.md` if fixing an issue
5. Update `docs/ISSUES.md` status if closing an issue

## Issue Workflow

When working on an issue from `docs/ISSUES.md`:

1. Read the issue description and files to investigate
2. Understand the expected vs actual behavior
3. Find and fix the root cause
4. Test the fix manually
5. Update issue status to "Closed" in `docs/ISSUES.md`
6. Add changelog entry in `docs/CHANGELOG.md`

---

## Lessons Learned (2025-01-24 Issue Resolution)

### Issue Investigation Process
1. **Always check if feature already exists** before writing code - 5 of 14 issues were features that already existed
2. **Check database schema matches TypeScript types** - `database.types.ts` can drift from actual DB
3. **Verify status/enum values match** between code and database (e.g., 'planned' vs 'pending')
4. **Look for silent failures** - Supabase ignores unknown columns without errors

### Common Bug Patterns Found
| Pattern | Example | Fix |
|---------|---------|-----|
| Schema mismatch | Code uses `reference_images[]`, DB only has `reference_image_url` | Add migration for missing column |
| State not updating | `editingPrices` state not initialized for new items | Initialize state in add function |
| Re-fetching overwrites | `fetchInvoice()` after save replaced local edits with stale data | Remove unnecessary refetch |
| Placeholder values | `@pending.local` emails causing duplicate customers | Use NULL instead of placeholders |

### Supabase Gotchas
- **Unknown columns are silently ignored** - insert/update won't error, data just won't save
- **Type generation can be stale** - always verify `database.types.ts` matches actual schema
- **RLS can hide data issues** - check with service role key when debugging

### Quick Verification Commands
```bash
# Check if a column exists in the database
# Run in Supabase SQL editor:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'request_items';

# Compare TypeScript types to actual schema
grep -A 20 "request_items:" src/lib/database.types.ts
```

---

## Testing Checklist for Testers

When testing features, check for these non-obvious UI patterns:

### Filters and Sorting
- **Dropdown filters** (not column-based): Look above tables for Select dropdowns
- **Sortable columns**: Click column headers - look for sort icons (▲▼)
- **Active sort indicator**: May only show on currently sorted column

### Feedback and Notifications
- **Toast messages**: Brief popups in corner - may disappear quickly (2-3 seconds)
- **Success states**: Look for checkmarks, green colors, or status changes
- **Loading states**: Buttons may show spinners during operations

### Calculated Fields
- **Secondary outputs**: Look below primary inputs for calculated results
- **Auto-formatting**: Currency fields may format on blur, not keystroke

### Common Locations
| Feature | Where to Find |
|---------|---------------|
| Customer sorting | Click Name/Contact/Joined headers |
| Notification filters | Type and Status dropdowns above list |
| PayPal reverse calc | Below fee calculator output |
| Settings save toast | Bottom-right corner after save |
| Forgot password | Below password field on login page |
