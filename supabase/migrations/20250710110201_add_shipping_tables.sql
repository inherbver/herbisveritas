-- 1. Create the shipping_methods table
CREATE TABLE public.shipping_methods (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    carrier TEXT NOT NULL CHECK (carrier <> ''),
    name TEXT NOT NULL CHECK (name <> ''),
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments to the new table and columns
COMMENT ON TABLE public.shipping_methods IS 'Stores available shipping methods and their prices.';
COMMENT ON COLUMN public.shipping_methods.carrier IS 'The shipping carrier, e.g., ''Colissimo'', ''Chronopost''.';
COMMENT ON COLUMN public.shipping_methods.name IS 'The specific service name, e.g., ''Domicile - Sans signature''.';
COMMENT ON COLUMN public.shipping_methods.price IS 'The cost of the shipping method.';
COMMENT ON COLUMN public.shipping_methods.is_active IS 'Indicates if the shipping method is currently available for selection.';

-- Enable RLS
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active shipping methods
CREATE POLICY "Allow public read access to active shipping methods" 
ON public.shipping_methods FOR SELECT 
USING (is_active = true);

-- 2. Update the orders table
ALTER TABLE public.orders
ADD COLUMN shipping_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
ADD COLUMN shipping_method_id UUID REFERENCES public.shipping_methods(id) ON DELETE SET NULL,
ADD COLUMN shipping_amount NUMERIC(10, 2);

-- Add comments to the new columns in the orders table
COMMENT ON COLUMN public.orders.shipping_address_id IS 'Reference to the address used for shipping.';
COMMENT ON COLUMN public.orders.shipping_method_id IS 'Reference to the shipping method selected for the order.';
COMMENT ON COLUMN public.orders.shipping_amount IS 'The cost of shipping at the time of purchase.';

-- 3. Seed initial shipping methods
INSERT INTO public.shipping_methods (carrier, name, description, price, is_active)
VALUES
    ('Colissimo', 'Domicile - Sans signature', 'Livraison à domicile standard sans signature.', 5.95, true),
    ('Colissimo', 'Point Retrait', 'Livraison en point de retrait (bureau de poste, relais Pickup).', 4.50, true),
    ('Chronopost', 'Express 24h', 'Livraison express le lendemain avant 13h.', 12.50, true);

-- 4. Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_shipping_methods_updated_at
BEFORE UPDATE ON public.shipping_methods
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
