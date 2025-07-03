import { getActiveUserId } from "./authUtils";
import type { SupabaseClient, User } from "@supabase/supabase-js";

// Mock de l'utilisateur Supabase
const mockUser: User = {
  id: "user-123",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

const mockAnonUser: User = {
  id: "anon-456",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

// Factory pour créer un mock du client Supabase
const createMockSupabaseClient = (config: {
  getUserResponse?: { data: { user: User | null }; error: { message: string } | null };
  signInAnonResponse?: { data: { user: User | null }; error: { message: string } | null };
}) => {
  const { getUserResponse, signInAnonResponse } = config;

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue(getUserResponse),
      signInAnonymously: jest.fn().mockResolvedValue(signInAnonResponse),
    },
  } as unknown as SupabaseClient;
};

describe("getActiveUserId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for cleaner test output
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return the user ID if a user is already authenticated", async () => {
    const supabase = createMockSupabaseClient({
      getUserResponse: { data: { user: mockUser }, error: null },
    });

    const userId = await getActiveUserId(supabase);

    expect(userId).toBe(mockUser.id);
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("should perform anonymous sign-in and return the new user ID if no user is authenticated", async () => {
    const supabase = createMockSupabaseClient({
      getUserResponse: { data: { user: null }, error: null },
      signInAnonResponse: { data: { user: mockAnonUser }, error: null },
    });

    const userId = await getActiveUserId(supabase);

    expect(userId).toBe(mockAnonUser.id);
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("should return null if anonymous sign-in fails", async () => {
    const supabase = createMockSupabaseClient({
      getUserResponse: { data: { user: null }, error: null },
      signInAnonResponse: { data: { user: null }, error: { message: "Anon sign-in failed" } },
    });

    const userId = await getActiveUserId(supabase);

    expect(userId).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Erreur lors de la connexion anonyme:",
      "Anon sign-in failed"
    );
  });

  it("should attempt anonymous sign-in even if getUser fails", async () => {
    const supabase = createMockSupabaseClient({
      getUserResponse: { data: { user: null }, error: { message: "Get user failed" } },
      signInAnonResponse: { data: { user: mockAnonUser }, error: null },
    });

    const userId = await getActiveUserId(supabase);

    expect(userId).toBe(mockAnonUser.id);
    expect(console.error).toHaveBeenCalledWith(
      "Erreur lors de la récupération de l'utilisateur:",
      "Get user failed"
    );
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("should return null if both getUser and anonymous sign-in fail", async () => {
    const supabase = createMockSupabaseClient({
      getUserResponse: { data: { user: null }, error: { message: "Get user failed" } },
      signInAnonResponse: { data: { user: null }, error: { message: "Anon sign-in failed" } },
    });

    const userId = await getActiveUserId(supabase);

    expect(userId).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      "Erreur lors de la récupération de l'utilisateur:",
      "Get user failed"
    );
    expect(console.error).toHaveBeenCalledWith(
      "Erreur lors de la connexion anonyme:",
      "Anon sign-in failed"
    );
  });
});
