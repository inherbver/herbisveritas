'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/server-admin';
import { z } from 'zod';
import { checkUserPermission } from '@/lib/auth/server-auth';
import { productSchema } from '@/lib/validators/product-validator';

const deleteProductSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export async function createProduct(data: z.infer<typeof productSchema>) {
  const { isAuthorized } = await checkUserPermission('products:create');
  if (!isAuthorized) {
    return {
      success: false,
      message: 'Unauthorized: You do not have permission to create products.',
    };
  }

  const validation = productSchema.safeParse(data);

  if (!validation.success) {
    return {
      success: false,
      message: 'Invalid product data.',
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const supabase = createSupabaseAdminClient();
  // Les clés du validateur (id, stock, etc.) correspondent aux colonnes de la base de données.
  // Nous pouvons simplement séparer les traductions et passer le reste.
  const { translations, ...product_data } = validation.data;

  const { error } = await supabase.rpc('create_product_with_translations', {
    product_data: product_data, // Passer l'objet correctement structuré
    translations_data: translations,
  });

  if (error) {
    console.error('RPC create_product_with_translations error:', error);
    return {
      success: false,
      message: `Database Error: Failed to create product. Reason: ${error.message}`,
    };
  }

  revalidatePath('/admin/products');

  return {
    success: true,
    message: 'Product created successfully.',
  };
}

export async function deleteProduct(productId: string) {
    const { isAuthorized } = await checkUserPermission('products:delete');
  if (!isAuthorized) {
    return {
      success: false,
      message: 'Unauthorized: You do not have permission to delete products.',
    };
  }

  const validation = deleteProductSchema.safeParse({ id: productId });

  if (!validation.success) {
    return {
      success: false,
      message: validation.error.flatten().fieldErrors.id?.[0] || 'Validation failed.',
    };
  }

    const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from('products').delete().match({ id: validation.data.id });

  if (error) {
    console.error('Supabase delete error:', error);
    return {
      success: false,
      message: `Database Error: Failed to delete product. Reason: ${error.message}`,
    };
  }

  // Revalidate paths to ensure the UI is updated
  revalidatePath('/admin/products');
  revalidatePath('/[locale]/admin/products', 'page');

  return {
    success: true,
    message: 'Product deleted successfully.',
  };
}
