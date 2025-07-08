create table public.audit_logs (
  id uuid not null default gen_random_uuid (),
  event_type text not null,
  user_id uuid null,
  data jsonb null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_user_id on public.audit_logs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_created_at on public.audit_logs using btree (created_at) TABLESPACE pg_default;
