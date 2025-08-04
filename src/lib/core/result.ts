/**
 * Result Pattern implementation for robust error handling
 * Provides type-safe error handling without exceptions
 */

import type { SupabaseError } from './errors';

export abstract class Result<T, E = Error> {
  protected constructor(
    protected readonly _value?: T,
    protected readonly _error?: E
  ) {}

  /**
   * Creates a successful result
   */
  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Success<T, E>(value);
  }

  /**
   * Creates an error result
   */
  static error<T, E = Error>(error: E): Result<T, E> {
    return new Failure<T, E>(error);
  }

  /**
   * Creates a successful result (alias for ok)
   */
  static success<T, E = Error>(value: T): Result<T, E> {
    return new Success<T, E>(value);
  }

  /**
   * Creates a failure result (alias for error)
   */
  static failure<T, E = Error>(error: E): Result<T, E> {
    return new Failure<T, E>(error);
  }

  /**
   * Creates a result from a function that might throw
   */
  static from<T, E = Error>(fn: () => T): Result<T, E> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.error(error as E);
    }
  }

  /**
   * Creates a result from an async function that might throw
   */
  static async fromAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (error) {
      return Result.error(error as E);
    }
  }

  /**
   * Checks if the result is successful
   */
  abstract isSuccess(): boolean;

  /**
   * Checks if the result is an error
   */
  abstract isError(): boolean;

  /**
   * Gets the value if successful, throws if error
   */
  abstract getValue(): T;

  /**
   * Gets the error if failed, throws if success
   */
  abstract getError(): E;

  /**
   * Gets the value if successful, returns undefined if error
   */
  abstract getValueOrUndefined(): T | undefined;

  /**
   * Gets the value if successful, returns the provided default if error
   */
  abstract getValueOr(defaultValue: T): T;

  /**
   * Pattern matching for result handling
   */
  abstract match<U>(
    onSuccess: (value: T) => U,
    onError: (error: E) => U
  ): U;

  /**
   * Maps the success value to a new type
   */
  abstract map<U>(fn: (value: T) => U): Result<U, E>;

  /**
   * Maps the error to a new type
   */
  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;

  /**
   * Chains operations that return Results
   */
  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;

  /**
   * Applies a side effect if successful
   */
  abstract tap(fn: (value: T) => void): Result<T, E>;

  /**
   * Applies a side effect if error
   */
  abstract tapError(fn: (error: E) => void): Result<T, E>;
}

class Success<T, E> extends Result<T, E> {
  constructor(value: T) {
    super(value, undefined);
  }

  isSuccess(): boolean {
    return true;
  }

  isError(): boolean {
    return false;
  }

  getValue(): T {
    return this._value!;
  }

  getError(): E {
    throw new Error('Cannot get error from successful result');
  }

  getValueOrUndefined(): T {
    return this._value!;
  }

  getValueOr(_defaultValue: T): T {
    return this._value!;
  }

  match<U>(onSuccess: (value: T) => U, _onError: (error: E) => U): U {
    return onSuccess(this._value!);
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return Result.ok(fn(this._value!));
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return Result.ok(this._value!);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this._value!);
  }

  tap(fn: (value: T) => void): Result<T, E> {
    fn(this._value!);
    return this;
  }

  tapError(_fn: (error: E) => void): Result<T, E> {
    return this;
  }
}

class Failure<T, E> extends Result<T, E> {
  constructor(error: E) {
    super(undefined, error);
  }

  isSuccess(): boolean {
    return false;
  }

  isError(): boolean {
    return true;
  }

  getValue(): T {
    throw new Error('Cannot get value from error result');
  }

  getError(): E {
    return this._error!;
  }

  getValueOrUndefined(): T | undefined {
    return undefined;
  }

  getValueOr(defaultValue: T): T {
    return defaultValue;
  }

  match<U>(_onSuccess: (value: T) => U, onError: (error: E) => U): U {
    return onError(this._error!);
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return Result.error(this._error!);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return Result.error(fn(this._error!));
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return Result.error(this._error!);
  }

  tap(_fn: (value: T) => void): Result<T, E> {
    return this;
  }

  tapError(fn: (error: E) => void): Result<T, E> {
    fn(this._error!);
    return this;
  }
}

/**
 * Utility type for action results
 */
/**
 * Server Action Result interface for consistent returns
 */
export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Form Action Result interface with field validation support
 */
export interface FormActionResult<T> extends ServerActionResult<T> {
  fieldErrors?: Record<string, string[]>;
}

export type ActionResult<T> = ServerActionResult<T>;

/**
 * Helper functions for action results
 */
export const ActionResult = {
  ok: <T>(value: T, message?: string): ActionResult<T> => ({
    success: true,
    data: value,
    message
  }),
  
  error: <T>(error: string): ActionResult<T> => ({
    success: false,
    error
  }),
  
  fromResult: <T>(result: Result<T, unknown>, successMessage?: string): ActionResult<T> => {
    return result.match(
      (value) => ActionResult.ok(value, successMessage),
      (error) => ActionResult.error(
        error instanceof Error ? error.message : String(error)
      )
    );
  }
};

/**
 * Helper functions for form action results
 */
export const FormActionResult = {
  ok: <T>(value: T, message?: string): FormActionResult<T> => ({
    success: true,
    data: value,
    message
  }),
  
  error: <T>(error: string, fieldErrors?: Record<string, string[]>): FormActionResult<T> => ({
    success: false,
    error,
    fieldErrors
  }),
  
  fieldValidationError: <T>(fieldErrors: Record<string, string[]>): FormActionResult<T> => ({
    success: false,
    error: "Validation errors occurred",
    fieldErrors
  })
};

/**
 * Utility type for database operation results
 */
export interface DatabaseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type DatabaseResult<T> = Result<T, DatabaseError>;

/**
 * Helper to create database results
 */
export const DatabaseResult = {
  ok: <T>(value: T): DatabaseResult<T> => Result.ok(value),
  error: <T>(error: DatabaseError): DatabaseResult<T> => Result.error(error),
  fromSupabaseError: <T>(error: SupabaseError): DatabaseResult<T> => {
    return Result.error({
      code: error.code || 'UNKNOWN',
      message: error.message || 'Unknown database error',
      details: error.details
    });
  }
};