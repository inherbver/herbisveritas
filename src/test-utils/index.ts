/**
 * Point d'entrée principal pour tous les utilitaires de test
 * Exporte tous les helpers, factories, et providers nécessaires
 */

// Factories
export { UserFactory } from "./factories/UserFactory";
export { ProductFactory } from "./factories/ProductFactory";
export { CartFactory } from "./factories/CartFactory";

// Test providers et rendu
export { TestProviders, TestContextFactory } from "./TestProviders";
export {
  renderWithProviders,
  renderServerComponent,
  setupIntegrationTest,
  testHelpers,
} from "./render";

// Re-export userEvent from @testing-library/user-event
import userEvent from "@testing-library/user-event";
export { userEvent };

// Mocks Supabase
export {
  createMockSupabaseClient,
  createErrorMockSupabaseClient,
  supabaseTestScenarios,
} from "./supabaseMocks";

// Helper Supabase amélioré
export {
  createMockSupabaseClient as createMockSupabaseClientV2,
  createMockSupabaseChain,
  setupSupabaseMocks,
  resetSupabaseMocks,
  createPaginatedResponse,
  createSupabaseError,
} from "./supabase-mock-helper";

// Utilitaires existants
export * from "./formDataHelpers";
export * from "./server-action-helpers";
export * from "./fast-mocks";
export * from "./cleanup-helpers";

// Types TypeScript pour les tests
export type { UserWithProfile } from "./factories/UserFactory";
export type {
  MockProduct,
  ProductWithVariants,
} from "./factories/ProductFactory";
export type { CartWithItems, MockCartItem } from "./factories/CartFactory";
export type { ProfileData } from "@/types/profile";

/**
 * Configuration de test par défaut pour des tests reproductibles
 */
export async function setupTestEnvironment() {
  // Import des factories à l'intérieur de la fonction pour éviter les références circulaires
  const { UserFactory } = await import("./factories/UserFactory");
  const { ProductFactory } = await import("./factories/ProductFactory");
  const { CartFactory } = await import("./factories/CartFactory");

  // Reset des compteurs des factories
  UserFactory.resetCounter();
  ProductFactory.resetCounters();
  CartFactory.resetCounters();

  // Configuration des mocks globaux si nécessaire
  jest.clearAllMocks();

  // Configuration de la date mockée pour reproductibilité
  jest.useFakeTimers().setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

  return {
    cleanup: () => {
      jest.useRealTimers();
      jest.clearAllMocks();
    },
  };
}

/**
 * Helpers pour assertions communes dans les tests
 */
export const assertions = {
  /**
   * Vérifie qu'un élément est visible avec le bon texte
   */
  expectVisibleText: (element: HTMLElement, text: string) => {
    expect(element).toBeVisible();
    expect(element).toHaveTextContent(text);
  },

  /**
   * Vérifie qu'un formulaire est valide
   */
  expectValidForm: (form: HTMLFormElement) => {
    expect(form).toBeValid();
    const submitButton = form.querySelector('button[type="submit"]');
    expect(submitButton).not.toBeDisabled();
  },

  /**
   * Vérifie qu'un champ a une erreur
   */
  expectFieldError: (field: HTMLElement, errorMessage?: string) => {
    expect(field).toBeInvalid();
    if (errorMessage) {
      const errorElement = field.parentElement?.querySelector('[role="alert"]');
      expect(errorElement).toHaveTextContent(errorMessage);
    }
  },

  /**
   * Vérifie qu'un élément de liste contient les bons items
   */
  expectListItems: (list: HTMLElement, expectedCount: number) => {
    const items = list.querySelectorAll('[role="listitem"], li');
    expect(items).toHaveLength(expectedCount);
  },

  /**
   * Vérifie l'état de chargement
   */
  expectLoadingState: (container: HTMLElement) => {
    expect(container).toHaveTextContent(/chargement|loading/i);
  },

  /**
   * Vérifie l'état d'erreur
   */
  expectErrorState: (container: HTMLElement, errorMessage?: string) => {
    expect(container).toHaveTextContent(/erreur|error/i);
    if (errorMessage) {
      expect(container).toHaveTextContent(errorMessage);
    }
  },
};

/**
 * Utilitaires pour simuler des interactions utilisateur complexes
 */
export const interactions = {
  /**
   * Simule un flow de login complet
   */
  async loginUser(
    user: ReturnType<typeof userEvent.setup>,
    email: string,
    password: string,
  ) {
    const emailField = document.querySelector(
      'input[type="email"]',
    ) as HTMLInputElement;
    const passwordField = document.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    const submitButton = document.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    if (emailField && passwordField) {
      await user.clear(emailField);
      await user.type(emailField, email);
      await user.clear(passwordField);
      await user.type(passwordField, password);
    }
    if (submitButton) {
      await user.click(submitButton);
    }
  },

  /**
   * Simule l'ajout d'un produit au panier
   */
  async addToCart(
    user: ReturnType<typeof userEvent.setup>,
    productId?: string,
  ) {
    const addButton = document.querySelector(
      productId
        ? `[data-product-id="${productId}"] button, button[data-product-id="${productId}"]`
        : 'button:has-text("Ajouter au panier"), button[aria-label*="Ajouter"]',
    ) as HTMLButtonElement;

    if (addButton) {
      await user.click(addButton);
    }
  },

  /**
   * Simule la modification de quantité dans le panier
   */
  async updateCartQuantity(
    user: ReturnType<typeof userEvent.setup>,
    itemId: string,
    quantity: number,
  ) {
    const quantityInput = document.querySelector(
      `[data-item-id="${itemId}"] input[type="number"], input[data-item-id="${itemId}"]`,
    ) as HTMLInputElement;

    if (quantityInput) {
      await user.clear(quantityInput);
      await user.type(quantityInput, quantity.toString());
    }
  },

  /**
   * Simule la navigation vers une page
   */
  async navigateToPage(
    user: ReturnType<typeof userEvent.setup>,
    linkText: string,
  ) {
    const link = document.querySelector(
      `a:has-text("${linkText}"), a[aria-label="${linkText}"]`,
    ) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    await user.click(link);
  },
};
