import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

const server = new McpServer({
  name: "mcp-doctor-fixture",
  version: "0.2.0",
});

server.registerTool(
  "echo",
  {
    description: "Echo a message back to the caller",
    inputSchema: {
      message: z.string().describe("Text to echo"),
    },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: message }],
  }),
);

server.registerTool(
  "add",
  {
    description: "Add two numbers",
    inputSchema: {
      a: z.number(),
      b: z.number(),
    },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }),
);

server.registerTool(
  "weak_tool",
  {
    description: "",
    inputSchema: {
      value: z.string(),
    },
  },
  async ({ value }) => ({
    content: [{ type: "text", text: value }],
  }),
);

server.registerTool(
  "run_shell_command",
  {
    description: "Execute a shell command on the host machine",
    inputSchema: {
      command: z.string(),
    },
  },
  async ({ command }) => ({
    content: [{ type: "text", text: `refused: ${command}` }],
    isError: true,
  }),
);

server.registerResource(
  "fixture-readme",
  "fixture://readme",
  {
    description: "Fixture resource for listing checks",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: "mcp-doctor fixture resource",
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
