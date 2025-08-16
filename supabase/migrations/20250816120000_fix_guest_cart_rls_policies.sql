-- Migration pour corriger les politiques RLS des paniers invités
-- Date: 2025-08-16
-- Problème: La politique actuelle empêche la création de paniers invités (user_id = NULL)
-- Solution: Séparer les politiques pour utilisateurs authentifiés et invités

-- 1. Supprimer la politique trop restrictive actuelle
DROP POLICY IF EXISTS "Users can view and manage their own carts" ON public.carts;

-- 2. Créer des politiques séparées pour une meilleure granularité

-- Politique pour les utilisateurs authentifiés - lecture et gestion de leurs propres paniers
CREATE POLICY "Authenticated users can manage their own carts"
ON public.carts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre la création de paniers invités
CREATE POLICY "Allow guest cart creation"
ON public.carts
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL);

-- Politique pour permettre la lecture et modification des paniers invités via session
-- (pour les utilisateurs non authentifiés qui ont une session temporaire)
CREATE POLICY "Allow guest cart access"
ON public.carts
FOR SELECT, UPDATE, DELETE
TO anon, authenticated
USING (user_id IS NULL);

-- Note: La sécurité des paniers invités doit être gérée au niveau application
-- via le cookie herbis-cart-id qui contient l'ID du panier