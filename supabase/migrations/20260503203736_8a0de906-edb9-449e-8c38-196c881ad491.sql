ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS years_of_service text,
  ADD COLUMN IF NOT EXISTS target_role_seeking text;