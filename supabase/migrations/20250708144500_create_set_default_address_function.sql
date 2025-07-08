-- Function to set a specific address as the default for its type (shipping or billing)
-- and ensure no other address of the same type is also the default.
create or replace function set_default_address(address_id_to_set uuid, auth_user_id uuid)
returns void
language plpgsql
security definer -- Important: Allows the function to modify data with the permissions of the function owner
as $$
declare
  type_of_address_to_set address_type;
begin
  -- First, get the address_type of the address we want to set as default.
  -- This also implicitly checks if the address belongs to the calling user.
  select address_type into type_of_address_to_set
  from public.addresses
  where id = address_id_to_set and user_id = auth_user_id;

  -- If the address doesn't exist or doesn't belong to the user, `type_of_address_to_set` will be NULL.
  if type_of_address_to_set is null then
    raise exception 'Address not found or permission denied';
  end if;

  -- Use a transaction block to ensure atomicity
  begin
    -- Set is_default to false for all other addresses of the same user and same type.
    update public.addresses
    set is_default = false
    where user_id = auth_user_id and address_type = type_of_address_to_set;

    -- Set the specified address as the default.
    update public.addresses
    set is_default = true
    where id = address_id_to_set and user_id = auth_user_id;
  end;
end;
$$;
