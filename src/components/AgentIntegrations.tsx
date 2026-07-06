import { useEffect, useMemo, useState } from "react";

type Platform = {
  id: string;
  label: string;
  blurb: string;
  snippet: (base: string) => string;
  links?: Array<{ label: string; path: string }>;
};

const PLATFORMS: Platform[] = [
  {
    id: "claude",
    label: "Claude",
    blurb:
      "Claude Desktop and Claude Code speak MCP natively. Add this server and the repository tools become available to the agent.",
    snippet: (base) => `// Claude Desktop → Settings → Developer → Edit Config
{
  "mcpServers": {
    "merqato-tracker": {
      "url": "${base}/api/mcp"
    }
  }
}

// Claude Code
claude mcp add --transport http merqato-tracker ${base}/api/mcp`,
    links: [{ label: "MCP endpoint", path: "/api/mcp" }],
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    blurb:
      "Import the OpenAPI document into a Custom GPT Action so ChatGPT can discover and call the repository tools.",
    snippet: (base) => `1. ChatGPT → Explore GPTs → Create
2. Configure → Actions → Import from URL
3. Paste: ${base}/api/openapi.json
4. Save the Action

Suggested instructions:
Manage the open-source repository tracker. For a GitHub URL, call
autofill_from_github first, show the metadata, and only create a
repository after the user confirms.`,
    links: [{ label: "OpenAPI spec", path: "/api/openapi.json" }],
  },
  {
    id: "hermes",
    label: "Hermes",
    blurb:
      "Hermes can load tool signatures from the discovery endpoint and execute each tool through the shared REST adapter.",
    snippet: (base) => `# Get Hermes-compatible tool signatures
curl ${base}/api/agents/tools?format=hermes

# Execute a tool
curl -X POST ${base}/api/agents/call/list_repositories \\
  -H 'Content-Type: application/json' \\
  -d '{"onlyMit": true}'`,
    links: [{ label: "Hermes tools", path: "/api/agents/tools?format=hermes" }],
  },
  {
    id: "ollama",
    label: "Ollama",
    blurb:
      "Local Ollama models can use OpenAI-compatible function calling and relay their tool calls to this application.",
    snippet: (base) => `import ollama, requests

BASE = "${base}"
tools = requests.get(f"{BASE}/api/agents/tools?format=ollama").json()["tools"]
response = ollama.chat(
    model="llama3.1",
    tools=tools,
    messages=[{"role": "user", "content": "List the tracked repositories"}],
)
print(response)`,
    links: [{ label: "Ollama tools", path: "/api/agents/tools?format=ollama" }],
  },
  {
    id: "web",
    label: "OpenUI / Web",
    blurb:
      "Any OpenAPI-aware web agent or plain HTTP client can discover and execute tools without using MCP.",
    snippet: (base) => `# Discover tools
curl ${base}/api/agents/tools

# Execute a tool
curl -X POST ${base}/api/agents/call/autofill_from_github \\
  -H 'Content-Type: application/json' \\
  -d '{"githubUrl":"https://github.com/twentyhq/twenty"}'

# OpenAPI document
${base}/api/openapi.json`,
    links: [{ label: "Tool discovery", path: "/api/agents/tools" }],
  },
];

export default function AgentIntegrations() {
  const [active, setActive] = useState(PLATFORMS[0].id);
  const [copied, setCopied] = useState(false);
  const [base, setBase] = useState("https://your-host");

  useEffect(() => {
    setBase(window.location.origin);
  }, []);

  const platform = useMemo(
    () => PLATFORMS.find((item) => item.id === active) ?? PLATFORMS[0],
    [active],
  );
  const snippet = platform.snippet(base);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mq-card mt-12 rounded-[1.6rem] p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--mq-gold)]">
        Connect your agents
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-[var(--mq-text)]">
        MCP and AI agent integrations
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--mq-muted)]">
        Connect Claude through MCP, ChatGPT through OpenAPI Actions, Hermes and
        Ollama through tool calling, or any web agent through the REST interface.
        Every integration works against the same repository data.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PLATFORMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active === item.id
                ? "border-[var(--mq-gold)] bg-[color:rgb(202_163_90_/_0.14)] text-[var(--mq-gold)]"
                : "border-[var(--mq-line)] text-[var(--mq-muted)] hover:text-[var(--mq-gold)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mq-subcard mt-4 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-sm leading-6 text-[var(--mq-muted)]">
            {platform.blurb}
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            {platform.links?.map((link) => (
              <a
                key={link.path}
                href={link.path}
                target="_blank"
                rel="noreferrer"
                className="mq-pill px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                {link.label} ↗
              </a>
            ))}
            <button
              type="button"
              onClick={copySnippet}
              className="rounded-lg bg-[var(--mq-gold)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-black p-4 text-xs leading-relaxed text-[var(--mq-cream)]">
          <code>{snippet}</code>
        </pre>
      </div>
    </section>
  );
}
