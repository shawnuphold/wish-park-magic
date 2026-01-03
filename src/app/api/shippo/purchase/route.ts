import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/api-auth';
import { purchaseLabel } from '@/lib/shippo';

// Admin-only endpoint for purchasing shipping labels
export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const { rateId, labelFormat = 'PDF' } = await request.json();

    if (!rateId) {
      return NextResponse.json(
        { error: 'Missing required field: rateId' },
        { status: 400 }
      );
    }

    // Validate label format
    const validFormats = ['PDF', 'PNG', 'ZPL'];
    if (!validFormats.includes(labelFormat)) {
      return NextResponse.json(
        { error: 'Invalid label format. Must be PDF, PNG, or ZPL' },
        { status: 400 }
      );
    }

    // Purchase the label
    const transaction = await purchaseLabel(rateId, labelFormat as 'PDF' | 'PNG' | 'ZPL');

    if (transaction.status === 'ERROR') {
      const errorMessage = transaction.messages?.[0]?.text || 'Failed to purchase label';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      transactionId: transaction.object_id,
      trackingNumber: transaction.tracking_number,
      trackingUrl: transaction.tracking_url_provider,
      labelUrl: transaction.label_url,
      status: transaction.status,
    });
  } catch (error) {
    console.error('Error purchasing label:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase label' },
      { status: 500 }
    );
  }
}
