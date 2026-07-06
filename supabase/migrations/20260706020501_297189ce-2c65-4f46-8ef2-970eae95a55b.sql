
CREATE TABLE public.repositories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL,
  website_url TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  license_type TEXT NOT NULL DEFAULT 'MIT',
  is_mit BOOLEAN NOT NULL DEFAULT false,
  primary_language TEXT NOT NULL DEFAULT '',
  tech_stack TEXT NOT NULL DEFAULT '',
  download_size TEXT NOT NULL DEFAULT '',
  hardware_requirements TEXT NOT NULL DEFAULT '',
  github_stars INTEGER NOT NULL DEFAULT 0,
  rate_limits TEXT NOT NULL DEFAULT '',
  quick_start_command TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX repositories_github_url_idx ON public.repositories (github_url);
CREATE INDEX repositories_github_stars_idx ON public.repositories (github_stars DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositories TO authenticated;
GRANT ALL ON public.repositories TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.repositories_id_seq TO anon, authenticated;

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read repositories" ON public.repositories FOR SELECT USING (true);
CREATE POLICY "Public insert repositories" ON public.repositories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update repositories" ON public.repositories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete repositories" ON public.repositories FOR DELETE USING (true);
