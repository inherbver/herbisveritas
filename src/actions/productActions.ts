'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/server-admin';
import { z } from 'zod';
import { checkUserPermission } from '@/lib/auth/server-auth';

const deleteProductSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

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
