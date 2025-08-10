import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

// Mock messages for testing
const messages = {
  Global: {
    Cart: {
      addToCart: "Add to cart",
      removeFromCart: "Remove from cart",
      cartEmpty: "Your cart is empty",
      total: "Total",
      checkout: "Checkout",
    },
  },
  CartSheet: {
    yourCartTitle: "Your Cart",
    cartDescription: "Review your items",
  },
  Auth: {
    login: "Login",
    logout: "Logout",
    register: "Register",
  },
};

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
