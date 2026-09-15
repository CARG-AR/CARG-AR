-- Update schema for Argentina provinces/localities + username alias
alter table public.profiles add column if not exists username text unique;

-- helper to make alias unique (called from app, uniqueness guaranteed by constraint)
alter table public.profiles add constraint profiles_username_unique unique (username);

-- add columns to track province/locality/direction details per shipment
alter table public.shipments add column if not exists origin_province text not null default '';
alter table public.shipments add column if not exists origin_locality text not null default '';
alter table public.shipments add column if not exists origin_address text not null default '';
alter table public.shipments add column if not exists destination_province text not null default '';
alter table public.shipments add column if not exists destination_locality text not null default '';
alter table public.shipments add column if not exists destination_address text not null default '';

-- policy: username can be updated by owner

-- Create materialized data table for provinces (24 jurisdictions)
create table if not exists public.provinces (
  id text primary key,
  name text not null
);
insert into public.provinces (id, name) values
('02','Ciudad Autónoma de Buenos Aires'),
('06','Buenos Aires'),
('10','Catamarca'),
('14','Córdoba'),
('18','Corrientes'),
('22','Chaco'),
('26','Chubut'),
('30','Entre Ríos'),
('34','Formosa'),
('38','Jujuy'),
('42','La Pampa'),
('46','La Rioja'),
('50','Mendoza'),
('54','Misiones'),
('58','Neuquén'),
('62','Río Negro'),
('66','Salta'),
('70','San Juan'),
('74','San Luis'),
('78','Santa Cruz'),
('82','Santa Fe'),
('86','Santiago del Estero'),
('90','Tucumán'),
('94','Tierra del Fuego')
on conflict (id) do nothing;

create policy "provinces readable" on public.provinces for select to authenticated using (true);

-- For localities we use the public Georef API (datos.gob.ar) from the frontend, not DB.
