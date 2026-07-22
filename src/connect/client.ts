import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { ConnectTarget } from "../types.js";

export interface ConnectedClient {
  client: Client;
  close: () => Promise<void>;
}

function parseHeaders(raw?: string[]): Record<string, string> | undefined {
  if (!raw?.length) return undefined;
  const headers: Record<string, string> = {};
  for (const item of raw) {
    const idx = item.indexOf(":");
    if (idx === -1) {
      throw new Error(`Invalid header "${item}". Use Name: value`);
    }
    const key = item.slice(0, idx).trim();
    const value = item.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

export function parseStdioCommand(commandLine: string): {
  command: string;
  args: string[];
} {
  const parts = commandLine.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const tokens = parts.map((p) =>
    p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p,
  );
  if (tokens.length === 0) {
    throw new Error("stdio command is empty");
  }
  return { command: tokens[0]!, args: tokens.slice(1) };
}

export async function connectToTarget(
  target: ConnectTarget,
): Promise<ConnectedClient> {
  if (target.kind === "stdio") {
    if (!target.command) {
      throw new Error("stdio target requires a command");
    }
    const transport = new StdioClientTransport({
      command: target.command,
      args: target.args ?? [],
      stderr: "pipe",
    });
    const client = new Client({ name: "mcp-doctor", version: "0.1.0" });
    await client.connect(transport);
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  }

  if (!target.url) {
    throw new Error("url target requires a URL");
  }

  const url = new URL(target.url);
  const requestInit =
    target.headers && Object.keys(target.headers).length > 0
      ? { requestInit: { headers: target.headers } }
      : undefined;

  try {
    const client = new Client({ name: "mcp-doctor", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(url, requestInit);
    await client.connect(transport);
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  } catch {
    const client = new Client({ name: "mcp-doctor", version: "0.1.0" });
    const transport = new SSEClientTransport(url, requestInit);
    await client.connect(transport);
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  }
}

export function buildTargetFromCli(opts: {
  stdio?: string;
  url?: string;
  header?: string[];
}): ConnectTarget {
  if (opts.stdio && opts.url) {
    throw new Error("Pass either --stdio or --url, not both");
  }
  if (!opts.stdio && !opts.url) {
    throw new Error("Pass --stdio \"command\" or --url https://...");
  }
  if (opts.stdio) {
    const { command, args } = parseStdioCommand(opts.stdio);
    return {
      kind: "stdio",
      label: opts.stdio,
      command,
      args,
    };
  }
  return {
    kind: "url",
    label: opts.url!,
    url: opts.url!,
    headers: parseHeaders(opts.header),
  };
}
