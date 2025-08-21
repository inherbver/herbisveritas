// jest.setup.minimal.ts - Lightweight setup for faster tests
import "@testing-library/jest-dom";

// Essential polyfills only
import { TextEncoder, TextDecoder } from "util";
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Essential environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
// NODE_ENV est déjà défini par Jest à "test"

// Basic Next.js mocks only
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn((_url: string) => {
    throw new Error("NEXT_REDIRECT");
  }),
  permanentRedirect: jest.fn((_url: string) => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Basic next-intl mocks
jest.mock("next-intl/server", () => ({
  getTranslations: jest
    .fn()
    .mockImplementation(() => Promise.resolve((key: string) => key)),
}));

jest.mock("next-intl", () => ({
  useTranslations: jest.fn(() => (key: string) => key),
  useLocale: jest.fn(() => "fr"),
}));

// Console cleanup
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: An update to") ||
        args[0].includes("Warning: Each child in a list"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
