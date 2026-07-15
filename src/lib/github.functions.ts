import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type GitHubAutofill = {
  name: string;
  description: string;
  githubUrl: string;
  websiteUrl: string;
  imageUrl: string;
  licenseType: string;
  isMit: boolean;
  primaryLanguage: string;
  githubStars: number;
  techStack: string;
  downloadSize: string;
  hardwareRequirements: string;
  rateLimits: string;
  quickStartCommand: string;
};

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function inferDownloadSize(sizeKb: number): string {
  const mb = sizeKb / 1024;
  if (mb < 1) return "< 1 MB";
  if (mb < 10) return "1–10 MB";
  if (mb < 50) return "10–50 MB";
  if (mb < 200) return "50–200 MB";
  if (mb < 1000) return "200 MB–1 GB";
  return "1 GB+";
}

function inferHardware(lang: string | null): string {
  const l = (lang ?? "").toLowerCase();
  if (l.includes("go") || l.includes("rust")) return "512 MB RAM, 1 vCPU";
  if (l.includes("python") || l.includes("ruby")) return "1 GB RAM, 1 vCPU";
  if (l.includes("java") || l.includes("kotlin")) return "2 GB RAM, 1 vCPU";
  if (l.includes("typescript") || l.includes("javascript")) return "1–2 GB RAM, 1 vCPU";
  return "1 GB RAM, 1 vCPU (varies by deployment)";
}

function inferTechStack(primaryLang: string | null, topics: string[]): string {
  const lang = (primaryLang ?? "").trim();
  const parts: string[] = [];
  if (lang) parts.push(lang);
  parts.push(...topics.slice(0, 6).filter((x) => x.toLowerCase() !== lang.toLowerCase()));
  return parts.slice(0, 5).join(", ");
}

export const fetchGitHubRepo = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<GitHubAutofill> => {
    const parsed = parseGitHubUrl(data.url);
    if (!parsed) {
      throw new Error("Invalid GitHub URL. Expected https://github.com/owner/repo");
    }
    const { owner, repo } = parsed;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "merqato-tracker",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GitHub API error (${res.status}): ${text.slice(0, 200)}`);
    }
    const d = (await res.json()) as {
      name?: string;
      description?: string | null;
      language?: string | null;
      stargazers_count?: number;
      size?: number;
      license?: { spdx_id?: string | null } | null;
      owner?: { avatar_url?: string };
      html_url?: string;
      homepage?: string | null;
      topics?: string[];
      has_pages?: boolean;
    };

    const primaryLang = d.language ?? null;
    const topics = Array.isArray(d.topics) ? d.topics : [];
    const spdx = (d.license?.spdx_id ?? "Other").trim();
    const htmlUrl = d.html_url ?? data.url.trim();

    return {
      name: d.name ?? repo,
      description: d.description ?? "",
      githubUrl: htmlUrl,
      websiteUrl: d.homepage ?? "",
      imageUrl: d.owner?.avatar_url ?? "",
      licenseType: spdx,
      isMit: spdx.toUpperCase() === "MIT",
      primaryLanguage: primaryLang ?? "",
      githubStars: d.stargazers_count ?? 0,
      techStack: inferTechStack(primaryLang, topics),
      downloadSize: inferDownloadSize(d.size ?? 0),
      hardwareRequirements: inferHardware(primaryLang),
      rateLimits: d.has_pages ? "GitHub Pages bandwidth limits apply" : "None (Self-Hosted)",
      quickStartCommand: `git clone ${htmlUrl} && cd ${repo}`,
    };
  });
