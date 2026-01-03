import { NextRequest, NextResponse } from 'next/server';
import { parseScreenshotForRequest, parseMultipleScreenshots, type ScreenshotParseResult } from '@/lib/ai/parseScreenshot';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported image types
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest): Promise<NextResponse<ScreenshotParseResult>> {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart form data (file uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      const singleFile = formData.get('file') as File | null;

      // Handle single file or multiple files
      const filesToProcess = singleFile ? [singleFile] : files;

      if (filesToProcess.length === 0) {
        return NextResponse.json({
          success: false,
          request: null,
          raw_text: null,
          error: 'No files provided'
        }, { status: 400 });
      }

      // Validate and convert files
      const images: Array<{ base64: string; mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }> = [];

      for (const file of filesToProcess) {
        // Validate file type
        if (!SUPPORTED_TYPES.includes(file.type)) {
          return NextResponse.json({
            success: false,
            request: null,
            raw_text: null,
            error: `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_TYPES.join(', ')}`
          }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({
            success: false,
            request: null,
            raw_text: null,
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`
          }, { status: 400 });
        }

        // Convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        images.push({
          base64,
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        });
      }

      // Parse based on number of images
      if (images.length === 1) {
        const result = await parseScreenshotForRequest(images[0].base64, images[0].mimeType);
        return NextResponse.json(result);
      } else {
        const result = await parseMultipleScreenshots(images);
        return NextResponse.json(result);
      }
    }

    // Handle JSON body (base64 encoded images)
    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Single image
      if (body.image && body.mimeType) {
        if (!SUPPORTED_TYPES.includes(body.mimeType)) {
          return NextResponse.json({
            success: false,
            request: null,
            raw_text: null,
            error: `Unsupported file type: ${body.mimeType}`
          }, { status: 400 });
        }

        const result = await parseScreenshotForRequest(body.image, body.mimeType);
        return NextResponse.json(result);
      }

      // Multiple images
      if (body.images && Array.isArray(body.images)) {
        const images = body.images.map((img: { base64: string; mimeType: string }) => ({
          base64: img.base64,
          mimeType: img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        }));

        const result = await parseMultipleScreenshots(images);
        return NextResponse.json(result);
      }

      return NextResponse.json({
        success: false,
        request: null,
        raw_text: null,
        error: 'Invalid JSON body. Expected { image: string, mimeType: string } or { images: Array<{ base64: string, mimeType: string }> }'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      request: null,
      raw_text: null,
      error: 'Unsupported content type. Use multipart/form-data or application/json'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in parse-screenshot API:', error);
    return NextResponse.json({
      success: false,
      request: null,
      raw_text: null,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/requests/parse-screenshot',
    description: 'Parse customer message screenshots using AI to extract shopping request details',
    methods: {
      POST: {
        description: 'Upload screenshot(s) for parsing',
        contentTypes: {
          'multipart/form-data': {
            fields: {
              file: 'Single image file',
              files: 'Multiple image files (for conversation threads)'
            }
          },
          'application/json': {
            fields: {
              image: 'Base64 encoded image data',
              mimeType: 'image/jpeg | image/png | image/gif | image/webp',
              images: 'Array of { base64, mimeType } for multiple images'
            }
          }
        },
        response: {
          success: 'boolean - whether parsing was successful',
          request: {
            items: 'Array of extracted items with name, quantity, price, category, notes',
            customer_name: 'Customer name if found',
            customer_email: 'Customer email if found',
            customer_phone: 'Customer phone if found',
            park_preference: 'Preferred park (disney_mk, universal_usf, etc.)',
            location_hints: 'Mentioned store names or locations',
            urgency: 'low | normal | high | urgent',
            budget_notes: 'Budget-related information',
            shipping_notes: 'Shipping preferences',
            general_notes: 'Other relevant notes',
            confidence_score: '0-100 confidence in extraction accuracy'
          },
          raw_text: 'Text content extracted from screenshot',
          error: 'Error message if parsing failed'
        }
      }
    },
    limits: {
      maxFileSize: '10MB per file',
      supportedTypes: SUPPORTED_TYPES
    }
  });
}
