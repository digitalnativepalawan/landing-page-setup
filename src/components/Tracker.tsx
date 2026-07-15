import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LICENSE_OPTIONS } from "@/lib/mcpSchema";
import { supabase } from "@/integrations/supabase/client";
import { fetchGitHubRepo } from "@/lib/github.functions";
import { fetchWebsiteMeta } from "@/lib/website.functions";
import {
  Badge,
  Field,
  RepoAvatar,
  TagList,
  cn,
  formatStars,
  inputCls,
  languageTone,
  licenseTone,
} from "@/lib/uiPrimitives";


type Repository = {
  id: number;
  name: string;
  description: string;
  githubUrl: string;
  websiteUrl: string;
  websiteTitle: string;
  websiteDescription: string;
  imageUrl: string;
  licenseType: string;
  isMit: boolean;
  primaryLanguage: string;
  techStack: string;
  downloadSize: string;
  hardwareRequirements: string;
  githubStars: number;
  rateLimits: string;
  quickStartCommand: string;
  createdAt: string;
};

type FormState = Omit<Repository, "id" | "createdAt">;

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  githubUrl: "",
  websiteUrl: "",
  websiteTitle: "",
  websiteDescription: "",
  imageUrl: "",
  licenseType: "MIT",
  isMit: true,
  primaryLanguage: "",
  techStack: "",
  downloadSize: "",
  hardwareRequirements: "",
  githubStars: 0,
  rateLimits: "",
  quickStartCommand: "",
};


const BASIC_FIELDS = [
  ["Repository Name *", "name", "Excalidraw"],
  ["Primary Language", "primaryLanguage", "TypeScript"],
  ["Image / Logo URL", "imageUrl", "https://.../logo.png"],
  ["Tech Stack", "techStack", "React, NestJS, Postgres"],
  ["Download Size / Disk Footprint", "downloadSize", "1-2 GB (Docker)"],
  ["Minimum Hardware Requirements", "hardwareRequirements", "2GB RAM, 1 vCPU"],
  ["Rate Limits", "rateLimits", "None (Self-Hosted)"],
] as const;


// DB row -> UI row
type DbRow = {
  id: number;
  name: string;
  description: string;
  github_url: string;
  website_url: string;
  website_title: string;
  website_description: string;
  image_url: string;
  license_type: string;
  is_mit: boolean;
  primary_language: string;
  tech_stack: string;
  download_size: string;
  hardware_requirements: string;
  github_stars: number;
  rate_limits: string;
  quick_start_command: string;
  created_at: string;
};

function fromDb(r: DbRow): Repository {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    githubUrl: r.github_url,
    websiteUrl: r.website_url,
    websiteTitle: r.website_title ?? "",
    websiteDescription: r.website_description ?? "",
    imageUrl: r.image_url,
    licenseType: r.license_type,
    isMit: r.is_mit,
    primaryLanguage: r.primary_language,
    techStack: r.tech_stack,
    downloadSize: r.download_size,
    hardwareRequirements: r.hardware_requirements,
    githubStars: r.github_stars,
    rateLimits: r.rate_limits,
    quickStartCommand: r.quick_start_command,
    createdAt: r.created_at,
  };
}

function toDb(f: FormState) {
  return {
    name: f.name,
    description: f.description,
    github_url: f.githubUrl,
    website_url: f.websiteUrl,
    website_title: f.websiteTitle,
    website_description: f.websiteDescription,
    image_url: f.imageUrl,
    license_type: f.licenseType,
    is_mit: f.isMit,
    primary_language: f.primaryLanguage,
    tech_stack: f.techStack,
    download_size: f.downloadSize,
    hardware_requirements: f.hardwareRequirements,
    github_stars: f.githubStars,
    rate_limits: f.rateLimits,
    quick_start_command: f.quickStartCommand,
  };
}

