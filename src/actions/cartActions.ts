// src/actions/cartActions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache"; // Import revalidatePath

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
    // Format Zod errors into a single message string
    const errorMessage = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(", ");
    return {
      success: false,
      message: `Erreur de validation: ${errorMessage}`,
    };
  }

  const { productId, quantity: _quantity } = validatedFields.data;

  try {
    // --- Simulate adding to cart logic (Replace with your actual logic) ---
    // Example: Simulate an API call or database update
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

    // Simulate success
    const success = true;

    if (success) {
      revalidatePath("/[locale]/shop", "layout"); // Revalidate shop page
      revalidatePath(`/[locale]/products/${productId}`); // Revalidate product detail page
      return { success: true, message: "Produit ajouté au panier!" };
    } else {
      return { success: false, message: "Échec de l'ajout au panier (simulation)." };
    }
  } catch (error) {
    console.error("Server Action: Error adding to cart:", error);
    return { success: false, message: "Une erreur s'est produite." };
  }
}
