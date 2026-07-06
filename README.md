# merQato.digital — Repository Tracker

A local-first tracker for open-source GitHub repositories, built for humans
and AI agents (MCP). Next.js (App Router) + Drizzle ORM + PostgreSQL, ready
to point at **Supabase** whenever you deploy.

## Code Tree

```text
.
├── README.md                        ← you are here
├── .env.example                     ← local + Supabase connection templates
├── drizzle.config.json              ← drizzle-kit config (reads DATABASE_URL)
├── supabase/                        ← Supabase-ready database assets
│   ├── migrations/
│   │   └── 0001_create_repositories.sql   ← full DDL + indexes + RLS policies
│   └── seed.sql                     ← sample data (same as POST /api/seed)
└── src/
    ├── db/
    │   ├── index.ts                 ← pg pool (auto-enables SSL for Supabase)
    │   └── schema.ts                ← Drizzle table — single source of truth
    ├── lib/
    │   ├── csv.ts                   ← CSV export serializer
    │   └── mcpSchema.ts             ← canonical field metadata (human + MCP)
    ├── components/
    │   ├── Tracker.tsx              ← intake form, autofill, table, drawer
    │   ├── SchemaReference.tsx      ← schema docs + MCP tool JSON panel
    │   ├── UseCases.tsx             ← business use-case notes
    │   ├── ThemeToggle.tsx          ← light/dark brand theme switch
    │   ├── BrandLogo.tsx            ← brand mark (currently unused in header)
    │   └── uiPrimitives.tsx         ← shared Badge/Field/Avatar/Tag helpers
    └── app/
        ├── page.tsx                 ← main dashboard
        ├── layout.tsx / globals.css ← brand theme (CSS variables, light/dark)
        └── api/
            ├── repositories/        ← CRUD + CSV export
            ├── github/fetch/        ← "Autofill from GitHub" endpoint
            ├── mcp/schema/          ← machine-readable schema for AI agents
            ├── seed/                ← sample-data loader / reset
            └── health/              ← healthcheck
```

## Run Locally (default)

```bash
cp .env.example .env          # keep OPTION A (local Postgres)
npm install
npx drizzle-kit push          # create/update tables
npm run dev
```

Optional: `curl -X POST localhost:3000/api/seed` to load sample data.

## Switch to Supabase (when you deploy)

1. **Create a project** at [supabase.com](https://supabase.com) and copy your
   database password.

2. **Set the connection string** in `.env` — use OPTION B from
   `.env.example`:
   - *Transaction pooler* (port `6543`) for serverless hosts like Vercel.
   - *Direct connection* for running migrations.

3. **Apply the schema** — either way works:

   ```bash
   # Using the Supabase CLI (uses supabase/migrations/):
   supabase link --project-ref <project-ref>
   supabase db push

   # Or using Drizzle against the direct connection:
   DATABASE_URL="<direct-connection-url>" npx drizzle-kit push

   # Or plain psql:
   psql "<direct-connection-url>" -f supabase/migrations/0001_create_repositories.sql
   psql "<direct-connection-url>" -f supabase/seed.sql
   ```

4. **Deploy the app.** No code changes needed — `src/db/index.ts`
   auto-enables TLS for `*.supabase.co` / `*.supabase.com` hosts
   (or force it with `DATABASE_SSL=true`).

### Notes

- The app talks to Postgres directly through Drizzle, so the Supabase
  **anon/service keys are not required**. They're stubbed in `.env.example`
  only for a future move to Supabase Auth/Storage/Realtime via `supabase-js`.
- `supabase/migrations/0001_create_repositories.sql` enables **RLS** with a
  service-role policy, so the table stays locked down if you ever expose it
  through Supabase's auto-generated PostgREST API.
- Set `GITHUB_TOKEN` in `.env` to raise the GitHub Autofill rate limit from
  60 to 5,000 requests/hour.

## Key Endpoints

| Route                        | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `GET/POST /api/repositories` | List / create repositories                |
| `DELETE /api/repositories/:id` | Remove a repository                     |
| `GET /api/repositories/export` | CSV export (spreadsheet/CRM import)     |
| `POST /api/github/fetch`     | Autofill form data from a GitHub URL      |
| `GET /api/mcp/schema`        | Machine-readable schema for MCP servers   |
| `POST /api/seed` / `DELETE`  | Load / reset sample data                  |
