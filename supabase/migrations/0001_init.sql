-- CARG-AR MVP schema
create type public.carrier_status as enum ('pending','in_review','verified','rejected');
create type public.shipment_category as enum ('paqueteria','pallets','maquinaria');
create type public.shipment_status as enum ('published','awarded','paid','in_transit','delivered','released','disputed','cancelled','expired');
create type public.bid_status as enum ('active','accepted','rejected','withdrawn');
create type public.tx_status as enum ('pending','held','released','refunded','failed');
create type public.dispute_status as enum ('open','resolved_release','resolved_refund');
create type public.report_status as enum ('open','resolved','dismissed');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  dni text not null default '',
  is_carrier boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.carrier_profiles (
  user_id uuid primary key references public.profiles on delete cascade,
  status public.carrier_status not null default 'pending',
  rubro text not null default '',
  mp_connected boolean not null default false,
  mp_user_id text,
  declared_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.profiles on delete cascade,
  type text not null,
  plate text not null,
  insurance text not null default '',
  insurance_expiry date,
  vtv_expiry date,
  permit text not null default '',
  license text not null default '',
  photos jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  dispatcher_id uuid not null references public.profiles,
  receiver_id uuid references public.profiles,
  category public.shipment_category not null,
  title text not null,
  description text not null default '',
  weight_kg numeric,
  volume_m3 numeric,
  photos jsonb not null default '[]',
  origin jsonb not null,
  destination jsonb not null,
  origin_exact text not null default '',
  destination_exact text not null default '',
  vehicle_required text not null default '',
  start_price numeric not null check (start_price > 0),
  suggested_price numeric,
  commission_pct numeric not null,
  status public.shipment_status not null default 'published',
  auction_ends_at timestamptz not null,
  awarded_bid_id uuid,
  awarded_carrier_id uuid references public.profiles,
  total_value numeric,
  cash_advance numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments on delete cascade,
  carrier_id uuid not null references public.profiles,
  amount numeric not null check (amount > 0),
  message text not null default '',
  status public.bid_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (shipment_id, carrier_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments,
  payment_id text not null,
  amount_total numeric not null,
  commission_amount numeric not null,
  carrier_net numeric not null,
  status public.tx_status not null default 'pending',
  mode text not null default 'demo',
  mp_raw jsonb,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments,
  origin_photo text,
  arrival_photos jsonb not null default '[]',
  receiver_dni text not null default '',
  coords jsonb,
  declared_at timestamptz,
  auto_release_at timestamptz
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments on delete cascade,
  reviewer_id uuid not null references public.profiles,
  reviewer_role text not null,
  reviewee_id uuid not null references public.profiles,
  reviewee_role text not null,
  stars int not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (shipment_id, reviewer_id, reviewee_id)
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments on delete cascade,
  opened_by uuid not null references public.profiles,
  reason text not null,
  status public.dispute_status not null default 'open',
  resolution_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments on delete set null,
  reported_user_id uuid not null references public.profiles,
  reporter_id uuid not null references public.profiles,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- auto profile on signup
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- reputation view
create view public.v_reputation as
select p.id,
  coalesce(round(avg(r.stars)::numeric, 2), 0) as rating_avg,
  count(r.id) as rating_count,
  (select count(*) from public.shipments s where s.awarded_carrier_id = p.id and s.status = 'released') as trips_completed
from public.profiles p
left join public.reviews r on r.reviewee_id = p.id
group by p.id;

-- settings defaults (commissions + reference tariffs per category, ARS)
insert into public.settings (data) values ('{
  "currency": "ARS",
  "categories": {
    "paqueteria": { "label": "Paquetería (sobre/bulto)", "commission_pct": 5, "tariff_per_km": 45, "vehicle_required": "moto_o_utilitario" },
    "pallets": { "label": "Pallets", "commission_pct": 7, "tariff_per_km": 110, "vehicle_required": "camioneta_o_camion" },
    "maquinaria": { "label": "Maquinaria y vehículos", "commission_pct": 12, "tariff_per_km": 260, "vehicle_required": "camion_grande" }
  },
  "release_hours": 48,
  "auction_minutes": 120
}'::jsonb);

alter table public.profiles enable row level security;
alter table public.carrier_profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.settings enable row level security;
alter table public.shipments enable row level security;
alter table public.bids enable row level security;
alter table public.transactions enable row level security;
alter table public.deliveries enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid() or is_admin);
-- carrier_profiles
create policy "carrier readable" on public.carrier_profiles for select to authenticated using (true);
create policy "insert own carrier" on public.carrier_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "update own carrier" on public.carrier_profiles for update to authenticated using (user_id = auth.uid());
-- vehicles
create policy "vehicles readable" on public.vehicles for select to authenticated using (true);
create policy "insert own vehicle" on public.vehicles for insert to authenticated with check (carrier_id = auth.uid());
create policy "update own vehicle" on public.vehicles for update to authenticated using (carrier_id = auth.uid());
-- settings
create policy "settings readable" on public.settings for select to authenticated using (true);
-- shipments
create policy "shipments readable" on public.shipments for select to authenticated using (true);
create policy "insert own shipment" on public.shipments for insert to authenticated with check (dispatcher_id = auth.uid());
create policy "update own shipment" on public.shipments for update to authenticated
  using (dispatcher_id = auth.uid() or awarded_carrier_id = auth.uid() or exists (select 1 from public.profiles where profiles.id = auth.uid() and is_admin));
-- bids
create policy "bids readable" on public.bids for select to authenticated using (true);
create policy "insert own bid" on public.bids for insert to authenticated with check (carrier_id = auth.uid());
create policy "update own bid" on public.bids for update to authenticated using (carrier_id = auth.uid());
-- transactions (demo mode: dispatcher manages own escrow; live mode moves to server)
create policy "tx participants" on public.transactions for select to authenticated
  using (exists (select 1 from public.shipments s where s.id = shipment_id and (s.dispatcher_id = auth.uid() or s.awarded_carrier_id = auth.uid() or s.dispatcher_id in (select id from public.profiles where is_admin))));
create policy "tx insert dispatcher" on public.transactions for insert to authenticated
  with check (exists (select 1 from public.shipments s where s.id = shipment_id and s.dispatcher_id = auth.uid()));
create policy "tx update dispatcher" on public.transactions for update to authenticated
  using (exists (select 1 from public.shipments s where s.id = shipment_id and s.dispatcher_id = auth.uid()));
-- deliveries
create policy "delivery participants" on public.deliveries for select to authenticated
  using (exists (select 1 from public.shipments s where s.id = shipment_id and (s.dispatcher_id = auth.uid() or s.awarded_carrier_id = auth.uid() or s.receiver_id = auth.uid())));
create policy "delivery insert carrier" on public.deliveries for insert to authenticated
  with check (exists (select 1 from public.shipments s where s.id = shipment_id and s.awarded_carrier_id = auth.uid()));
create policy "delivery update carrier" on public.deliveries for update to authenticated
  using (exists (select 1 from public.shipments s where s.id = shipment_id and s.awarded_carrier_id = auth.uid()));
-- reviews
create policy "reviews readable" on public.reviews for select to authenticated using (true);
create policy "insert own review" on public.reviews for insert to authenticated with check (reviewer_id = auth.uid());
-- disputes
create policy "disputes readable" on public.disputes for select to authenticated using (true);
create policy "insert dispute" on public.disputes for insert to authenticated with check (opened_by = auth.uid());
create policy "resolve dispute admin" on public.disputes for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
-- reports
create policy "reports admin or own" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "insert report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "resolve report admin" on public.reports for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- storage buckets
insert into storage.buckets (id, name, public) values ('shipment-photos','shipment-photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('vehicle-docs','vehicle-docs', false) on conflict do nothing;

create policy "upload shipment photos" on storage.objects for insert to authenticated with check (bucket_id = 'shipment-photos');
create policy "read shipment photos" on storage.objects for select to authenticated using (bucket_id = 'shipment-photos');
create policy "upload vehicle docs" on storage.objects for insert to authenticated with check (bucket_id = 'vehicle-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read vehicle docs" on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-docs' and ((storage.foldername(name))[1] = auth.uid()::text or exists (select 1 from public.profiles where id = auth.uid() and is_admin)));
