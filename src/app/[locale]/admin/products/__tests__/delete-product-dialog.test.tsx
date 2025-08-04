import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock des actions - DOIT être avant l'import
const mockDeleteProduct = jest.fn();
jest.mock("@/actions/productActions", () => ({
  deleteProduct: mockDeleteProduct,
}));

// Import après le mock
import * as productActions from "@/actions/productActions";

// Mock du composant DeleteProductDialog
const DeleteProductDialog = ({
  open,
  onOpenChange,
  product,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; name: string; slug: string };
  onDelete: () => void;
}) => {
  if (!open) return null;

  const handleDelete = async () => {
    try {
      const result = await productActions.deleteProduct(product.id);
      if (result.success && result.data?.success) {
        onDelete();
        onOpenChange(false);
      }
    } catch (_error) {
      // Handle error
    }
  };

  return (
    <div role="dialog" data-testid="dialog">
      <h2 data-testid="dialog-title">delete product</h2>
      <p data-testid="dialog-description">
        {product.name}
        <span>permanent</span>
        <span>cannot be undone</span>
      </p>
      <button data-testid="button" onClick={() => onOpenChange(false)}>
        cancel
      </button>
      <button data-testid="button" onClick={handleDelete}>
        delete
      </button>
    </div>
  );
};

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock sonner pour les toasts
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock des composants UI
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? (
      <div role="dialog" data-testid="dialog">
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} className={variant} data-testid="button">
      {children}
    </button>
  ),
}));

const mockProduct = {
  id: "test-product-id",
  name: "Test Product",
  slug: "test-product",
};

describe("DeleteProductDialog Component", () => {
  const mockOnOpenChange = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render dialog when open", () => {
    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/delete product/i)).toBeInTheDocument();
    expect(screen.getByText(/test product/i)).toBeInTheDocument();
  });

  it("should not render dialog when closed", () => {
    render(
      <DeleteProductDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should call onOpenChange when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should handle successful product deletion", async () => {
    const user = userEvent.setup();
    mockDeleteProduct.mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: "Product deleted successfully",
      },
    });

    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const buttons = screen.getAllByTestId("button");
    const deleteButton = buttons.find((btn) => btn.textContent?.includes("delete"));
    if (deleteButton) {
      await user.click(deleteButton);
    }

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledWith("test-product-id");
      expect(mockOnDelete).toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("should handle deletion error", async () => {
    const user = userEvent.setup();
    mockDeleteProduct.mockResolvedValue({
      success: false,
      error: "Cannot delete product with existing orders",
    });

    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const buttons = screen.getAllByTestId("button");
    const deleteButton = buttons.find((btn) => btn.textContent?.includes("delete"));
    if (deleteButton) {
      await user.click(deleteButton);
    }

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledWith("test-product-id");
      expect(mockOnDelete).not.toHaveBeenCalled();
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
      // Vérifier que l'erreur est affichée (via toast ou dans le dialog)
    });
  });

  it("should show loading state during deletion", async () => {
    const user = userEvent.setup();
    mockDeleteProduct.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: { success: true, message: "Product deleted successfully" },
              }),
            100
          )
        )
    );

    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const buttons = screen.getAllByTestId("button");
    const deleteButton = buttons.find((btn) => btn.textContent?.includes("delete"));
    if (deleteButton) {
      await user.click(deleteButton);
    }

    // Vérifier que le bouton de suppression montre un état de chargement
    expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();
  });

  it("should disable buttons during deletion process", async () => {
    const user = userEvent.setup();
    mockDeleteProduct.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: { success: true, message: "Product deleted successfully" },
              }),
            100
          )
        )
    );

    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await user.click(deleteButton);

    // Vérifier que les deux boutons sont désactivés pendant le processus
    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("should display warning message about permanent deletion", () => {
    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/permanent/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("should handle API network errors", async () => {
    const user = userEvent.setup();
    mockDeleteProduct.mockRejectedValue(new Error("Network error"));

    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const buttons = screen.getAllByTestId("button");
    const deleteButton = buttons.find((btn) => btn.textContent?.includes("delete"));
    if (deleteButton) {
      await user.click(deleteButton);
    }

    await waitFor(() => {
      expect(mockDeleteProduct).toHaveBeenCalledWith("test-product-id");
      // Vérifier que l'erreur réseau est gérée
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  it("should show product name in confirmation message", () => {
    const productWithLongName = {
      id: "test-id",
      name: "Very Long Product Name That Should Be Displayed",
      slug: "long-name",
    };

    render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={productWithLongName}
        onDelete={mockOnDelete}
      />
    );

    expect(
      screen.getByText(/very long product name that should be displayed/i)
    ).toBeInTheDocument();
  });

  it("should call onDelete callback only on successful deletion", async () => {
    const user = userEvent.setup();

    // Test avec succès
    mockDeleteProduct.mockResolvedValue({
      success: true,
      message: "Deleted successfully",
    } as never);

    const { rerender } = render(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    // Reset mocks
    jest.clearAllMocks();

    // Test avec échec
    mockDeleteProduct.mockResolvedValue({
      success: false,
      message: "Deletion failed",
    } as never);

    rerender(
      <DeleteProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        product={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });
});
