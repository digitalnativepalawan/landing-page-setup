import { createFileRoute } from "@tanstack/react-router";
import { callAgentTool } from "@/lib/agentCore";

export const Route = createFileRoute("/api/agents/call/$tool")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        let args: Record<string, unknown> = {};
        try {
          args = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
            status: 400,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }

        try {
          const result = await callAgentTool(params.tool, args);
          if (!result) {
            return new Response(JSON.stringify({ error: `Unknown tool: ${params.tool}` }), {
              status: 404,
              headers: { "content-type": "application/json; charset=utf-8" },
            });
          }
          return new Response(JSON.stringify(result), {
            status: result.isError ? 400 : 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Tool execution failed." }),
            {
              status: 500,
              headers: { "content-type": "application/json; charset=utf-8" },
            },
          );
        }
      },
    },
  },
});
