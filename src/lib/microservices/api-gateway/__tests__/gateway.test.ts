/**
 * API Gateway Tests
 * 
 * Tests for the API Gateway implementation including
 * routing, rate limiting, circuit breakers, and error handling.
 */

import { NextRequest } from 'next/server';
import { ApiGateway, ApiGatewayConfig } from '../gateway';

// Mock logger
jest.mock('@/lib/core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ApiGateway', () => {
  let gateway: ApiGateway;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const testConfig: ApiGatewayConfig = {
    services: {
      TEST_SERVICE: [
        {
          path: '/api/test',
          service: 'TEST_SERVICE',
          target: 'http://localhost:3001',
          methods: ['GET', 'POST'],
          requiresAuth: false,
          timeout: 5000,
        },
        {
          path: '/api/test/auth',
          service: 'TEST_SERVICE',
          target: 'http://localhost:3001',
          methods: ['GET'],
          requiresAuth: true,
          timeout: 5000,
        },
        {
          path: '/api/test/rate-limited',
          service: 'TEST_SERVICE',
          target: 'http://localhost:3001',
          methods: ['GET'],
          requiresAuth: false,
          rateLimit: {
            requests: 2,
            window: 1000,
          },
        },
        {
          path: '/api/test/circuit-breaker',
          service: 'TEST_SERVICE',
          target: 'http://localhost:3001',
          methods: ['GET'],
          requiresAuth: false,
          circuitBreaker: {
            failureThreshold: 2,
            recoveryTimeMs: 1000,
          },
        },
      ],
    },
    defaultTimeout: 5000,
    defaultRetries: 1,
    enableLogging: true,
    enableMetrics: true,
  };

  beforeEach(() => {
    gateway = new ApiGateway(testConfig);
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  describe('Route Matching', () => {
    it('should route valid requests to target service', async () => {
      // Mock successful response
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3001/api/test',
          method: 'GET',
        }),
        expect.any(Object)
      );
    });

    it('should return 404 for unknown routes', async () => {
      const request = new NextRequest('http://localhost:3000/api/unknown', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(404);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return 405 for unsupported methods', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE', // Not in allowed methods
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(405);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should allow requests to non-auth routes without token', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(200);
    });

    it('should reject requests to auth routes without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test/auth', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(401);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should allow requests to auth routes with valid token', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test/auth', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(200);
    });

    it('should reject requests with invalid token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/test/auth', {
        method: 'GET',
        headers: {
          authorization: 'Invalid token',
        },
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(401);
    });

    it('should reject requests with short token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test/auth', {
        method: 'GET',
        headers: {
          authorization: 'Bearer short',
        },
      });

      const response = await gateway.processRequest(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test/rate-limited', {
        method: 'GET',
      });

      // First request should succeed
      const response1 = await gateway.processRequest(request);
      expect(response1.status).toBe(200);

      // Second request should also succeed
      const response2 = await gateway.processRequest(request);
      expect(response2.status).toBe(200);
    });

    it('should reject requests exceeding rate limit', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test/rate-limited', {
        method: 'GET',
      });

      // Make requests up to the limit
      await gateway.processRequest(request);
      await gateway.processRequest(request);

      // Third request should be rate limited
      const response3 = await gateway.processRequest(request);
      expect(response3.status).toBe(429);
    });

    it('should reset rate limit after window expires', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test/rate-limited', {
        method: 'GET',
      });

      // Exhaust rate limit
      await gateway.processRequest(request);
      await gateway.processRequest(request);
      
      // Should be rate limited
      const response3 = await gateway.processRequest(request);
      expect(response3.status).toBe(429);

      // Wait for window to expire and try again
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const response4 = await gateway.processRequest(request);
      expect(response4.status).toBe(200);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after consecutive failures', async () => {
      // Mock failures
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/test/circuit-breaker', {
        method: 'GET',
      });

      // First failure
      const response1 = await gateway.processRequest(request);
      expect(response1.status).toBe(500);

      // Second failure should open circuit
      const response2 = await gateway.processRequest(request);
      expect(response2.status).toBe(500);

      // Third request should be rejected by open circuit
      const response3 = await gateway.processRequest(request);
      expect(response3.status).toBe(503);
    });

    it('should recover from open circuit after timeout', async () => {
      // Mock initial failures then success
      mockFetch
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValue(new Response('{"success": true}', { status: 200 }));

      const request = new NextRequest('http://localhost:3000/api/test/circuit-breaker', {
        method: 'GET',
      });

      // Open the circuit
      await gateway.processRequest(request);
      await gateway.processRequest(request);

      // Should be rejected
      const response3 = await gateway.processRequest(request);
      expect(response3.status).toBe(503);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now succeed and close circuit
      const response4 = await gateway.processRequest(request);
      expect(response4.status).toBe(200);
    });
  });

  describe('Request Forwarding', () => {
    it('should forward request headers to target service', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-custom-header': 'test-value',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      await gateway.processRequest(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3001/api/test',
          method: 'POST',
          headers: expect.objectContaining({
            'content-type': 'application/json',
            'x-custom-header': 'test-value',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should add gateway headers to forwarded request', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      await gateway.processRequest(request);

      const forwardedRequest = mockFetch.mock.calls[0][0] as Request;
      expect(forwardedRequest.headers.get('X-Gateway-Request-Id')).toBeTruthy();
      expect(forwardedRequest.headers.get('X-Gateway-Service')).toBe('TEST_SERVICE');
    });

    it('should preserve query parameters', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', { status: 200 })
      );

      const request = new NextRequest('http://localhost:3000/api/test?param1=value1&param2=value2', {
        method: 'GET',
      });

      await gateway.processRequest(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3001/api/test?param1=value1&param2=value2',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service timeouts', async () => {
      // Mock timeout
      mockFetch.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);
      expect(response.status).toBe(500);
    });

    it('should handle service errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);
      expect(response.status).toBe(500);
    });

    it('should retry failed requests', async () => {
      // Mock first call failure, second call success
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue(
          new Response('{"success": true}', { status: 200 })
        );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const response = await gateway.processRequest(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Statistics', () => {
    it('should provide gateway statistics', () => {
      const stats = gateway.getStatistics();

      expect(stats).toHaveProperty('totalRoutes');
      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats).toHaveProperty('rateLimiters');
      expect(stats.totalRoutes).toBeGreaterThan(0);
    });
  });
});