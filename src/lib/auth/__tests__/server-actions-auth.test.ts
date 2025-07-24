// Désactiver le mock global pour ce test
jest.unmock("@/lib/auth/server-actions-auth");

import { withPermission, withPermissionSafe } from "../server-actions-auth";
import { checkUserPermission } from "../server-auth";
import type { AppPermission } from "@/config/permissions";

// Mock the server-auth module
jest.mock("../server-auth", () => ({
  checkUserPermission: jest.fn(),
}));

// A simple async function to be used as our server action
const mockAction = jest.fn(async (arg1: string, arg2: number) => {
  if (arg1 === "throw") {
    throw new Error("Action failed");
  }
  return { result: `Success: ${arg1}, ${arg2}` };
});

describe("Server Action HOFs", () => {
  beforeEach(() => {
    // Clear mocks before each test
    (checkUserPermission as jest.Mock).mockClear();
    mockAction.mockClear();
  });

  describe("withPermission", () => {
    it("should call the action if permission is granted", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });
      // ✅ Utiliser une permission valide du type AppPermission
      const securedAction = withPermission("products:read" as AppPermission, mockAction);

      await expect(securedAction("hello", 123)).resolves.toEqual({ result: "Success: hello, 123" });
      expect(mockAction).toHaveBeenCalledWith("hello", 123);
    });

    it("should throw an error if permission is denied", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Permission denied",
      });
      // ✅ Utiliser une permission valide du type AppPermission
      const securedAction = withPermission("products:read" as AppPermission, mockAction);

      await expect(securedAction("hello", 123)).rejects.toThrow("Unauthorized: Permission denied");
      expect(mockAction).not.toHaveBeenCalled();
    });
  });

  describe("withPermissionSafe", () => {
    it("should return success response if permission is granted", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });
      // ✅ Utiliser une permission valide du type AppPermission
      const securedAction = withPermissionSafe("products:read" as AppPermission, mockAction);

      const response = await securedAction("hello", 123);

      // ✅ Corriger les assertions pour correspondre au type ActionResult
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data).toEqual({ result: "Success: hello, 123" });
        expect("error" in response).toBe(false);
      }
      expect(mockAction).toHaveBeenCalledWith("hello", 123);
    });

    it("should return error response if permission is denied", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({
        isAuthorized: false,
        error: "Permission denied",
      });
      // ✅ Utiliser une permission valide du type AppPermission
      const securedAction = withPermissionSafe("products:read" as AppPermission, mockAction);

      const response = await securedAction("hello", 123);

      // ✅ Corriger les assertions pour correspondre au type ActionResult
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toBe("Permission denied");
        expect("data" in response).toBe(false);
      }
      expect(mockAction).not.toHaveBeenCalled();
    });

    it("should handle errors thrown from within the action", async () => {
      (checkUserPermission as jest.Mock).mockResolvedValue({ isAuthorized: true });
      // ✅ Utiliser une permission valide du type AppPermission
      const securedAction = withPermissionSafe("products:read" as AppPermission, mockAction);

      const response = await securedAction("throw", 456);

      // ✅ Corriger les assertions pour correspondre au type ActionResult
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toBe("Action failed");
        expect("data" in response).toBe(false);
      }
      expect(mockAction).toHaveBeenCalledWith("throw", 456);
    });
  });
});
