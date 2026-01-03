import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAdminAuth } from '@/lib/auth/api-auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { findMatchingReleasesForCustomer } from '@/lib/ai/customerMatcher';

// GET requires auth - returns interests for specific customer or all (admin)
export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const customerId = request.nextUrl.searchParams.get('customerId');

  if (customerId) {
    // Customer-specific interests - requires auth
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const { data, error } = await supabase
      .from('customer_interests')
      .select('*')
      .eq('customer_id', customerId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also get recommended releases
    const recommendations = await findMatchingReleasesForCustomer(customerId, 5);

    return NextResponse.json({
      interests: data,
      recommendations: recommendations.map(r => ({
        release: r.release,
        matchScore: r.matchScore,
        reasons: r.reasons,
      })),
    });
  }

  // Get all interests (admin only)
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  const { data, error } = await supabase
    .from('customer_interests')
    .select(`
      *,
      customers (
        id,
        name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interests: data });
}

// POST requires auth
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('customer_interests')
      .insert({
        customer_id: body.customer_id,
        category: body.category || null,
        park: body.park || null,
        keywords: body.keywords || [],
        notify_new_releases: body.notify_new_releases ?? true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ interest: data });
  } catch (error) {
    console.error('Error creating interest:', error);
    return NextResponse.json(
      { error: 'Failed to create interest' },
      { status: 500 }
    );
  }
}
