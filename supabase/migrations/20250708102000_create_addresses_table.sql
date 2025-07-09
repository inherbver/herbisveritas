create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  address_type address_type not null,
  is_default boolean not null default false,
  first_name text not null,
  last_name text not null,
  email text,
  company_name text,
  address_line1 text not null,
  address_line2 text,
  postal_code text not null,
  city text not null,
  country_code varchar(2) not null,
  state_province_region text,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "Allow full access to own addresses" on public.addresses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
