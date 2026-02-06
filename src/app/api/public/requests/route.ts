/**
 * Public Request Submission API
 *
 * Allows customers to submit merchandise requests from the public website.
 * Creates customer (or finds existing), request, and request items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RequestSubmission {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  park: 'disney' | 'universal' | 'seaworld';
  timeSensitive: boolean;
  neededByDate?: string;
  itemDescription: string;
  referenceUrls?: string;
  imageUrls?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestSubmission = await request.json();

    // Validate required fields
    if (!body.fullName || !body.email || !body.phone || !body.shippingAddress || !body.park || !body.itemDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find or create customer
    let customerId: string;

    // First try to find existing customer by email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', body.email.toLowerCase().trim())
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;

      // Update customer info if provided
      await supabase
        .from('customers')
        .update({
          name: body.fullName.trim(),
          phone: body.phone.trim() || null,
        })
        .eq('id', customerId);
    } else {
      // Parse shipping address into components (simple split for now)
      const addressParts = body.shippingAddress.split('\n').map(s => s.trim()).filter(Boolean);

      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: body.fullName.trim(),
          email: body.email.toLowerCase().trim(),
          phone: body.phone.trim() || null,
          address_line1: addressParts[0] || null,
          address_line2: addressParts.length > 2 ? addressParts[1] : null,
          city: null, // Would need proper address parsing
          state: null,
          postal_code: null,
          country: 'US',
        })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        );
      }

      customerId = newCustomer.id;
    }

    // Build notes from various fields
    const noteParts: string[] = [];
    if (body.timeSensitive && body.neededByDate) {
      noteParts.push(`TIME SENSITIVE - Needed by: ${body.neededByDate}`);
    }
    noteParts.push(`Shipping Address:\n${body.shippingAddress}`);
    if (body.referenceUrls) {
      noteParts.push(`Reference URLs:\n${body.referenceUrls}`);
    }

    // Create the request
    const { data: newRequest, error: requestError } = await supabase
      .from('requests')
      .insert({
        customer_id: customerId,
        status: 'pending',
        notes: noteParts.join('\n\n'),
        source: 'website',
      })
      .select('id')
      .single();

    if (requestError) {
      console.error('Error creating request:', requestError);
      return NextResponse.json(
        { error: 'Failed to create request' },
        { status: 500 }
      );
    }

    // Create request item(s) from the description
    // For simplicity, create one item with the full description
    // In a more advanced version, this could parse multiple items
    const { error: itemError } = await supabase
      .from('request_items')
      .insert({
        request_id: newRequest.id,
        name: body.itemDescription.substring(0, 100), // First 100 chars as name
        description: body.itemDescription,
        category: 'other', // Default category
        park: body.park,
        quantity: 1,
        is_specialty: false,
        status: 'pending',
        reference_url: body.referenceUrls?.split('\n')[0] || null,
        reference_images: body.imageUrls || [],
        priority: body.timeSensitive ? 1 : 5,
      });

    if (itemError) {
      console.error('Error creating request item:', itemError);
      // Request was created, so still return success but log the issue
    }

    // Generate a human-readable request ID
    const requestId = `EPP-${newRequest.id.substring(0, 8).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      requestId,
      internalId: newRequest.id,
      message: 'Request submitted successfully',
    });

  } catch (error) {
    console.error('Request submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
