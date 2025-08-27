/**
 * Mock pour le logger dans les tests
 */

export const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

export const LogUtils = {
  createUserActionContext: jest.fn((userId, action, resource) => ({
    userId,
    action,
    resource,
  })),
  logOperationStart: jest.fn(),
  logOperationSuccess: jest.fn(),
  logOperationError: jest.fn(),
};

export default logger;