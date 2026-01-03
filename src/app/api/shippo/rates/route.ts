import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { createShipment, getDefaultFromAddress, ShippoRate } from '@/lib/shippo';

// Admin-only endpoint for getting shipping rates
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { addressTo, parcel } = await request.json();

    if (!addressTo || !parcel) {
      return NextResponse.json(
        { error: 'Missing required fields: addressTo, parcel' },
        { status: 400 }
      );
    }

    // Validate destination address
    if (!addressTo.street1 || !addressTo.city || !addressTo.state || !addressTo.zip) {
      return NextResponse.json(
        { error: 'Incomplete destination address' },
        { status: 400 }
      );
    }

    // Get the from address
    const addressFrom = getDefaultFromAddress();

    if (!addressFrom.street1 || !addressFrom.zip) {
      return NextResponse.json(
        { error: 'Ship from address not configured. Please update SHIPPO_FROM settings.' },
        { status: 500 }
      );
    }

    // Format parcel for Shippo
    const shippoParcel = {
      length: String(parcel.length),
      width: String(parcel.width),
      height: String(parcel.height),
      distance_unit: 'in' as const,
      weight: String(parcel.weight),
      mass_unit: 'lb' as const,
    };

    // Create shipment to get rates
    const shipment = await createShipment(addressFrom, addressTo, shippoParcel);

    // Format rates for frontend
    const rates = (shipment.rates || [])
      .filter((rate: ShippoRate) => rate.amount)
      .map((rate: ShippoRate) => ({
        id: rate.object_id,
        carrier: rate.provider,
        service: rate.servicelevel.name,
        amount: parseFloat(rate.amount),
        estimated_days: rate.estimated_days || 0,
        duration_terms: rate.duration_terms,
      }))
      .sort((a, b) => a.amount - b.amount);

    return NextResponse.json({
      shipmentId: shipment.object_id,
      rates,
    });
  } catch (error) {
    console.error('Error getting shipping rates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get shipping rates' },
      { status: 500 }
    );
  }
}
