create or replace function set_default_address(
  address_id_to_set uuid,
  auth_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_address_type public.address_type;
begin
  -- First, get the address type for the given address ID
  select address_type into v_address_type
  from public.addresses
  where id = address_id_to_set and user_id = auth_user_id;

  -- If the address is not found or doesn't belong to the user, raise an exception
  if not found then
    raise exception 'Permission denied or address not found';
  end if;

  -- Atomically update the addresses:
  -- 1. Set is_default to false for all addresses of the same type for the user
  update public.addresses
  set is_default = false
  where user_id = auth_user_id and address_type = v_address_type;

  -- 2. Set the specified address as the default
  update public.addresses
  set is_default = true
  where id = address_id_to_set and user_id = auth_user_id;

end;
$$;
