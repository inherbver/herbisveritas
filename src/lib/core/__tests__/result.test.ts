/**
 * Tests for Result Pattern implementation
 */

import { Result, ActionResult } from '../result';

describe('Result Pattern', () => {
  describe('Success cases', () => {
    it('should create successful result', () => {
      const result = Result.ok('test value');
      
      expect(result.isSuccess()).toBe(true);
      expect(result.isError()).toBe(false);
      expect(result.getValue()).toBe('test value');
      expect(result.getValueOrUndefined()).toBe('test value');
      expect(result.getValueOr('default')).toBe('test value');
    });

    it('should throw when getting error from success', () => {
      const result = Result.ok('test value');
      
      expect(() => result.getError()).toThrow('Cannot get error from successful result');
    });

    it('should map successful result', () => {
      const result = Result.ok(5);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isSuccess()).toBe(true);
      expect(mapped.getValue()).toBe(10);
    });

    it('should flatMap successful result', () => {
      const result = Result.ok(5);
      const flatMapped = result.flatMap(x => Result.ok(x * 2));
      
      expect(flatMapped.isSuccess()).toBe(true);
      expect(flatMapped.getValue()).toBe(10);
    });

    it('should apply tap to successful result', () => {
      const mockFn = jest.fn();
      const result = Result.ok('test');
      
      const tapped = result.tap(mockFn);
      
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(tapped).toBe(result);
    });

    it('should not apply tapError to successful result', () => {
      const mockFn = jest.fn();
      const result = Result.ok('test');
      
      const tapped = result.tapError(mockFn);
      
      expect(mockFn).not.toHaveBeenCalled();
      expect(tapped).toBe(result);
    });
  });

  describe('Error cases', () => {
    it('should create error result', () => {
      const error = new Error('test error');
      const result = Result.error(error);
      
      expect(result.isSuccess()).toBe(false);
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBe(error);
      expect(result.getValueOrUndefined()).toBeUndefined();
      expect(result.getValueOr('default')).toBe('default');
    });

    it('should throw when getting value from error', () => {
      const result = Result.error('test error');
      
      expect(() => result.getValue()).toThrow('Cannot get value from error result');
    });

    it('should not map error result', () => {
      const result = Result.error('test error');
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isError()).toBe(true);
      expect(mapped.getError()).toBe('test error');
    });

    it('should map error to new error type', () => {
      const result = Result.error('original error');
      const mapped = result.mapError(error => new Error(error));
      
      expect(mapped.isError()).toBe(true);
      expect(mapped.getError()).toBeInstanceOf(Error);
      expect(mapped.getError().message).toBe('original error');
    });

    it('should not flatMap error result', () => {
      const result = Result.error('test error');
      const flatMapped = result.flatMap(x => Result.ok(x * 2));
      
      expect(flatMapped.isError()).toBe(true);
      expect(flatMapped.getError()).toBe('test error');
    });

    it('should not apply tap to error result', () => {
      const mockFn = jest.fn();
      const result = Result.error('test error');
      
      const tapped = result.tap(mockFn);
      
      expect(mockFn).not.toHaveBeenCalled();
      expect(tapped).toBe(result);
    });

    it('should apply tapError to error result', () => {
      const mockFn = jest.fn();
      const result = Result.error('test error');
      
      const tapped = result.tapError(mockFn);
      
      expect(mockFn).toHaveBeenCalledWith('test error');
      expect(tapped).toBe(result);
    });
  });

  describe('Pattern matching', () => {
    it('should match successful result', () => {
      const result = Result.ok('success');
      
      const matched = result.match(
        value => `Success: ${value}`,
        error => `Error: ${error}`
      );
      
      expect(matched).toBe('Success: success');
    });

    it('should match error result', () => {
      const result = Result.error('failure');
      
      const matched = result.match(
        value => `Success: ${value}`,
        error => `Error: ${error}`
      );
      
      expect(matched).toBe('Error: failure');
    });
  });

  describe('Static factory methods', () => {
    it('should create result from function', () => {
      const successResult = Result.from(() => 'success');
      expect(successResult.isSuccess()).toBe(true);
      expect(successResult.getValue()).toBe('success');
      
      const errorResult = Result.from(() => {
        throw new Error('failure');
      });
      expect(errorResult.isError()).toBe(true);
      expect(errorResult.getError()).toBeInstanceOf(Error);
    });

    it('should create result from async function', async () => {
      const successResult = await Result.fromAsync(async () => 'success');
      expect(successResult.isSuccess()).toBe(true);
      expect(successResult.getValue()).toBe('success');
      
      const errorResult = await Result.fromAsync(async () => {
        throw new Error('failure');
      });
      expect(errorResult.isError()).toBe(true);
      expect(errorResult.getError()).toBeInstanceOf(Error);
    });
  });

  describe('ActionResult utilities', () => {
    it('should create ActionResult success', () => {
      const result = ActionResult.ok('success');
      
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe('success');
    });

    it('should create ActionResult error', () => {
      const result = ActionResult.error('error message');
      
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBe('error message');
    });

    it('should create ActionResult from async function', async () => {
      const successResult = await ActionResult.fromAsync(async () => 'success');
      expect(successResult.isSuccess()).toBe(true);
      expect(successResult.getValue()).toBe('success');
      
      const errorResult = await ActionResult.fromAsync(async () => {
        throw new Error('failure');
      });
      expect(errorResult.isError()).toBe(true);
      expect(errorResult.getError()).toBe('failure');
    });
  });

  describe('Chaining operations', () => {
    it('should chain successful operations', () => {
      const result = Result.ok(5)
        .map(x => x * 2)
        .flatMap(x => Result.ok(x + 1))
        .map(x => x.toString());
      
      expect(result.isSuccess()).toBe(true);
      expect(result.getValue()).toBe('11');
    });

    it('should stop chain on first error', () => {
      const result = Result.ok(5)
        .map(x => x * 2)
        .flatMap(() => Result.error('error'))
        .map(x => x.toString());
      
      expect(result.isError()).toBe(true);
      expect(result.getError()).toBe('error');
    });

    it('should apply side effects in chain', () => {
      const tapFn = jest.fn();
      const tapErrorFn = jest.fn();
      
      const result = Result.ok(5)
        .tap(tapFn)
        .tapError(tapErrorFn)
        .map(x => x * 2);
      
      expect(tapFn).toHaveBeenCalledWith(5);
      expect(tapErrorFn).not.toHaveBeenCalled();
      expect(result.getValue()).toBe(10);
    });
  });
});