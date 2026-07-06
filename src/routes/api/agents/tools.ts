import { createFileRoute } from "@tanstack/react-router";
import { openAiTools, publicBaseUrl, toolDefinitions } from "@/lib/agentCore";

function hermesPrompt(baseUrl: string) {
  const tools = openAiTools().map((tool) => JSON.stringify(tool)).join("\n");
  return `You are managing the merQato repository tracker.\n<tools>\n${tools}\n</tools>\n\nExecute a tool by POSTing JSON arguments to ${baseUrl}/api/agents/call/<tool-name>.`;
}

export const Route = createFileRoute("/api/agents/tools")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const format = new URL(request.url).searchParams.get("format") ?? "mcp";
        const baseUrl = publicBaseUrl(request);
        const body =
          format === "openai" || format === "ollama"
            ? { format, tools: openAiTools() }
            : format === "hermes"
              ? { format, systemPrompt: hermesPrompt(baseUrl), tools: openAiTools() }
              : { format: "mcp", tools: toolDefinitions };
        return new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});
