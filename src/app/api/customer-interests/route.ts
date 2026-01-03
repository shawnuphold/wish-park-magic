// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { findMatchingReleasesForCustomer } from '@/lib/ai/customerMatcher';
import type { Database } from '@/lib/database.types';

function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const customerId = request.nextUrl.searchParams.get('customerId');

  if (customerId) {
    // Get interests for specific customer
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

  // Get all interests (for admin)
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

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
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
}
