import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

// Re-export common schemas
export * from './common';
export * from './releases';
export * from './customers';
export * from './shipments';
export * from './upload';

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  response: NextResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Format Zod errors into a user-friendly structure
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    errors[path] = issue.message;
  }

  return errors;
}

/**
 * Validates request body against a Zod schema
 * Returns validated data or a 400 error response
 *
 * @example
 * ```typescript
 * import { validateRequestBody, createReleaseSchema } from '@/lib/validations';
 *
 * export async function POST(request: NextRequest) {
 *   const validation = await validateRequestBody(request, createReleaseSchema);
 *   if (!validation.success) return validation.response;
 *
 *   const { title, park, category } = validation.data;
 *   // ... rest of handler with fully typed data
 * }
 * ```
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            details: formatZodErrors(result.error),
          },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch {
    // Handle JSON parse errors
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: formatZodErrors(result.error),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Type guard to check if validation result is an error
 */
export function isValidationError<T>(result: ValidationResult<T>): result is ValidationError {
  return !result.success;
}
