-- This migration creates the initial schema for user profiles based on the production schema.

-- Create custom type for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'editor', 'admin', 'dev');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY NOT NULL,
    first_name TEXT CHECK (char_length(first_name) < 256),
    last_name TEXT CHECK (char_length(last_name) < 256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    phone_number TEXT,
    role app_role NOT NULL DEFAULT 'user',
    newsletter_subscribed BOOLEAN DEFAULT false,
    use_shipping_for_billing BOOLEAN DEFAULT true,
    billing_address_is_different BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy for profiles: Allow users to manage their own profile
CREATE POLICY "Users can manage their own profile" ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
