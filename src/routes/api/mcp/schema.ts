import { createFileRoute } from "@tanstack/react-router";
import { toolDefinitions } from "@/lib/agentCore";

export const Route = createFileRoute("/api/mcp/schema")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            name: "merqato-repository-tracker",
            version: "1.2.0",
            transport: "streamable-http",
            endpoint: "/api/mcp",
            tools: toolDefinitions,
          }),
          { headers: { "content-type": "application/json; charset=utf-8" } },
        ),
    },
  },
});
