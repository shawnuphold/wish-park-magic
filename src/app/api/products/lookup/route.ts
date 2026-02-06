/**
 * Product Lookup API
 *
 * POST /api/products/lookup
 *
 * Analyzes a product image and returns identification results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { lookupProduct } from '@/lib/ai/productLookup';
import { requireAdminAuth } from '@/lib/auth/api-auth';

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'imageBase64 is required' },
        { status: 400 }
      );
    }

    // Validate that it looks like base64 image data
    if (!imageBase64.includes('base64,') && !imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      return NextResponse.json(
        { error: 'Invalid base64 image data' },
        { status: 400 }
      );
    }

    console.log('[API] Product lookup request received');

    const result = await lookupProduct(imageBase64);

    return NextResponse.json({
      success: !result.error,
      product: result.product,
      confidence: result.confidence,
      sources: {
        visionLabels: result.visionAnalysis?.labels.slice(0, 10) || [],
        localMatch: result.localMatch ? {
          id: result.localMatch.id,
          title: result.localMatch.title,
          confidence: result.localMatch.confidence
        } : null,
        webResult: result.webResult ? {
          name: result.webResult.name,
          sourceUrl: result.webResult.sourceUrl,
          confidence: result.webResult.confidence
        } : null
      },
      steps: result.steps,
      error: result.error
    });

  } catch (error) {
    console.error('[API] Product lookup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        product: null,
        confidence: 0
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.success) return auth.response;

  return NextResponse.json({
    endpoint: '/api/products/lookup',
    method: 'POST',
    description: 'Analyze a product image to identify theme park merchandise',
    body: {
      imageBase64: 'Base64 encoded image data (required)'
    },
    response: {
      success: 'boolean',
      product: {
        name: 'Product name',
        description: 'Product description',
        price: 'Price or null',
        park: 'Park name or null',
        store: 'Store name or null',
        category: 'Category',
        availability: 'available | sold_out | coming_soon | unknown',
        characters: ['Character names'],
        themes: ['Theme names']
      },
      confidence: '0-100 confidence score',
      sources: {
        visionLabels: 'Labels from Google Vision',
        localMatch: 'Match from local database or null',
        webResult: 'Result from web search or null'
      },
      steps: 'Array of processing steps',
      error: 'Error message or null'
    }
  });
}
