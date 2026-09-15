-- Categorías de transportista y vencimiento de carnet por vehículo
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS license_expiry date;