export default function Tracker() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchingSite, setFetchingSite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [licenseFilter, setLicenseFilter] = useState("all");
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const runFetch = useServerFn(fetchGitHubRepo);
  const runFetchSite = useServerFn(fetchWebsiteMeta);

  function startEdit(repo: Repository) {
    const { id: _id, createdAt: _c, ...rest } = repo;
    setForm(rest);
    setEditingId(repo.id);
    setError(null);
    setSelectedRepo(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("repositories")
      .select("*")
      .order("github_stars", { ascending: false });
    if (error) setError(error.message);
    setRepos((data ?? []).map((r) => fromDb(r as DbRow)));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "licenseType") {
        next.isMit = String(value).toUpperCase() === "MIT";
      }
      return next;
    });
  }

  async function handleFetch() {
    const url = form.githubUrl.trim();
    if (!url) {
      setError("Enter a GitHub URL first, then click Fetch.");
      return;
    }
    setError(null);
    setFetching(true);
    try {
      const d = await runFetch({ data: { url } });
      setForm({ ...EMPTY_FORM, ...d, githubUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed.");
    } finally {
      setFetching(false);
    }
  }



  async function handleFetchSite() {
    const url = form.websiteUrl.trim();
    if (!url) {
      setError("Enter a Website URL first, then click Fetch site.");
      return;
    }
    setError(null);
    setFetchingSite(true);
    try {
      const d = await runFetchSite({ data: { url } });
      setForm((prev) => ({
        ...prev,
        websiteUrl: d.websiteUrl || prev.websiteUrl,
        websiteTitle: d.websiteTitle || prev.websiteTitle,
        websiteDescription: d.websiteDescription || prev.websiteDescription,
        description: prev.description || d.websiteDescription,
        imageUrl: prev.imageUrl || d.imageUrl,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Website fetch failed.");
    } finally {
      setFetchingSite(false);
    }
  }


  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.githubUrl.trim()) {
      setError("Repository name and GitHub URL are required.");
      return;
    }
    setSaving(true);
    const { error } = editingId
      ? await supabase.from("repositories").update(toDb(form)).eq("id", editingId)
      : await supabase.from("repositories").insert(toDb(form));
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: number) {
    const { error } = await supabase.from("repositories").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setRepos((prev) => prev.filter((r) => r.id !== id));
    setSelectedRepo((prev) => (prev?.id === id ? null : prev));
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return repos.filter((r) => {
      const matchesSearch =
        !term ||
        `${r.name} ${r.description} ${r.primaryLanguage} ${r.techStack}`
          .toLowerCase()
          .includes(term);
      const matchesLicense =
        licenseFilter === "all" || (licenseFilter === "mit" ? r.isMit : !r.isMit);
      return matchesSearch && matchesLicense;
    });
  }, [repos, search, licenseFilter]);

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="mq-card rounded-[1.6rem] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mq-gold)]">
              {editingId ? "Edit Repository" : "Repository Intake"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--mq-text)]">
              {editingId ? `Editing #${editingId}` : "Add a repository"}
            </h2>
          </div>
          <Badge tone="gold">Backed by Lovable Cloud</Badge>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-2">
            <Field label="GitHub URL *">
              <div className="flex gap-2">
                <input
                  className={cn(inputCls, "flex-1")}
                  value={form.githubUrl}
                  onChange={(e) => update("githubUrl", e.target.value)}
                  placeholder="https://github.com/owner/repo"
                />
                <button
                  type="button"
                  onClick={handleFetch}
                  disabled={fetching}
                  className="shrink-0 rounded-xl bg-[var(--mq-gold)] px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_rgba(202,163,90,0.22)] transition hover:bg-[var(--mq-gold-bright)] disabled:opacity-60"
                >
                  {fetching ? "Scraping…" : "Fetch Repo Data"}
                </button>
              </div>
            </Field>
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <Field label="Website / Docs URL">
              <div className="flex gap-2">
                <input
                  className={cn(inputCls, "flex-1")}
                  value={form.websiteUrl}
                  onChange={(e) => update("websiteUrl", e.target.value)}
                  placeholder="https://project.dev"
                />
                <button
                  type="button"
                  onClick={handleFetchSite}
                  disabled={fetchingSite}
                  className="shrink-0 rounded-xl bg-[var(--mq-gold)] px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_rgba(202,163,90,0.22)] transition hover:bg-[var(--mq-gold-bright)] disabled:opacity-60"
                >
                  {fetchingSite ? "Scraping…" : "Fetch Site Data"}
                </button>
              </div>
            </Field>
          </div>

          <Field label="Website Title">
            <input
              className={inputCls}
              value={form.websiteTitle}
              onChange={(e) => update("websiteTitle", e.target.value)}
              placeholder="Auto-filled from site"
            />
          </Field>

          <Field label="Website Description" wide>
            <textarea
              className={cn(inputCls, "min-h-[70px] resize-y")}
              value={form.websiteDescription}
              onChange={(e) => update("websiteDescription", e.target.value)}
              placeholder="Auto-filled meta description"
            />
          </Field>

          {BASIC_FIELDS.map(([label, key, placeholder]) => (
            <Field key={key} label={label}>
              <input
                className={inputCls}
                value={String(form[key] ?? "")}
                onChange={(e) => update(key, e.target.value as FormState[typeof key])}
                placeholder={placeholder}
              />
            </Field>
          ))}

          <Field label="GitHub Stars">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={form.githubStars || ""}
              onChange={(e) => update("githubStars", Number(e.target.value || 0))}
              placeholder="52000"
            />
          </Field>

          <Field label="License Type">
            <div className="flex items-center gap-3">
              <select
                className={inputCls}
                value={form.licenseType}
                onChange={(e) => update("licenseType", e.target.value)}
              >
                {LICENSE_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <label className="mq-pill flex shrink-0 items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <input
                  type="checkbox"
                  checked={form.isMit}
                  onChange={(e) => update("isMit", e.target.checked)}
                  className="h-4 w-4 accent-[var(--mq-gold)]"
                />
                MIT
              </label>
            </div>
          </Field>

          <Field label="Description" wide>
            <textarea
              className={cn(inputCls, "min-h-[82px] resize-y")}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What does this project do?"
            />
          </Field>

          <Field label="Quick Start Command" wide>
            <textarea
              className={cn(inputCls, "min-h-[88px] resize-y font-mono")}
              value={form.quickStartCommand}
              onChange={(e) => update("quickStartCommand", e.target.value)}
              placeholder="docker compose up -d"
            />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-[var(--mq-red)]">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--mq-gold)] px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_24px_rgba(202,163,90,0.22)] transition hover:bg-[var(--mq-gold-bright)] disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Add repository"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border border-[var(--mq-line)] px-5 py-2.5 text-sm font-semibold text-[var(--mq-text)] transition hover:border-[var(--mq-gold)]"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="mq-card rounded-[1.6rem] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            className={cn(inputCls, "max-w-sm")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, stack, language…"
          />
          <select
            className={cn(inputCls, "max-w-[190px]")}
            value={licenseFilter}
            onChange={(e) => setLicenseFilter(e.target.value)}
          >
            <option value="all">All licenses</option>
            <option value="mit">MIT only</option>
            <option value="non-mit">Non-MIT</option>
          </select>
          <span className="text-sm text-[var(--mq-muted)]">
            {filtered.length} of {repos.length}
          </span>
        </div>

        <div className="space-y-3 lg:hidden">
          {loading || filtered.length === 0 ? (
            <EmptyState loading={loading} />
          ) : (
            filtered.map((repo) => (
              <article key={repo.id} className="mq-subcard rounded-2xl p-4">
                <RepoIdentity repo={repo} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="gold">★ {formatStars(repo.githubStars)}</Badge>
                  <Badge tone={languageTone(repo.primaryLanguage)}>
                    {repo.primaryLanguage || "—"}
                  </Badge>
                  <Badge tone={licenseTone(repo.licenseType)}>{repo.licenseType}</Badge>
                </div>
                <div className="mt-3">
                  <TagList value={repo.techStack} limit={4} />
                </div>
                <div className="mt-3">
                  <WebsiteCell repo={repo} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mq-line)] pt-3">
                  <RepoLinks repo={repo} className="flex-row gap-4" />
                  <RepoActions repo={repo} onView={setSelectedRepo} onEdit={startEdit} onDelete={handleDelete} />
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[var(--mq-line)] lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:rgb(202_163_90_/_0.08)] text-xs uppercase tracking-[0.16em] text-[var(--mq-gold)]">
              <tr>
                {["Repository", "Website", "Tech Stack", "Stars", "Language", "License", "Links", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mq-line)]">
              {loading || filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--mq-muted)]">
                    {loading ? "Loading…" : "No repositories yet. Add one above."}
                  </td>
                </tr>
              ) : (
                filtered.map((repo) => (
                  <tr key={repo.id} className="align-top transition hover:bg-[color:rgb(202_163_90_/_0.05)]">
                    <td className="min-w-[250px] px-4 py-3">
                      <RepoIdentity repo={repo} />
                    </td>
                    <td className="min-w-[220px] max-w-[300px] px-4 py-3"><WebsiteCell repo={repo} /></td>
                    <td className="px-4 py-3"><TagList value={repo.techStack} /></td>
                    <td className="px-4 py-3"><Badge tone="gold">★ {formatStars(repo.githubStars)}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={languageTone(repo.primaryLanguage)}>{repo.primaryLanguage || "—"}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={licenseTone(repo.licenseType)}>{repo.licenseType}</Badge></td>
                    <td className="px-4 py-3">
                      <RepoLinks repo={repo} className="flex-col gap-1" />
                    </td>
                    <td className="px-4 py-3">
                      <RepoActions repo={repo} onView={setSelectedRepo} onEdit={startEdit} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <StatsDrawer repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
    </div>
  );
}

function EmptyState({ loading }: { loading: boolean }) {
  return (
    <div className="mq-subcard rounded-2xl px-4 py-12 text-center text-[var(--mq-muted)]">
      {loading ? "Loading…" : "No repositories yet. Add one above."}
    </div>
  );
}

function RepoIdentity({ repo }: { repo: Repository }) {
  return (
    <div className="flex items-center gap-3">
      <RepoAvatar name={repo.name} imageUrl={repo.imageUrl} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--mq-text)]">{repo.name}</p>
        <p className="line-clamp-1 text-xs text-[var(--mq-muted)]">
          {repo.description || "No description"}
        </p>
      </div>
    </div>
  );
}

function RepoLinks({ repo, className }: { repo: Repository; className?: string }) {
  return (
    <div className={cn("flex text-xs font-semibold", className)}>
      <a href={repo.githubUrl} target="_blank" rel="noreferrer" className="text-[var(--mq-gold)] hover:underline">
        GitHub ↗
      </a>
      {repo.websiteUrl && (
        <a href={repo.websiteUrl} target="_blank" rel="noreferrer" className="text-[var(--mq-gold)] hover:underline">
          Website ↗
        </a>
      )}
    </div>
  );
}

function RepoActions({
  repo,
  onView,
  onEdit,
  onDelete,
}: {
  repo: Repository;
  onView: (repo: Repository) => void;
  onEdit: (repo: Repository) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onView(repo)}
        className="rounded-lg bg-[var(--mq-gold)] px-3 py-1.5 text-xs font-bold text-black"
      >
        View
      </button>
      <button
        onClick={() => onEdit(repo)}
        className="rounded-lg border border-[var(--mq-line)] px-3 py-1.5 text-xs font-semibold text-[var(--mq-text)] hover:border-[var(--mq-gold)]"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(repo.id)}
        className="rounded-lg border border-[color:rgb(196_20_20_/_0.35)] px-3 py-1.5 text-xs font-semibold text-[var(--mq-red)]"
      >
        Delete
      </button>
    </div>
  );
}


