import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/faq',
  '/how-it-works',
  '/pricing',
  '/services',
  '/shop',
  '/new-releases',
  '/request',
]

// Patterns for public routes
const PUBLIC_ROUTE_PATTERNS = [
  /^\/auth\/.*/,           // /auth/*
  /^\/invoice\/[^\/]+$/,   // /invoice/[id]
]

// Webhook routes - these use signature verification, not session auth
const WEBHOOK_ROUTES = [
  '/api/payments/stripe/webhook',
  '/api/payments/paypal/webhook',
  '/api/shippo/webhook',
]

// API routes that should be publicly accessible (GET only checked in route handler)
const PUBLIC_API_ROUTES = [
  '/api/releases',           // GET is public, POST requires auth
  '/api/park-stores',        // Public store data
]

const PORTAL_ROUTES_PATTERN = /^\/portal(\/.*)?$/
const ADMIN_ROUTES_PATTERN = /^\/admin(\/.*)?$/
const API_ROUTES_PATTERN = /^\/api\/.*/

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  return PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(pathname))
}

function isWebhookRoute(pathname: string): boolean {
  return WEBHOOK_ROUTES.includes(pathname)
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Allow webhooks through without session auth (they use signature verification)
  if (isWebhookRoute(pathname)) {
    return NextResponse.next()
  }

  // Public routes - refresh session but don't require auth
  if (isPublicRoute(pathname)) {
    const { response } = await updateSession(request)
    return response
  }

  // Public API routes - allow through but still refresh session if present
  // Individual route handlers will check auth for mutation methods
  if (isPublicApiRoute(pathname)) {
    const { response } = await updateSession(request)
    return response
  }

  // All other routes need authentication
  const { user, supabase, response } = await updateSession(request)

  // API routes protection
  if (API_ROUTES_PATTERN.test(pathname)) {
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Admin API routes require admin_users membership
    if (pathname.startsWith('/api/admin')) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (!adminUser) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }
    }

    return response
  }

  // Admin routes protection
  if (ADMIN_ROUTES_PATTERN.test(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    // Check admin_users table membership
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      // User is authenticated but not an admin
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    return response
  }

  // Portal routes protection (customer auth)
  if (PORTAL_ROUTES_PATTERN.test(pathname)) {
    // Portal login page is accessible
    if (pathname === '/portal') {
      const { response } = await updateSession(request)
      return response
    }

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/portal'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    return response
  }

  // Default: allow through with session refresh
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
