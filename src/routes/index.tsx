import { createFileRoute } from "@tanstack/react-router";
import AgentIntegrations from "@/components/AgentIntegrations";
import RemoveLovableBranding from "@/components/RemoveLovableBranding";
import Tracker from "@/components/Tracker";
import ThemeToggle from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "merQato.digital — Repository Intelligence" },
      {
        name: "description",
        content:
          "Track GitHub repositories, license posture, stack details, infrastructure requirements, and MCP-readable metadata for humans and AI agents.",
      },
      { property: "og:title", content: "merQato.digital — Repository Intelligence" },
      {
        property: "og:description",
        content:
          "Open-source repository tracker for humans and AI agents, with MCP, OpenAPI, and REST integrations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mq-page mx-auto max-w-7xl px-5 py-8 sm:py-10">
      <RemoveLovableBranding />
      <header className="mq-card mb-8 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div>
              <p className="text-xl font-semibold tracking-tight text-[var(--mq-text)]">
                merQato<span className="text-[var(--mq-red)]">.digital</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--mq-gold)]">
                Repository Intelligence
              </p>
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mq-gold)]">
              Built for operational clarity
            </p>
            <h1 className="mq-display mt-2 max-w-3xl text-4xl font-semibold leading-[0.95] text-[var(--mq-text)] sm:text-6xl">
              Open-source repository tracker for humans and AI agents.
            </h1>
            <p className="mt-5 max-w-2xl border-l border-[var(--mq-gold)] pl-4 text-sm leading-7 text-[var(--mq-muted)]">
              Track GitHub repositories, license posture, stack details, disk
              footprint, hardware needs, quick-start commands, and MCP-readable
              metadata in one shared repository intelligence workspace.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="mq-pill px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
              Beta Preview
            </span>
            <ThemeToggle />
          </div>
        </div>
        <div className="mq-gold-line mt-8" />
      </header>

      <Tracker />
      <AgentIntegrations />
    </main>
  );
}
