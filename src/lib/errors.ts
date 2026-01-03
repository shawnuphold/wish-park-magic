import { NextResponse } from 'next/server';

/**
 * Standard API error class with HTTP status code
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

/**
 * Standardized error response format
 */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, string>;
}

/**
 * Create a JSON error response
 */
export function errorResponse(
  error: ApiError | Error | string,
  statusCode = 500
): NextResponse<ErrorResponse> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Don't leak internal error details in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

    return NextResponse.json(
      { error: message },
      { status: statusCode }
    );
  }

  return NextResponse.json(
    { error: String(error) },
    { status: statusCode }
  );
}

/**
 * Wrap an async handler with error handling
 *
 * @example
 * ```typescript
 * export const POST = withErrorHandler(async (request) => {
 *   const body = await request.json();
 *   // ... handler logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withErrorHandler<T>(
  handler: (request: Request) => Promise<NextResponse<T>>
) {
  return async (request: Request): Promise<NextResponse<T | ErrorResponse>> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      return errorResponse(error as Error);
    }
  };
}

/**
 * Log error with context (server-side only)
 */
export function logError(
  error: Error,
  context?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };

  console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
}
