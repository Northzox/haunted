import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';
import { validateSession } from '@/lib/auth';

// Rate limiting configuration
const createRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    msg: 'Too many requests from this IP, please try again later.',
    statusCode: 429, // Too Many Requests
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for sensitive operations
const createStrictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // stricter limit for sensitive operations
  message: {
    msg: 'Too many attempts, please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CSRF protection
export async function csrfProtection(request: NextRequest): Promise<boolean> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const referer = request.headers.get('referer');

  // In production, check origin
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [
      process.env.NEXTAUTH_URL,
      'https://yourdomain.com',
    ].filter(Boolean);

    // Check if origin is allowed
    if (origin && !allowedOrigins.includes(origin)) {
      return false;
    }

    // Check referer
    if (referer && !allowedOrigins.includes(new URL(referer).origin)) {
      return false;
    }
  }

  return true;
}

// Security headers
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
  );

  return response;
}

// Input sanitization
export function sanitizeInput(input: any): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// SQL Injection protection
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|ALL|ANY|EXISTS|NOT|LIKE|HAVING|GROUP BY|ORDER BY|LIMIT|OFFSET|FOR|INTO|NULL|IS|IN|BETWEEN|AND|OR|NOT|TRUE|FALSE|CASE|WHEN|THEN|ELSE|END)\b)/gi,
    /(--|;|\/\*|\/\*|--)/g,
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXEC)\b.*\b(FROM|INTO|TABLE|DATABASE|INDEX)\b/gi,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// XSS protection
export function detectXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>|<\/script>))*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>|<\/iframe>))*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>|<\/object>))*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>|<\/embed>))*<\/embed>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src[^>]*javascript:/gi,
    /<img[^>]*on\w+\s*=/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

// Main security middleware
export async function securityMiddleware(
  request: NextRequest,
  response: NextResponse,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResult = await createRateLimit(request, response);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // CSRF protection
  const csrfValid = await csrfProtection(request);
  if (!csrfValid) {
    return new NextResponse('CSRF validation failed', {
      status: 403,
      headers: addSecurityHeaders(new NextResponse().headers),
    });
  }

  // Add security headers
  addSecurityHeaders(response);

  return handler();
}

// Rate limiting wrapper for API routes
export function withRateLimit(
  handler: (request: NextRequest, response: NextResponse) => Promise<NextResponse>,
  options?: {
    limit?: number;
    windowMs?: number;
  }
) {
  return async (request: NextRequest, response: NextResponse) => {
    const limit = options?.limit || 100;
    const windowMs = options?.windowMs || 15 * 60 * 1000;

    const rateLimitMiddleware = rateLimit({
      windowMs,
      max: limit,
      message: {
        msg: 'Too many requests, please try again later.',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    const result = await rateLimitMiddleware(request, response);
    
    if (!result.success) {
      return result.response;
    }

    return handler(request, response);
  };
}

// Rate limiting for sensitive operations
export function withStrictRateLimit(
  handler: (request: NextRequest, response: NextResponse) => Promise<NextResponse>
) {
  return async (request: NextRequest, response: NextResponse) => {
    const rateLimitMiddleware = createStrictRateLimit;

    const result = await rateLimitMiddleware(request, response);
    
    if (!result.success) {
      return result.response;
    }

    return handler(request, response);
  };
}

// Input validation middleware
export function withInputValidation(
  handler: (request: NextRequest, response: NextResponse) => Promise<NextResponse>
) {
  return async (request: NextRequest, response: NextResponse) => {
    // Check request body for malicious content
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      try {
        const body = await request.json();
        
        // Validate JSON structure
        if (typeof body !== 'object' || body === null) {
          return new NextResponse('Invalid request body', {
            status: 400,
            headers: addSecurityHeaders(new NextResponse().headers),
          });
        }

        // Recursively check for dangerous patterns
        const checkForMaliciousContent = (obj: any): boolean => {
          for (const key in obj) {
            const value = obj[key];
            
            if (typeof value === 'string' && (
              detectSqlInjection(value) ||
              detectXSS(value) ||
              value.includes('<script') ||
              value.includes('javascript:')
            )) {
              return true;
            }
            
            if (typeof value === 'object' && value !== null) {
              if (checkForMaliciousContent(value)) {
                return true;
              }
            }
          }
          return false;
        };

        if (checkForMaliciousContent(body)) {
          return new NextResponse('Malicious content detected', {
            status: 400,
            headers: addSecurityHeaders(new NextResponse().headers),
          });
        }
      } catch (error) {
        // Invalid JSON
        return new NextResponse('Invalid request body', {
          status: 400,
          headers: addSecurityHeaders(new NextResponse().headers),
        });
      }
    }

    return handler(request, response);
  };
}

// Authentication middleware with security checks
export function withSecureAuth(
  handler: (request: NextRequest, response: NextResponse) => Promise<NextResponse>
) {
  return async (request: NextRequest, response: NextResponse) => {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return new NextResponse(
        { error: 'Authentication required' },
        { 
          status: 401,
          headers: addSecurityHeaders(new NextResponse().headers),
        }
      );
    }

    const user = await validateSession(token);
    if (!user) {
      return new NextResponse(
        { error: 'Invalid or expired session' },
        { 
          status: 401,
          headers: addSecurityHeaders(new NextResponse().headers),
        }
      );
    }

    // Check for suspicious activity
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.ip || 'unknown';
    
    // Log authentication attempt
    console.log(`Auth attempt: ${user.username} from ${ip} with ${userAgent}`);

    return handler(request, response);
  };
}
