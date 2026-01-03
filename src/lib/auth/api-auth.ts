import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type AdminRole = 'admin' | 'manager' | 'shopper'

interface AuthenticatedUser {
  id: string
  email: string
}

interface AdminUser {
  id: string
  role: AdminRole
  name: string
  email: string
}

interface AuthSuccess {
  success: true
  user: AuthenticatedUser
  adminUser?: AdminUser
}

interface AuthError {
  success: false
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthError

interface RequireAuthOptions {
  /** Require the user to be in admin_users table */
  requireAdmin?: boolean
  /** Specific roles allowed (only checked if requireAdmin is true) */
  allowedRoles?: AdminRole[]
}

/**
 * Check authentication for API routes
 *
 * Usage:
 * ```typescript
 * const auth = await requireAuth({ requireAdmin: true })
 * if (!auth.success) return auth.response
 *
 * const { user, adminUser } = auth
 * // user.id, user.email available
 * // adminUser.role, adminUser.name available if requireAdmin was true
 * ```
 */
export async function requireAuth(options?: RequireAuthOptions): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  const result: AuthSuccess = {
    success: true,
    user: { id: user.id, email: user.email! }
  }

  // If admin access is required
  if (options?.requireAdmin) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role, name, email')
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        )
      }
    }

    // Check specific roles if provided
    if (options.allowedRoles && !options.allowedRoles.includes(adminUser.role as AdminRole)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Forbidden', message: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    result.adminUser = adminUser as AdminUser
  }

  return result
}

/**
 * Get the admin Supabase client (service role)
 * Use this for operations that need to bypass RLS
 */
export function getAdminClient() {
  return createSupabaseAdminClient()
}

/**
 * Type guard to check if auth result is an error
 */
export function isAuthError(result: AuthResult): result is AuthError {
  return !result.success
}

/**
 * Require admin auth and return error response if not authorized
 * Convenience wrapper for common pattern
 */
export async function requireAdminAuth(allowedRoles?: AdminRole[]): Promise<AuthResult> {
  return requireAuth({ requireAdmin: true, allowedRoles })
}
