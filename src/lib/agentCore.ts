import { createClient } from "@supabase/supabase-js";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type RepositoryInput = {
  repositoryName?: string;
  name?: string;
  description?: string;
  githubUrl?: string;
  websiteUrl?: string;
  imageUrl?: string;
  licenseType?: string;
  isMit?: boolean;
  primaryLanguage?: string;
  techStack?: string;
  downloadSize?: string;
  hardwareRequirements?: string;
  githubStars?: number;
  rateLimits?: string;
  quickStartCommand?: string;
};

const repositoryProperties = {
  repositoryName: { type: "string", description: "Repository display name." },
  description: { type: "string" },
  githubUrl: { type: "string", format: "uri" },
  websiteUrl: { type: "string" },
  imageUrl: { type: "string" },
  licenseType: { type: "string" },
  isMit: { type: "boolean" },
  primaryLanguage: { type: "string" },
  techStack: { type: "string" },
  downloadSize: { type: "string" },
  hardwareRequirements: { type: "string" },
  githubStars: { type: "integer", minimum: 0 },
  rateLimits: { type: "string" },
  quickStartCommand: { type: "string" },
};

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "list_repositories",
    description: "List repositories in the shared repository tracker.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Optional text filter." },
        onlyMit: { type: "boolean", description: "Only return MIT repositories." },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_repository",
    description: "Get one repository by numeric id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "integer", minimum: 1 } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "create_repository",
    description: "Create a repository record after the user confirms the metadata.",
    inputSchema: {
      type: "object",
      properties: repositoryProperties,
      required: ["repositoryName", "githubUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "update_repository",
    description: "Update fields on an existing repository record.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "integer", minimum: 1 }, ...repositoryProperties },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_repository",
    description: "Delete one repository by numeric id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "integer", minimum: 1 } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "autofill_from_github",
    description: "Fetch public GitHub metadata for a repository URL without saving it.",
    inputSchema: {
      type: "object",
      properties: { githubUrl: { type: "string", format: "uri" } },
      required: ["githubUrl"],
      additionalProperties: false,
    },
  },
];

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: isError ? undefined : payload,
    isError,
  };
}

function positiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function dbPayload(args: RepositoryInput) {
  const licenseType = String(args.licenseType ?? "MIT").trim() || "MIT";
  return {
    name: String(args.repositoryName ?? args.name ?? "").trim(),
    description: String(args.description ?? "").trim(),
    github_url: String(args.githubUrl ?? "").trim(),
    website_url: String(args.websiteUrl ?? "").trim(),
    image_url: String(args.imageUrl ?? "").trim(),
    license_type: licenseType,
    is_mit: typeof args.isMit === "boolean" ? args.isMit : licenseType.toUpperCase() === "MIT",
    primary_language: String(args.primaryLanguage ?? "").trim(),
    tech_stack: String(args.techStack ?? "").trim(),
    download_size: String(args.downloadSize ?? "").trim(),
    hardware_requirements: String(args.hardwareRequirements ?? "").trim(),
    github_stars: Math.max(0, Math.floor(Number(args.githubStars ?? 0) || 0)),
    rate_limits: String(args.rateLimits ?? "").trim(),
    quick_start_command: String(args.quickStartCommand ?? "").trim(),
  };
}

function githubSlug(raw: string) {
  try {
    const url = new URL(raw);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;
    const [owner, repo] = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    return owner && repo ? { owner, repo } : null;
  } catch {
    return null;
  }
}

