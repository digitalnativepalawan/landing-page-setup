import { createFileRoute } from "@tanstack/react-router";
import { openApiDocument } from "@/lib/agentCore";

export const Route = createFileRoute("/api/openapi.json")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(JSON.stringify(openApiDocument(request)), {
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
    },
  },
});
