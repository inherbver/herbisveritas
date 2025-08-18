-- Migration pour ajouter la colonne is_available à la table products
-- Cette colonne indique si un produit est disponible à la vente

ALTER TABLE public.products 
ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT true;

-- Commentaire sur la colonne
COMMENT ON COLUMN public.products.is_available IS 'Indique si le produit est disponible à la vente';

-- Optionnel: mettre à jour les produits existants basé sur le status
UPDATE public.products 
SET is_available = CASE 
    WHEN status = 'published' THEN true
    ELSE false
END;