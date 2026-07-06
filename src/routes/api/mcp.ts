import { createFileRoute } from "@tanstack/react-router";
import { callAgentTool, toolDefinitions } from "@/lib/agentCore";

const PROTOCOL_VERSION = "2025-06-18";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function ok(id: number | string | null, value: unknown) {
  return json({ jsonrpc: "2.0", id, result: value });
}

function fail(id: number | string | null, code: number, message: string) {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      GET: async () => json({
        name: "merqato-repository-tracker",
        transport: "streamable-http",
        protocolVersion: PROTOCOL_VERSION,
        tools: toolDefinitions.map((tool) => tool.name),
        schemaDocument: "/api/mcp/schema",
        openApiSpec: "/api/openapi.json",
      }),
      POST: async ({ request }) => {
        let body: { id?: number | string | null; method?: string; params?: Record<string, unknown> };
        try {
          body = await request.json();
        } catch {
          return fail(null, -32700, "Invalid JSON.");
        }

        const id = body.id ?? null;
        const params = body.params ?? {};

        if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
        if (body.method === "initialize") return ok(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "merqato-repository-tracker", version: "1.2.0" },
        });
        if (body.method === "ping") return ok(id, {});
        if (body.method === "tools/list") return ok(id, { tools: toolDefinitions });
        if (body.method === "tools/call") {
          const value = await callAgentTool(
            String(params.name ?? ""),
            (params.arguments ?? {}) as Record<string, unknown>,
          );
          return value ? ok(id, value) : fail(id, -32602, "Unknown tool.");
        }
        return fail(id, -32601, "Method not found.");
      },
    },
  },
});
