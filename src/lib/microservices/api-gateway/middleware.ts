/**
 * API Gateway Middleware
 * 
 * Next.js middleware integration for API Gateway routing.
 * Handles request routing, authentication, and pre-processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiGateway } from './gateway';
import { getApiGatewayConfig } from './routing-config';
import { logger } from '@/lib/core/logger';

/**
 * Gateway middleware instance
 */
let gatewayInstance: ApiGateway | null = null;

/**
 * Initialize gateway instance
 */
function getGatewayInstance(): ApiGateway {
  if (!gatewayInstance) {
    const config = getApiGatewayConfig();
    gatewayInstance = new ApiGateway(config);
    logger.info('ApiGateway initialized', {
      totalRoutes: Object.values(config.services).flat().length,
      services: Object.keys(config.services).length,
    });
  }
  return gatewayInstance;
}

/**
 * Check if request should be handled by gateway
 */
function shouldHandleRequest(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  
  // Handle API routes that match microservice patterns
  const microservicePatterns = [
    '/api/products',
    '/api/inventory',
    '/api/cart',
    '/api/orders',
    '/api/payments',
    '/api/auth',
    '/api/users',
    '/api/addresses',
    '/api/articles',
    '/api/notifications',
    '/api/analytics',
  ];

  return microservicePatterns.some(pattern => path.startsWith(pattern));
}

/**
 * Handle CORS for microservices
 */
function addCorsHeaders(response: NextResponse): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = 'http://localhost:3000'; // In real app, get from request headers
  
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  return response;
}

/**
 * Handle preflight OPTIONS requests
 */
function handlePreflight(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

/**
 * API Gateway Middleware
 */
export async function apiGatewayMiddleware(request: NextRequest): Promise<NextResponse | undefined> {
  try {
    // Skip non-API routes
    if (!shouldHandleRequest(request)) {
      return undefined;
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handlePreflight(request);
    }

    // Get gateway instance and process request
    const gateway = getGatewayInstance();
    const response = await gateway.processRequest(request);
    
    // Add CORS headers to response
    return addCorsHeaders(response);

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Gateway middleware error');
    logger.error('apiGatewayMiddleware', err, {
      method: request.method,
      path: request.nextUrl.pathname,
    });

    // Return error response
    const errorResponse = NextResponse.json(
      {
        error: {
          message: 'Gateway error',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );

    return addCorsHeaders(errorResponse);
  }
}

/**
 * Health check endpoint for gateway
 */
export async function gatewayHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  gateway: any;
  timestamp: string;
}> {
  try {
    const gateway = getGatewayInstance();
    const stats = gateway.getStatistics();
    
    return {
      status: 'healthy',
      gateway: {
        ...stats,
        uptime: process.uptime(),
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('gatewayHealthCheck', error as Error);
    
    return {
      status: 'unhealthy',
      gateway: null,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Gateway metrics endpoint
 */
export async function getGatewayMetrics(): Promise<{
  routes: number;
  circuitBreakers: Record<string, any>;
  rateLimiters: number;
  uptime: number;
  timestamp: string;
}> {
  const gateway = getGatewayInstance();
  const stats = gateway.getStatistics();
  
  return {
    routes: stats.totalRoutes,
    circuitBreakers: stats.circuitBreakers,
    rateLimiters: stats.rateLimiters,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset gateway instance (for testing)
 */
export function resetGatewayInstance(): void {
  gatewayInstance = null;
}

export { getGatewayInstance };