function StatsDrawer({ repo, onClose }: { repo: Repository | null; onClose: () => void }) {
  if (!repo) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-full max-w-xl flex-col gap-4 overflow-y-auto bg-[var(--mq-panel)] p-6 shadow-2xl sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <RepoAvatar name={repo.name} imageUrl={repo.imageUrl} />
            <div>
              <h3 className="text-xl font-semibold text-[var(--mq-text)]">{repo.name}</h3>
              <p className="text-sm text-[var(--mq-muted)]">{repo.description || "No description"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--mq-line)] px-3 py-1.5 text-xs font-semibold text-[var(--mq-gold)]"
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard label="Stars" value={formatStars(repo.githubStars)} />
          <InfoCard label="Language" value={repo.primaryLanguage || "—"} />
          <InfoCard label="License" value={repo.licenseType} />
          <InfoCard label="Download / Disk" value={repo.downloadSize || "—"} />
          <InfoCard label="Minimum Hardware" value={repo.hardwareRequirements || "—"} />
          <InfoCard label="Rate Limits" value={repo.rateLimits || "—"} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mq-gold)]">
            Quick Start
          </p>
          <pre className="overflow-x-auto rounded-xl bg-black p-4 text-sm leading-6 text-[var(--mq-cream)]">
            <code>{repo.quickStartCommand || "No quick-start command recorded."}</code>
          </pre>
        </div>
      </aside>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="mq-subcard rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--mq-gold)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--mq-text)]">{value}</p>
    </div>
  );
}
