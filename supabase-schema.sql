create extension if not exists pgcrypto;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  clinic_name text not null,
  owner_name text,
  email text not null unique,
  phone text,
  password text not null,
  plan text default 'pro',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.clinic_content (
  id uuid primary key default gen_random_uuid(),
  clinic_slug text not null unique references public.clinics(slug) on update cascade on delete cascade,
  items jsonb not null default '[]'::jsonb,
  tv_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

 drop trigger if exists trg_clinics_updated_at on public.clinics;
 create trigger trg_clinics_updated_at
 before update on public.clinics
 for each row execute function public.set_updated_at();

 drop trigger if exists trg_clinic_content_updated_at on public.clinic_content;
 create trigger trg_clinic_content_updated_at
 before update on public.clinic_content
 for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.clinic_content;

alter table public.clinics enable row level security;
alter table public.clinic_content enable row level security;

create policy "clinics_select_public"
on public.clinics
for select
using (true);

create policy "clinics_insert_public"
on public.clinics
for insert
with check (true);

create policy "clinics_update_public"
on public.clinics
for update
using (true)
with check (true);

create policy "clinic_content_select_public"
on public.clinic_content
for select
using (true);

create policy "clinic_content_insert_public"
on public.clinic_content
for insert
with check (true);

create policy "clinic_content_update_public"
on public.clinic_content
for update
using (true)
with check (true);
