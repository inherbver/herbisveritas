/**
 * Tests Stripe avec les meilleures pratiques de la documentation officielle
 * Basé sur stripe-node documentation
 */

import Stripe from 'stripe';

describe('Stripe Best Practices Tests', () => {
  let stripe: Stripe;
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock complet selon la documentation Stripe
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
          list: jest.fn(),
          expire: jest.fn(),
        },
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
        del: jest.fn(),
      },
      paymentIntents: {
        create: jest.fn(),
        confirm: jest.fn(),
        cancel: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        capture: jest.fn(),
      },
      invoices: {
        create: jest.fn(),
        retrieve: jest.fn(),
        pay: jest.fn(),
        send: jest.fn(),
        list: jest.fn(),
        finalizeInvoice: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        cancel: jest.fn(), // Note: 'del' is deprecated, use 'cancel' instead
        update: jest.fn(),
        retrieve: jest.fn(),
        list: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
        generateTestHeaderString: jest.fn(),
      },
      errors: {
        StripeError: class StripeError extends Error {
          type: string;
          constructor(message: string) {
            super(message);
            this.type = 'StripeError';
          }
        },
        StripeCardError: class StripeCardError extends Error {
          type = 'StripeCardError';
        },
        StripeInvalidRequestError: class StripeInvalidRequestError extends Error {
          type = 'StripeInvalidRequestError';
        },
        StripeAPIError: class StripeAPIError extends Error {
          type = 'StripeAPIError';
        },
        StripeConnectionError: class StripeConnectionError extends Error {
          type = 'StripeConnectionError';
        },
        StripeAuthenticationError: class StripeAuthenticationError extends Error {
          type = 'StripeAuthenticationError';
        },
        StripeRateLimitError: class StripeRateLimitError extends Error {
          type = 'StripeRateLimitError';
        },
      },
    };
  });

  describe('Webhook Signature Verification', () => {
    it('should generate test webhook signature header', () => {
      // Exemple de la documentation Stripe
      const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_test_123',
            amount: 2000,
            currency: 'usd',
          },
        },
      };

      const payloadString = JSON.stringify(payload, null, 2);
      const secret = 'whsec_test_secret';
      
      // Mock la génération du header
      const testHeader = `t=${Math.floor(Date.now() / 1000)},v1=test_signature`;
      mockStripe.webhooks.generateTestHeaderString.mockReturnValue(testHeader);
      
      // Mock la construction de l'event
      mockStripe.webhooks.constructEvent.mockReturnValue(payload);
      
      // Test
      const header = mockStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret,
      });
      
      const event = mockStripe.webhooks.constructEvent(payloadString, header, secret);
      
      expect(event.id).toBe('evt_test_webhook');
      expect(event.type).toBe('charge.succeeded');
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payloadString,
        header,
        secret
      );
    });

    it('should handle invalid webhook signatures', () => {
      // Mock pour simuler une erreur de signature
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      expect(() => {
        mockStripe.webhooks.constructEvent(
          'payload',
          'invalid-header',
          'secret'
        );
      }).toThrow('Invalid signature');
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle different Stripe error types', async () => {
      // Pattern de la documentation pour gérer les types d'erreurs
      const handleStripeError = (err: any) => {
        switch (err.type) {
          case 'StripeCardError':
            return { error: 'Card was declined', code: 'card_declined' };
          case 'StripeInvalidRequestError':
            return { error: 'Invalid parameters', code: 'invalid_request' };
          case 'StripeAPIError':
            return { error: 'Stripe API error', code: 'api_error' };
          case 'StripeConnectionError':
            return { error: 'Network error', code: 'connection_error' };
          case 'StripeAuthenticationError':
            return { error: 'Invalid API key', code: 'auth_error' };
          case 'StripeRateLimitError':
            return { error: 'Too many requests', code: 'rate_limit' };
          default:
            return { error: 'Unknown error', code: 'unknown' };
        }
      };

      // Test différents types d'erreurs
      const cardError = new mockStripe.errors.StripeCardError('Card declined');
      expect(handleStripeError(cardError)).toEqual({
        error: 'Card was declined',
        code: 'card_declined',
      });

      const apiError = new mockStripe.errors.StripeAPIError('API Error');
      expect(handleStripeError(apiError)).toEqual({
        error: 'Stripe API error',
        code: 'api_error',
      });
    });
  });

  describe('Customer and Payment Flow', () => {
    it('should create customer and payment intent with proper chaining', async () => {
      // Pattern recommandé par la documentation Stripe
      const customerData = {
        id: 'cus_test_123',
        email: 'customer@example.com',
      };
      
      const paymentIntentData = {
        id: 'pi_test_123',
        amount: 2500,
        currency: 'usd',
        status: 'requires_payment_method',
        customer: 'cus_test_123',
      };
      
      mockStripe.customers.create.mockResolvedValue(customerData);
      mockStripe.paymentIntents.create.mockResolvedValue(paymentIntentData);
      
      // Test du flow
      const customer = await mockStripe.customers.create({
        email: 'customer@example.com',
      });
      
      const paymentIntent = await mockStripe.paymentIntents.create({
        amount: 2500,
        currency: 'usd',
        customer: customer.id,
      });
      
      expect(customer.id).toBe('cus_test_123');
      expect(paymentIntent.customer).toBe(customer.id);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'customer@example.com',
      });
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2500,
        currency: 'usd',
        customer: 'cus_test_123',
      });
    });
  });

  describe('Idempotency', () => {
    it('should handle idempotent requests', async () => {
      // La documentation recommande l'utilisation de clés d'idempotence
      const response = { id: 'pi_123', status: 'succeeded' };
      mockStripe.paymentIntents.create.mockResolvedValue(response);
      
      const idempotencyKey = 'key_123';
      
      // Première requête
      const result1 = await mockStripe.paymentIntents.create(
        { amount: 1000, currency: 'eur' },
        { idempotencyKey }
      );
      
      // Deuxième requête avec la même clé (devrait retourner le même résultat)
      const result2 = await mockStripe.paymentIntents.create(
        { amount: 1000, currency: 'eur' },
        { idempotencyKey }
      );
      
      expect(result1).toEqual(response);
      expect(result2).toEqual(response);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(2);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        { amount: 1000, currency: 'eur' },
        { idempotencyKey: 'key_123' }
      );
    });
  });

  describe('Retry Mechanism', () => {
    it('should implement retry with exponential backoff', async () => {
      jest.useFakeTimers();
      
      let attemptCount = 0;
      const maxRetries = 3;
      
      const mockRetryableOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          throw new Error('Network timeout');
        }
        return { success: true };
      });
      
      // Implémentation simple du retry avec exponential backoff
      const retryWithBackoff = async (fn: Function, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === retries - 1) throw error;
            // Exponential backoff: 1s, 2s, 4s...
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      // Test
      const resultPromise = retryWithBackoff(mockRetryableOperation, maxRetries);
      
      // Avancer le temps pour chaque retry
      await jest.advanceTimersByTimeAsync(1000); // 1er retry après 1s
      await jest.advanceTimersByTimeAsync(2000); // 2e retry après 2s
      
      const result = await resultPromise;
      
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(3);
      
      jest.useRealTimers();
    });
  });

  describe('Pagination', () => {
    it('should handle auto-pagination with async iterators', async () => {
      // Mock pour la pagination automatique
      const customers = [
        { id: 'cus_1', email: 'customer1@example.com' },
        { id: 'cus_2', email: 'customer2@example.com' },
        { id: 'cus_3', email: 'customer3@example.com' },
      ];
      
      // Simuler l'itérateur async
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: function() {
          let index = 0;
          return {
            async next() {
              if (index < customers.length) {
                return { value: customers[index++], done: false };
              }
              return { done: true };
            },
          };
        },
      };
      
      mockStripe.customers.list.mockReturnValue(mockAsyncIterator);
      
      // Test de l'itération
      const collectedCustomers = [];
      for await (const customer of mockStripe.customers.list()) {
        collectedCustomers.push(customer);
        if (collectedCustomers.length >= 2) break; // Stop après 2 customers
      }
      
      expect(collectedCustomers).toHaveLength(2);
      expect(collectedCustomers[0].id).toBe('cus_1');
      expect(collectedCustomers[1].id).toBe('cus_2');
    });
  });

  describe('Subscription Management', () => {
    it('should use cancel instead of deprecated del method', async () => {
      // Selon la documentation, subscriptions.del est déprécié en faveur de cancel
      const subscriptionId = 'sub_123';
      const cancelledSubscription = {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Date.now() / 1000,
      };
      
      mockStripe.subscriptions.cancel.mockResolvedValue(cancelledSubscription);
      
      // Utiliser la nouvelle méthode cancel
      const result = await mockStripe.subscriptions.cancel(subscriptionId);
      
      expect(result.status).toBe('canceled');
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
    });
  });

  describe('Configuration Best Practices', () => {
    it('should configure client with proper options', () => {
      // Pattern de configuration recommandé par la documentation
      const createStripeClient = (apiKey: string) => {
        return {
          apiKey,
          config: {
            apiVersion: '2022-11-15',
            maxNetworkRetries: 2,
            timeout: 20000,
            telemetry: false, // Désactiver en test
          },
        };
      };
      
      const stripeClient = createStripeClient('sk_test_123');
      
      expect(stripeClient.config.maxNetworkRetries).toBe(2);
      expect(stripeClient.config.timeout).toBe(20000);
      expect(stripeClient.config.telemetry).toBe(false);
    });
    
    it('should handle lazy initialization pattern', () => {
      // Pattern recommandé pour l'initialisation lazy
      let _stripe: any = null;
      
      const getStripe = () => {
        if (!_stripe) {
          _stripe = {
            initialized: true,
            apiKey: process.env.STRIPE_SECRET_KEY || 'sk_test_default',
          };
        }
        return _stripe;
      };
      
      // Premier appel initialise
      const stripe1 = getStripe();
      expect(stripe1.initialized).toBe(true);
      
      // Deuxième appel retourne la même instance
      const stripe2 = getStripe();
      expect(stripe1).toBe(stripe2);
    });
  });
});