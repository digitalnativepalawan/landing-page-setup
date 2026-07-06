import type { ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const inputCls =
  "w-full rounded-xl border border-[var(--mq-line)] bg-[var(--mq-panel)] px-3 py-2 text-sm text-[var(--mq-text)] outline-none transition placeholder:text-[var(--mq-muted)] focus:border-[var(--mq-gold)] focus:ring-2 focus:ring-[color:rgb(202_163_90_/_0.25)]";

export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={cn("block", wide && "sm:col-span-2")}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mq-gold)]">
        {label}
      </span>
      {children}
    </label>
  );
}

type Tone = "gold" | "green" | "red" | "blue" | "amber" | "slate" | "crimson";

export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const tones: Record<Tone, string> = {
    gold: "border-[color:rgb(202_163_90_/_0.45)] bg-[color:rgb(202_163_90_/_0.14)] text-[var(--mq-gold)]",
    green: "border-emerald-400/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    red: "border-red-500/35 bg-red-500/10 text-red-600 dark:text-red-300",
    blue: "border-sky-500/35 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    amber: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    slate: "border-[var(--mq-line)] bg-[color:rgb(255_255_255_/_0.04)] text-[var(--mq-muted)]",
    crimson: "border-[color:rgb(196_20_20_/_0.45)] bg-[color:rgb(196_20_20_/_0.12)] text-[var(--mq-red)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RepoAvatar({ name, imageUrl }: { name: string; imageUrl: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-xl border border-[var(--mq-line)] bg-[var(--mq-panel-soft)] object-cover shadow-sm"
      />
    );
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--mq-line)] bg-[var(--mq-panel-soft)] text-xs font-bold text-[var(--mq-gold)]">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function TagList({ value, limit = 3 }: { value: string; limit?: number }) {
  const tags = splitTags(value);
  if (tags.length === 0) return <span className="text-[var(--mq-muted)]">—</span>;
  const visible = tags.slice(0, limit);
  const extra = tags.length - visible.length;

  return (
    <div className="flex max-w-[280px] flex-wrap gap-1.5">
      {visible.map((tag) => (
        <Badge key={tag} tone="gold">
          {tag}
        </Badge>
      ))}
      {extra > 0 && <Badge tone="slate">+{extra}</Badge>}
    </div>
  );
}

export function formatStars(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value || 0);
}

export function languageTone(language: string): Tone {
  const l = language.toLowerCase();
  if (l.includes("typescript") || l.includes("go")) return "blue";
  if (l.includes("python") || l.includes("rust")) return "green";
  if (l.includes("java") || l.includes("ruby")) return "crimson";
  if (l.includes("javascript")) return "amber";
  return "slate";
}

export function licenseTone(license: string): Tone {
  const l = license.toUpperCase();
  if (l === "MIT" || l === "APACHE-2.0" || l === "BSD-3-CLAUSE") return "green";
  if (l === "MPL-2.0") return "amber";
  if (l === "GPL-3.0") return "crimson";
  if (l === "AGPL-3.0") return "red";
  return "slate";
}