async function fetchGithub(raw: string) {
  const slug = githubSlug(raw);
  if (!slug) throw new Error("Enter a valid GitHub repository URL.");
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${slug.owner}/${slug.repo}`, { headers });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
  const repo = await response.json();
  return {
    repositoryName: repo.name ?? slug.repo,
    description: repo.description ?? "",
    githubUrl: repo.html_url ?? raw,
    websiteUrl: repo.homepage ?? "",
    imageUrl: repo.owner?.avatar_url ?? "",
    licenseType: repo.license?.spdx_id ?? repo.license?.name ?? "Other",
    isMit: String(repo.license?.spdx_id ?? "").toUpperCase() === "MIT",
    primaryLanguage: repo.language ?? "",
    techStack: repo.topics?.join(", ") ?? "",
    githubStars: repo.stargazers_count ?? 0,
    rateLimits: "GitHub API limits apply to metadata autofill.",
    quickStartCommand: `git clone ${repo.clone_url ?? raw}`,
  };
}

export async function callAgentTool(name: string, rawArgs: Record<string, unknown>) {
  const supabase = getSupabase();

  if (name === "list_repositories") {
    const limit = Math.min(Math.max(Number(rawArgs.limit) || 50, 1), 200);
    let query = supabase.from("repositories").select("*").order("github_stars", { ascending: false }).limit(limit);
    if (rawArgs.onlyMit === true) query = query.eq("is_mit", true);
    const term = String(rawArgs.search ?? "").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,primary_language.ilike.%${term}%,tech_stack.ilike.%${term}%`);
    const { data, error } = await query;
    if (error) throw error;
    return textResult({ count: data?.length ?? 0, repositories: data ?? [] });
  }

  if (name === "get_repository") {
    const id = positiveId(rawArgs.id);
    if (!id) return textResult({ error: "A positive numeric id is required." }, true);
    const { data, error } = await supabase.from("repositories").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? textResult({ repository: data }) : textResult({ error: `Repository ${id} not found.` }, true);
  }

  if (name === "create_repository") {
    const values = dbPayload(rawArgs as RepositoryInput);
    if (!values.name || !values.github_url) return textResult({ error: "repositoryName and githubUrl are required." }, true);
    const { data, error } = await supabase.from("repositories").insert(values).select("*").single();
    if (error) throw error;
    return textResult({ created: true, repository: data });
  }

  if (name === "update_repository") {
    const id = positiveId(rawArgs.id);
    if (!id) return textResult({ error: "A positive numeric id is required." }, true);
    const values = dbPayload(rawArgs as RepositoryInput);
    const supplied = Object.keys(rawArgs);
    const mapping: Record<string, keyof typeof values> = {
      repositoryName: "name", name: "name", description: "description", githubUrl: "github_url",
      websiteUrl: "website_url", imageUrl: "image_url", licenseType: "license_type", isMit: "is_mit",
      primaryLanguage: "primary_language", techStack: "tech_stack", downloadSize: "download_size",
      hardwareRequirements: "hardware_requirements", githubStars: "github_stars", rateLimits: "rate_limits",
      quickStartCommand: "quick_start_command",
    };
    const patch: Record<string, unknown> = {};
    for (const key of supplied) if (mapping[key]) patch[mapping[key]] = values[mapping[key]];
    const { data, error } = await supabase.from("repositories").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? textResult({ updated: true, repository: data }) : textResult({ error: `Repository ${id} not found.` }, true);
  }

  if (name === "delete_repository") {
    const id = positiveId(rawArgs.id);
    if (!id) return textResult({ error: "A positive numeric id is required." }, true);
    const { data, error } = await supabase.from("repositories").delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    return data ? textResult({ deleted: true, id }) : textResult({ error: `Repository ${id} not found.` }, true);
  }

  if (name === "autofill_from_github") {
    try {
      return textResult({ autofill: await fetchGithub(String(rawArgs.githubUrl ?? "")) });
    } catch (error) {
      return textResult({ error: error instanceof Error ? error.message : "GitHub lookup failed." }, true);
    }
  }

  return null;
}

export function openAiTools() {
  return toolDefinitions.map((tool) => ({
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  }));
}

export function publicBaseUrl(request: Request) {
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${protocol}://${host}`;
}

export function openApiDocument(request: Request) {
  const paths: Record<string, unknown> = {};
  for (const tool of toolDefinitions) {
    paths[`/api/agents/call/${tool.name}`] = {
      post: {
        operationId: tool.name,
        summary: tool.description,
        requestBody: { required: true, content: { "application/json": { schema: tool.inputSchema } } },
        responses: { "200": { description: "Tool execution result." } },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: { title: "merQato Repository Tracker Agent API", version: "1.2.0" },
    servers: [{ url: publicBaseUrl(request) }],
    paths,
  };
}
