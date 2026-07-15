import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WebsiteAutofill = {
  websiteUrl: string;
  websiteTitle: string;
  websiteDescription: string;
  imageUrl: string;
};

function pickMeta(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      return decodeEntities(m[1].trim()).slice(0, 500);
    }
  }
  return "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absolutize(base: string, ref: string): string {
  if (!ref) return "";
  try {
    return new URL(ref, base).toString();
  } catch {
    return ref;
  }
}

export const fetchWebsiteMeta = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<WebsiteAutofill> => {
    let target = data.url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

    let finalUrl = target;
    let html = "";
    try {
      const res = await fetch(target, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; merqato-tracker/1.0; +https://merqato.digital)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      finalUrl = res.url || target;
      html = await res.text();
    } catch (err) {
      throw new Error(
        `Could not fetch website: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    // strip scripts/styles to reduce noise
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");

    const title = pickMeta(cleaned, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const description = pickMeta(cleaned, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const rawImage = pickMeta(cleaned, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i,
    ]);

    return {
      websiteUrl: finalUrl,
      websiteTitle: title,
      websiteDescription: description,
      imageUrl: rawImage ? absolutize(finalUrl, rawImage) : "",
    };
  });
