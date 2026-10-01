-- Онлайн-склад для ресейла: коробки, товары и продажи

create extension if not exists "pgcrypto";

-- Профили пользователей (для будущей авторизации)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Коробки
create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  received_at date not null default current_date,
  shipping_cost numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  additional_expenses numeric(12, 2) not null default 0 check (additional_expenses >= 0),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boxes_received_at_idx on public.boxes (received_at desc);
create index if not exists boxes_created_at_idx on public.boxes (created_at desc);

-- Товары
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes (id) on delete cascade,
  name text not null,
  category text,
  size text,
  purchase_price numeric(12, 2) not null check (purchase_price >= 0),
  photo_url text,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold')),
  asking_price numeric(12, 2) check (asking_price is null or asking_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_box_id_idx on public.products (box_id);
create index if not exists products_status_idx on public.products (status);

-- Продажи (себестоимость фиксируется на момент продажи)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  sold_at date not null default current_date,
  commission numeric(12, 2) not null default 0 check (commission >= 0),
  sale_expenses numeric(12, 2) not null default 0 check (sale_expenses >= 0),
  comment text,
  frozen_purchase_price numeric(12, 2) not null,
  frozen_shipping_share numeric(12, 2) not null,
  frozen_additional_share numeric(12, 2) not null,
  frozen_unit_cost numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);

-- Автообновление updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists boxes_set_updated_at on public.boxes;
create trigger boxes_set_updated_at
  before update on public.boxes
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS: открытый доступ для простого личного склада
-- При подключении авторизации ужесточите политики
alter table public.profiles enable row level security;
alter table public.boxes enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;

drop policy if exists "profiles_all" on public.profiles;
create policy "profiles_all" on public.profiles for all using (true) with check (true);

drop policy if exists "boxes_all" on public.boxes;
create policy "boxes_all" on public.boxes for all using (true) with check (true);

drop policy if exists "products_all" on public.products;
create policy "products_all" on public.products for all using (true) with check (true);

drop policy if exists "sales_all" on public.sales;
create policy "sales_all" on public.sales for all using (true) with check (true);

-- Хранилище фото (опционально)
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists "product_photos_public_read" on storage.objects;
create policy "product_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

drop policy if exists "product_photos_public_write" on storage.objects;
create policy "product_photos_public_write"
  on storage.objects for insert
  with check (bucket_id = 'product-photos');

drop policy if exists "product_photos_public_update" on storage.objects;
create policy "product_photos_public_update"
  on storage.objects for update
  using (bucket_id = 'product-photos');

drop policy if exists "product_photos_public_delete" on storage.objects;
create policy "product_photos_public_delete"
  on storage.objects for delete
  using (bucket_id = 'product-photos');
