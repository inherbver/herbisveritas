/**
 * Tests pour le logger critique - Service de logging centralisé
 */

import { LogUtils, ConsoleLogger } from '../logger';

// Mock console methods
const originalConsole = global.console;

describe('Core Logger Service', () => {
  let mockConsole: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
  };

  beforeEach(() => {
    mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    global.console = mockConsole as any;
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  describe('LogUtils - Context Management', () => {
    it('should create user action context', () => {
      // Act
      const context = LogUtils.createUserActionContext('user-123', 'create_product', 'products');

      // Assert
      expect(context).toEqual({
        userId: 'user-123',
        action: 'create_product',
        resource: 'products',
        operation: 'create_product',
      });
    });

    it('should handle missing user ID', () => {
      // Act
      const context = LogUtils.createUserActionContext('', 'read_data', 'general');

      // Assert
      expect(context.userId).toBe('');
      expect(context.action).toBe('read_data');
    });

    it('should create API context', () => {
      // Act
      const context = LogUtils.createApiContext('/api/products', 'GET', 'user-456');

      // Assert
      expect(context.path).toBe('/api/products');
      expect(context.method).toBe('GET');
      expect(context.userId).toBe('user-456');
    });
  });

  describe('LogUtils - Operation Logging', () => {
    it('should log operation start', () => {
      // Arrange
      const context = { userId: 'user-123', action: 'test_action', resource: 'test' };

      // Act
      LogUtils.logOperationStart('test_operation', context);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting test_operation')
      );
    });

    it('should log operation success', () => {
      // Arrange
      const context = { userId: 'user-123', action: 'test_action', resource: 'test' };

      // Act
      LogUtils.logOperationSuccess('test_operation', context, { count: 5 });

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully completed test_operation')
      );
    });

    it('should log operation errors', () => {
      // Arrange
      const context = { userId: 'user-123', action: 'test_action', resource: 'test' };
      const error = new Error('Test error');

      // Act
      LogUtils.logOperationError('test_operation', context, error);

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to complete test_operation')
      );
    });
  });

  describe('ConsoleLogger', () => {
    let logger: ConsoleLogger;

    beforeEach(() => {
      logger = new ConsoleLogger();
    });

    it('should log info messages', () => {
      // Act
      logger.info('Test info message', { key: 'value' });

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Test info message')
      );
    });

    it('should log error messages', () => {
      // Act
      logger.error('Test error message', new Error('Test error'));

      // Assert
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
    });

    it('should log warning messages', () => {
      // Act
      logger.warn('Test warning message');

      // Assert
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message')
      );
    });

    it('should log debug messages', () => {
      // Act
      logger.debug('Test debug message');

      // Assert
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Test debug message')
      );
    });
  });

  describe('Log Message Formatting', () => {
    let logger: ConsoleLogger;

    beforeEach(() => {
      logger = new ConsoleLogger();
    });

    it('should format log messages with timestamp', () => {
      // Act
      logger.info('Test message');

      // Assert
      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('timestamp');
      expect(logCall).toContain('level');
      expect(logCall).toContain('message');
    });

    it('should handle complex metadata', () => {
      // Arrange
      const metadata = {
        userId: 'user-123',
        action: 'complex_action',
        nested: {
          data: 'value',
          array: [1, 2, 3],
        },
      };

      // Act
      logger.info('Complex message', metadata);

      // Assert
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Complex message')
      );
    });

    it('should handle error objects properly', () => {
      // Arrange
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test location';

      // Act
      logger.error('Error occurred', error);

      // Assert
      const logCall = mockConsole.error.mock.calls[0][0];
      expect(logCall).toContain('Error occurred');
      expect(logCall).toContain('Test error');
    });
  });

  describe('Edge Cases', () => {
    let logger: ConsoleLogger;

    beforeEach(() => {
      logger = new ConsoleLogger();
    });

    it('should handle null metadata', () => {
      // Act & Assert - Should not throw
      expect(() => {
        logger.info('Message with null metadata', null);
      }).not.toThrow();
    });

    it('should handle undefined message', () => {
      // Act & Assert - Should not throw
      expect(() => {
        logger.info(undefined as any);
      }).not.toThrow();
    });

    it('should handle circular references in metadata', () => {
      // Arrange
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // Act & Assert - Should not throw
      expect(() => {
        logger.info('Message with circular ref', circularObj);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      // Arrange
      const longMessage = 'a'.repeat(10000);

      // Act & Assert - Should not throw
      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    let logger: ConsoleLogger;

    beforeEach(() => {
      logger = new ConsoleLogger();
    });

    it('should handle high-frequency logging', () => {
      // Act - Log many messages quickly
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`);
      }
      const duration = Date.now() - start;

      // Assert - Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(mockConsole.info).toHaveBeenCalledTimes(1000);
    });

    it('should handle large metadata objects', () => {
      // Arrange
      const largeObject = {
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          details: `Details for item ${i}`,
        })),
      };

      // Act & Assert - Should not throw
      expect(() => {
        logger.info('Large object message', largeObject);
      }).not.toThrow();
    });
  });
});