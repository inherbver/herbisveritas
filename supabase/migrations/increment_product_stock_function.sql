-- Function to safely increment product stock
CREATE OR REPLACE FUNCTION increment_product_stock(
  product_id UUID,
  quantity_to_add INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the product stock
  UPDATE products 
  SET 
    stock = stock + quantity_to_add,
    updated_at = NOW()
  WHERE id = product_id;
  
  -- Check if the product was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with ID % not found', product_id;
  END IF;
  
  -- Log the stock change for audit purposes
  INSERT INTO audit_logs (
    event_type,
    data,
    severity
  ) VALUES (
    'stock_increment',
    jsonb_build_object(
      'product_id', product_id,
      'quantity_added', quantity_to_add,
      'operation', 'order_cancellation'
    ),
    'INFO'
  );
END;
$$;