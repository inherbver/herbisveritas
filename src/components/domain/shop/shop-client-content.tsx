"use client";

import React from 'react';
import { ProductGrid, ProductData } from './product-grid';
// Assuming the Product interface is exported from the page or a types file
// Adjust the import path if Product interface is defined elsewhere
import { Product } from '@/app/[locale]/shop/page'; 
// import { useRouter } from 'next/navigation'; // Needed for actual navigation in handleViewDetails

type ShopClientContentProps = {
  initialProducts: Product[]; // Receive raw products
};

export const ShopClientContent: React.FC<ShopClientContentProps> = ({ initialProducts }) => {
  // const router = useRouter(); // Uncomment for navigation

  // --- Data Transformation --- 
  const productGridData: ProductData[] = initialProducts.map((product) => {
    // Ensure imageSrc points to the existing .webp files
    const imageBaseUrl = product.image_url?.replace(/\.[^/.]+$/, "") ?? ''; // Remove original extension
    const imageSrc = imageBaseUrl ? `${imageBaseUrl}.webp` : ''; // Add .webp extension

    return {
      id: product.id,
      title: product.name,
      imageSrc: imageSrc, // Use the corrected .webp path
      imageAlt: product.name ?? 'Product image',
      price: `${product.price.toFixed(2)} ${product.currency ?? 'EUR'}`, 
    };
  });

  // --- Handlers defined in the Client Component ---
  const handleAddToCart = (productId: string | number) => {
    console.log(`Adding product ${productId} to cart (Client Handler).`);
    // TODO: Implement actual cart logic (e.g., using Zustand, Context, or Server Actions)
  };

  const handleViewDetails = (productId: string | number) => {
    console.log(`Viewing details for product ${productId} (Client Handler).`);
    // TODO: Implement actual navigation
    // Example: router.push(`/shop/${productId}`); // Adjust locale handling as needed
  };

  // You might want to handle loading/empty states here as well, 
  // or pass them down from the server component if preferred.
  if (!productGridData || productGridData.length === 0) {
     // You might want a shared translation hook/provider for client components
    return <p className="text-center mt-10">No products found.</p>; 
  }

  return (
    <ProductGrid 
      products={productGridData} 
      onAddToCart={handleAddToCart}
      onViewDetails={handleViewDetails} 
      // Pass other necessary props like isLoading if managed here
    />
  );
};
