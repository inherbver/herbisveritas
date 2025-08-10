/**
 * Tests for Profile Zustand Store
 */

import { profileStore } from "../profileStore";
import type { Profile } from "@/types/auth";

// Mock profile data
const mockProfile: Profile = {
  id: "user-123",
  email: "test@example.com",
  phone: "+33612345678",
  firstName: "John",
  lastName: "Doe",
  avatarUrl: "https://example.com/avatar.jpg",
  role: "user",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  isNewsletterSubscribed: true,
  language: "fr",
  emailVerified: true,
  phoneVerified: false,
};

const mockProfileUpdate = {
  firstName: "Jane",
  lastName: "Smith",
  phone: "+33687654321",
};

describe("profileStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    profileStore.setState({
      profile: null,
      isLoading: false,
      isUpdating: false,
      error: null,
    });
  });

  describe("setProfile", () => {
    it("should set profile data", () => {
      const { setProfile } = profileStore.getState();

      setProfile(mockProfile);

      const state = profileStore.getState();
      expect(state.profile).toEqual(mockProfile);
      expect(state.error).toBeNull();
    });

    it("should clear error when setting profile", () => {
      profileStore.setState({ error: "Previous error" });

      const { setProfile } = profileStore.getState();
      setProfile(mockProfile);

      const state = profileStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("updateProfile", () => {
    it("should update existing profile", () => {
      const { setProfile, updateProfile } = profileStore.getState();

      setProfile(mockProfile);
      updateProfile(mockProfileUpdate);

      const state = profileStore.getState();
      expect(state.profile?.firstName).toBe("Jane");
      expect(state.profile?.lastName).toBe("Smith");
      expect(state.profile?.phone).toBe("+33687654321");
      expect(state.profile?.email).toBe(mockProfile.email); // Unchanged fields
    });

    it("should not update if profile is null", () => {
      const { updateProfile } = profileStore.getState();

      updateProfile(mockProfileUpdate);

      const state = profileStore.getState();
      expect(state.profile).toBeNull();
    });
  });

  describe("clearProfile", () => {
    it("should clear profile and reset state", () => {
      const { setProfile, clearProfile } = profileStore.getState();

      setProfile(mockProfile);
      profileStore.setState({
        isLoading: true,
        isUpdating: true,
        error: "Some error",
      });

      clearProfile();

      const state = profileStore.getState();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isUpdating).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("setLoading", () => {
    it("should set loading state", () => {
      const { setLoading } = profileStore.getState();

      setLoading(true);
      expect(profileStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(profileStore.getState().isLoading).toBe(false);
    });
  });

  describe("setUpdating", () => {
    it("should set updating state", () => {
      const { setUpdating } = profileStore.getState();

      setUpdating(true);
      expect(profileStore.getState().isUpdating).toBe(true);

      setUpdating(false);
      expect(profileStore.getState().isUpdating).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { setError } = profileStore.getState();

      setError("Test error");
      expect(profileStore.getState().error).toBe("Test error");
    });

    it("should clear error with null", () => {
      const { setError } = profileStore.getState();

      setError("Test error");
      setError(null);
      expect(profileStore.getState().error).toBeNull();
    });
  });

  describe("computed getters", () => {
    it("should correctly identify if user is authenticated", () => {
      const { setProfile, isAuthenticated } = profileStore.getState();

      expect(isAuthenticated()).toBe(false);

      setProfile(mockProfile);
      expect(isAuthenticated()).toBe(true);
    });

    it("should correctly identify admin users", () => {
      const { setProfile, isAdmin } = profileStore.getState();

      expect(isAdmin()).toBe(false);

      setProfile(mockProfile);
      expect(isAdmin()).toBe(false);

      setProfile({ ...mockProfile, role: "admin" });
      expect(isAdmin()).toBe(true);
    });

    it("should correctly identify dev users", () => {
      const { setProfile, isDev } = profileStore.getState();

      expect(isDev()).toBe(false);

      setProfile(mockProfile);
      expect(isDev()).toBe(false);

      setProfile({ ...mockProfile, role: "dev" });
      expect(isDev()).toBe(true);
    });

    it("should return display name correctly", () => {
      const { setProfile, getDisplayName } = profileStore.getState();

      expect(getDisplayName()).toBe("");

      setProfile(mockProfile);
      expect(getDisplayName()).toBe("John Doe");

      setProfile({ ...mockProfile, firstName: null, lastName: null });
      expect(getDisplayName()).toBe("test@example.com");

      setProfile({ ...mockProfile, firstName: "Jane", lastName: null });
      expect(getDisplayName()).toBe("Jane");
    });

    it("should return initials correctly", () => {
      const { setProfile, getInitials } = profileStore.getState();

      expect(getInitials()).toBe("");

      setProfile(mockProfile);
      expect(getInitials()).toBe("JD");

      setProfile({ ...mockProfile, firstName: null, lastName: null });
      expect(getInitials()).toBe("T");

      setProfile({ ...mockProfile, firstName: "Alice", lastName: null });
      expect(getInitials()).toBe("A");
    });
  });

  describe("hasPermission", () => {
    it("should check permissions based on role", () => {
      const { setProfile, hasPermission } = profileStore.getState();

      // No profile
      expect(hasPermission("users:read")).toBe(false);

      // User role
      setProfile({ ...mockProfile, role: "user" });
      expect(hasPermission("profile:read")).toBe(true);
      expect(hasPermission("admin:read")).toBe(false);

      // Admin role
      setProfile({ ...mockProfile, role: "admin" });
      expect(hasPermission("admin:read")).toBe(true);
      expect(hasPermission("dev:read")).toBe(false);

      // Dev role
      setProfile({ ...mockProfile, role: "dev" });
      expect(hasPermission("dev:read")).toBe(true);
      expect(hasPermission("admin:read")).toBe(true); // Dev has all permissions
    });
  });

  describe("subscription methods", () => {
    it("should toggle newsletter subscription", () => {
      const { setProfile, toggleNewsletterSubscription } = profileStore.getState();

      setProfile(mockProfile);

      toggleNewsletterSubscription();
      expect(profileStore.getState().profile?.isNewsletterSubscribed).toBe(false);

      toggleNewsletterSubscription();
      expect(profileStore.getState().profile?.isNewsletterSubscribed).toBe(true);
    });

    it("should not toggle if profile is null", () => {
      const { toggleNewsletterSubscription } = profileStore.getState();

      toggleNewsletterSubscription();
      expect(profileStore.getState().profile).toBeNull();
    });
  });

  describe("verification status", () => {
    it("should set email verification status", () => {
      const { setProfile, setEmailVerified } = profileStore.getState();

      setProfile({ ...mockProfile, emailVerified: false });

      setEmailVerified(true);
      expect(profileStore.getState().profile?.emailVerified).toBe(true);
    });

    it("should set phone verification status", () => {
      const { setProfile, setPhoneVerified } = profileStore.getState();

      setProfile({ ...mockProfile, phoneVerified: false });

      setPhoneVerified(true);
      expect(profileStore.getState().profile?.phoneVerified).toBe(true);
    });
  });

  describe("persistence", () => {
    it("should maintain state across operations", () => {
      const { setProfile, updateProfile, setLoading, setError } = profileStore.getState();

      setProfile(mockProfile);
      setLoading(true);
      setError("Test error");
      updateProfile({ firstName: "Updated" });

      const state = profileStore.getState();
      expect(state.profile?.firstName).toBe("Updated");
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe("Test error");
    });
  });
});
