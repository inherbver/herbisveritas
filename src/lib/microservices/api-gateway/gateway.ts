/**
 * API Gateway for Microservices Architecture
 * 
 * Provides centralized routing, authentication, rate limiting,
 * and request/response transformation for microservices.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Result } from '@/lib/core/result';
import { logger } from '@/lib/core/logger';

/**
 * Service route configuration
 */
export interface ServiceRoute {
  readonly path: string;
  readonly service: string;
  readonly target: string;
  readonly methods: string[];
  readonly requiresAuth: boolean;
  readonly rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
  readonly timeout?: number;
  readonly retries?: number;
  readonly circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeMs: number;
  };
}

/**
 * API Gateway configuration
 */
export interface ApiGatewayConfig {
  readonly services: Record<string, ServiceRoute[]>;
  readonly defaultTimeout: number;
  readonly defaultRetries: number;
  readonly enableLogging: boolean;
  readonly enableMetrics: boolean;
}

/**
 * Request context for processing
 */
interface RequestContext {
  requestId: string;
  userId?: string;
  service: string;
  route: ServiceRoute;
  startTime: number;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requests: number;
  windowStart: number;
}

/**
 * API Gateway implementation
 */
export class ApiGateway {
  private readonly routeMap = new Map<string, ServiceRoute>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly rateLimiters = new Map<string, RateLimiterState>();

  constructor(private readonly config: ApiGatewayConfig) {
    this.initializeRoutes();
  }

  /**
   * Initialize route mappings from configuration
   */
  private initializeRoutes(): void {
    for (const [serviceName, routes] of Object.entries(this.config.services)) {
      for (const route of routes) {
        const key = this.createRouteKey(route.path, serviceName);
        this.routeMap.set(key, route);
        
        // Initialize circuit breaker
        if (route.circuitBreaker) {
          this.circuitBreakers.set(key, {
            failures: 0,
            lastFailureTime: 0,
            state: 'closed'
          });
        }
      }
    }

    logger.info('ApiGateway.initializeRoutes', {
      totalRoutes: this.routeMap.size,
      services: Object.keys(this.config.services),
    });
  }

  /**
   * Process incoming request through the gateway
   */
  async processRequest(request: NextRequest): Promise<NextResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Find matching route
      const routeResult = this.findMatchingRoute(request);
      if (routeResult.isError()) {
        return this.createErrorResponse(404, 'Route not found', requestId);
      }

      const route = routeResult.getValue();
      const context: RequestContext = {
        requestId,
        service: route.service,
        route,
        startTime,
      };

      // Extract user context if available
      context.userId = this.extractUserId(request);

      logger.info('ApiGateway.processRequest', {
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        service: route.service,
        userId: context.userId,
      });

      // Validate HTTP method
      if (!route.methods.includes(request.method)) {
        return this.createErrorResponse(405, 'Method not allowed', requestId);
      }

      // Check authentication
      if (route.requiresAuth) {
        const authResult = await this.validateAuthentication(request);
        if (authResult.isError()) {
          return this.createErrorResponse(401, 'Unauthorized', requestId);
        }
      }

      // Check rate limiting
      if (route.rateLimit) {
        const rateLimitResult = this.checkRateLimit(route, context.userId || 'anonymous');
        if (rateLimitResult.isError()) {
          return this.createErrorResponse(429, 'Rate limit exceeded', requestId);
        }
      }

      // Check circuit breaker
      if (route.circuitBreaker) {
        const circuitResult = this.checkCircuitBreaker(route);
        if (circuitResult.isError()) {
          return this.createErrorResponse(503, 'Service temporarily unavailable', requestId);
        }
      }

      // Forward request to target service
      const response = await this.forwardRequest(request, route, context);
      
      // Update circuit breaker on success
      if (route.circuitBreaker) {
        this.updateCircuitBreakerSuccess(route);
      }

      // Log request completion
      this.logRequestCompletion(context, response.status);

