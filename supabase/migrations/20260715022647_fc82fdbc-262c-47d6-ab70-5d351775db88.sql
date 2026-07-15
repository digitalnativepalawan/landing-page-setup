ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS website_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_description text NOT NULL DEFAULT '';