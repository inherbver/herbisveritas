import { checkUserPermission } from "@/lib/auth/server-auth";
import type { AppPermission } from "@/config/permissions";

/**
 * Higher-order function to secure Server Actions by checking for a specific permission.
 * Throws an error if the user is not authorized.
 * @param permission The permission required to execute the action.
 * @param action The Server Action to secure.
 * @returns A new function that includes the permission check before executing the original action.
 */
export function withPermission<T extends unknown[], R>(
  permission: AppPermission,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const { isAuthorized, error } = await checkUserPermission(permission);

    if (!isAuthorized) {
      // We throw an error that can be caught in a try/catch block on the client.
      throw new Error(`Unauthorized: ${error || "Insufficient permissions"}`);
    }

    return action(...args);
  };
}

/**
 * A typed result for Server Actions, useful for handling success and error states in the UI
 * without relying on try/catch blocks.
 */
type ActionResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Higher-order function to secure Server Actions, returning a typed result object instead of throwing an error.
 * This is generally safer for client-side handling.
 * @param permission The permission required to execute the action.
 * @param action The Server Action to secure.
 * @returns A new function that returns a result object { success: boolean, data?: T, error?: string }.
 */
export function withPermissionSafe<T extends unknown[], R>(
  permission: AppPermission,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<ActionResult<R>> => {
    try {
      const { isAuthorized, error } = await checkUserPermission(permission);

      if (!isAuthorized) {
        return {
          success: false,
          error: error || "Insufficient permissions",
        };
      }

      const data = await action(...args);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      };
    }
  };
}