      return response;

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown gateway error');
      logger.error('ApiGateway.processRequest', err, { requestId });
      return this.createErrorResponse(500, 'Internal server error', requestId);
    }
  }

  /**
   * Find matching route for request
   */
  private findMatchingRoute(request: NextRequest): Result<ServiceRoute, Error> {
    const path = request.nextUrl.pathname;
    
    // Try exact match first
    for (const [routeKey, route] of this.routeMap.entries()) {
      if (this.matchesRoute(path, route.path)) {
        return Result.ok(route);
      }
    }

    return Result.error(new Error('No matching route found'));
  }

  /**
   * Check if path matches route pattern
   */
  private matchesRoute(path: string, routePattern: string): boolean {
    // Simple pattern matching (could be enhanced with regex)
    const pathSegments = path.split('/').filter(s => s);
    const patternSegments = routePattern.split('/').filter(s => s);

    if (pathSegments.length !== patternSegments.length) {
      return false;
    }

    for (let i = 0; i < pathSegments.length; i++) {
      const pathSegment = pathSegments[i];
      const patternSegment = patternSegments[i];

      // Handle wildcards and parameters
      if (patternSegment.startsWith(':') || patternSegment === '*') {
        continue;
      }

      if (pathSegment !== patternSegment) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate authentication
   */
  private async validateAuthentication(request: NextRequest): Promise<Result<string, Error>> {
    // In a real implementation, this would validate JWT tokens,
    // API keys, or integrate with authentication service
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Result.error(new Error('Missing or invalid authorization header'));
    }

    // Simulate token validation
    const token = authHeader.slice(7);
    if (token.length < 10) {
      return Result.error(new Error('Invalid token'));
    }

    return Result.ok(token);
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(route: ServiceRoute, identifier: string): Result<void, Error> {
    if (!route.rateLimit) {
      return Result.ok(undefined);
    }

    const key = `${route.service}:${route.path}:${identifier}`;
    const now = Date.now();
    const limiter = this.rateLimiters.get(key);

    if (!limiter) {
      // First request
      this.rateLimiters.set(key, {
        requests: 1,
        windowStart: now,
      });
      return Result.ok(undefined);
    }

    // Check if window has expired
    if (now - limiter.windowStart > route.rateLimit.window) {
      // Reset window
      this.rateLimiters.set(key, {
        requests: 1,
        windowStart: now,
      });
      return Result.ok(undefined);
    }

    // Check if limit exceeded
    if (limiter.requests >= route.rateLimit.requests) {
      return Result.error(new Error('Rate limit exceeded'));
    }

    // Increment counter
    limiter.requests++;
    return Result.ok(undefined);
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(route: ServiceRoute): Result<void, Error> {
    if (!route.circuitBreaker) {
      return Result.ok(undefined);
    }

    const key = this.createRouteKey(route.path, route.service);
    const breaker = this.circuitBreakers.get(key);

    if (!breaker) {
      return Result.ok(undefined);
    }

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return Result.ok(undefined);

      case 'open':
        // Check if recovery time has passed
        if (now - breaker.lastFailureTime > route.circuitBreaker.recoveryTimeMs) {
          breaker.state = 'half-open';
          return Result.ok(undefined);
        }
        return Result.error(new Error('Circuit breaker is open'));

      case 'half-open':
        return Result.ok(undefined);

      default:
        return Result.ok(undefined);
    }
  }

  /**
   * Forward request to target service
   */
  private async forwardRequest(
    request: NextRequest,
    route: ServiceRoute,
    context: RequestContext
  ): Promise<NextResponse> {
    const timeout = route.timeout || this.config.defaultTimeout;
    const retries = route.retries || this.config.defaultRetries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const targetUrl = this.buildTargetUrl(request, route);
        
        // Clone request for forwarding
        const forwardedRequest = this.cloneRequest(request, targetUrl);
        
        // Add gateway headers
        forwardedRequest.headers.set('X-Gateway-Request-Id', context.requestId);
        forwardedRequest.headers.set('X-Gateway-Service', route.service);
        if (context.userId) {
          forwardedRequest.headers.set('X-Gateway-User-Id', context.userId);
        }

        // Make request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(forwardedRequest, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Create response with gateway headers
          const gatewayResponse = new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });

          gatewayResponse.headers.set('X-Gateway-Request-Id', context.requestId);
          gatewayResponse.headers.set('X-Gateway-Service', route.service);

          return gatewayResponse;

        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Request failed');
        
        if (attempt < retries) {
          logger.warn('ApiGateway.forwardRequest', {
            requestId: context.requestId,
            service: route.service,
            attempt: attempt + 1,
            error: lastError.message,
          });

          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    // Update circuit breaker on failure
    if (route.circuitBreaker && lastError) {
      this.updateCircuitBreakerFailure(route);
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Build target URL for service
   */
  private buildTargetUrl(request: NextRequest, route: ServiceRoute): string {
    const baseUrl = route.target.endsWith('/') ? route.target.slice(0, -1) : route.target;
    const path = request.nextUrl.pathname;
    const search = request.nextUrl.search;
    
    return `${baseUrl}${path}${search}`;
  }

  /**
   * Clone request for forwarding
   */
  private cloneRequest(request: NextRequest, targetUrl: string): Request {
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Skip host header to avoid conflicts
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    return new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body,
    });
  }

  /**
   * Update circuit breaker on success
   */
  private updateCircuitBreakerSuccess(route: ServiceRoute): void {
    const key = this.createRouteKey(route.path, route.service);
    const breaker = this.circuitBreakers.get(key);

    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  /**
   * Update circuit breaker on failure
   */
  private updateCircuitBreakerFailure(route: ServiceRoute): void {
    if (!route.circuitBreaker) return;

    const key = this.createRouteKey(route.path, route.service);
    const breaker = this.circuitBreakers.get(key);

    if (breaker) {
      breaker.failures++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failures >= route.circuitBreaker.failureThreshold) {
        breaker.state = 'open';
        logger.warn('Circuit breaker opened', {
          service: route.service,
          path: route.path,
          failures: breaker.failures,
        });
      }
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(status: number, message: string, requestId: string): NextResponse {
    return NextResponse.json(
      {
        error: {
          message,
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status,
        headers: {
          'X-Gateway-Request-Id': requestId,
        },
      }
    );
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: NextRequest): string | undefined {
    // This would typically extract from JWT token or session
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Simulate user ID extraction from token
      return 'user-' + authHeader.slice(7, 15);
    }
    return undefined;
  }

  /**
   * Log request completion
   */
  private logRequestCompletion(context: RequestContext, status: number): void {
    const duration = Date.now() - context.startTime;
    
    logger.info('ApiGateway.requestCompleted', {
      requestId: context.requestId,
      service: context.service,
      status,
      duration,
      userId: context.userId,
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create route key
   */
  private createRouteKey(path: string, service: string): string {
    return `${service}:${path}`;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get gateway statistics
   */
  getStatistics(): {
    totalRoutes: number;
    circuitBreakers: { [key: string]: CircuitBreakerState };
    rateLimiters: number;
  } {
    return {
      totalRoutes: this.routeMap.size,
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      rateLimiters: this.rateLimiters.size,
    };
  }
}