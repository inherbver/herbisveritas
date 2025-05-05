// src/actions/cartActions.ts
"use server";

import { z } from "zod";

// Define a schema for input validation (good practice)
const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"), // Assuming product ID is a string
  quantity: z.number().int().positive("Quantity must be positive"),
});

interface AddToCartResult {
  success: boolean;
  message: string;
}

// Type prevState explicitly
export async function addToCart(
  prevState: AddToCartResult | null,
  formData: FormData
): Promise<AddToCartResult> {
  // Use Zod to validate FormData - Note: FormData values are strings
  const rawFormData = {
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  };

  const validatedFields = addToCartSchema.safeParse({
    productId: rawFormData.productId,
    // Convert quantity to number for validation
    quantity: rawFormData.quantity ? parseInt(String(rawFormData.quantity), 10) : undefined,
  });

  // Return early if validation fails
  if (!validatedFields.success) {
    console.error("Add to cart validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message:
        "Erreur de validation: " +
        Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", "),
    };
  }

  const { productId, quantity } = validatedFields.data;

  console.log(`Server Action: Adding to cart... Product ID: ${productId}, Quantity: ${quantity}`);

  try {
    // --- Simulate async operation (e.g., database update) ---
    await new Promise((resolve) => setTimeout(resolve, 500));
    // --------------------------------------------------------

    // TODO: Implement actual cart logic here:
    // - Get user session/cart identifier (e.g., from cookies, session)
    // - Check product availability/stock
    // - Add/update item in database or session storage
    // - Potentially revalidate cart data cache (revalidatePath/revalidateTag)

    console.log("Server Action: Product added successfully.");
    return {
      success: true,
      message: "Produit ajouté au panier !", // Use translations later
    };
  } catch (error) {
    console.error("Server Action: Error adding to cart:", error);
    return {
      success: false,
      message: "Erreur lors de l'ajout au panier.",
    };
  }
}
