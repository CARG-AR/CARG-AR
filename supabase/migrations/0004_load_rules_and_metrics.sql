create table if not exists public.load_rules (
  id uuid primary key default gen_random_uuid(),
  group_code text not null check (group_code in ('small', 'medium', 'large')),
  code text not null,
  label text not null,
  weight_min_kg numeric,
  weight_max_kg numeric,
  dimension_min_cm numeric,
  dimension_max_cm numeric,
  requires_declared_value boolean not null default false,
  tariff_0_30 numeric,
  tariff_30_100 numeric,
  tariff_100_250 numeric,
  commission_pct numeric not null,
  manual boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_code, code)
);

alter table public.shipments add column if not exists load_group text check (load_group in ('small', 'medium', 'large'));
alter table public.shipments add column if not exists load_option text;
alter table public.shipments add column if not exists pricing_mode text check (pricing_mode in ('automatic', 'manual'));
alter table public.shipments add column if not exists length_cm numeric;
alter table public.shipments add column if not exists width_cm numeric;
alter table public.shipments add column if not exists height_cm numeric;
alter table public.shipments add column if not exists declared_value numeric;
alter table public.shipments add column if not exists distance_km numeric;
alter table public.shipments add column if not exists pricing_rule_id uuid references public.load_rules(id) on delete set null;

alter table public.load_rules enable row level security;
create policy "load rules readable" on public.load_rules for select to authenticated using (active or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "load rules admin insert" on public.load_rules for insert to authenticated with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "load rules admin update" on public.load_rules for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

insert into public.load_rules (group_code, code, label, weight_min_kg, weight_max_kg, dimension_min_cm, dimension_max_cm, requires_declared_value, tariff_0_30, tariff_30_100, tariff_100_250, commission_pct, manual, sort_order)
values
  ('small', 'sobre', 'Sobre', 0, 1, 0, 30, false, 18000, 20000, 25000, 6, false, 1),
  ('small', 'bulto_1', 'Bulto 1', 1, 25, 30, 32, true, 20000, 23000, 30000, 6, false, 2),
  ('small', 'bulto_2', 'Bulto 2', 25, 50, 30, 50, true, 22000, 25000, 32000, 6, false, 3),
  ('small', 'manual', 'Bulto manual', null, null, null, null, true, null, null, null, 7, true, 4),
  ('medium', 'pallet', 'Pallets, peso y medidas', null, null, 100, 120, true, 75000, 120000, 150000, 9, false, 1),
  ('medium', 'manual', 'Carga manual', null, null, null, null, true, null, null, null, 11, true, 2),
  ('large', 'manual', 'Descripción por el cliente', null, null, null, null, true, null, null, null, 9, true, 1)
on conflict (group_code, code) do update set
  label = excluded.label,
  weight_min_kg = excluded.weight_min_kg,
  weight_max_kg = excluded.weight_max_kg,
  dimension_min_cm = excluded.dimension_min_cm,
  dimension_max_cm = excluded.dimension_max_cm,
  requires_declared_value = excluded.requires_declared_value,
  tariff_0_30 = excluded.tariff_0_30,
  tariff_30_100 = excluded.tariff_30_100,
  tariff_100_250 = excluded.tariff_100_250,
  commission_pct = excluded.commission_pct,
  manual = excluded.manual,
  sort_order = excluded.sort_order,
  updated_at = now();