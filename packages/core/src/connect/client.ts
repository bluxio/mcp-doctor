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
    headers[item.slice(0, idx).trim()] = item.slice(idx + 1).trim();
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
  if (tokens.length === 0) throw new Error("stdio command is empty");
  return { command: tokens[0]!, args: tokens.slice(1) };
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function connectToTarget(
  target: ConnectTarget,
): Promise<ConnectedClient> {
  const timeoutMs = target.timeoutMs ?? 20_000;

  if (target.kind === "stdio") {
    if (!target.command) throw new Error("stdio target requires a command");
    const transport = new StdioClientTransport({
      command: target.command,
      args: target.args ?? [],
      stderr: "pipe",
    });
    const client = new Client({ name: "mcp-doctor", version: "0.2.0" });
    await withTimeout(client.connect(transport), timeoutMs, "stdio connect");
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  }

  if (!target.url) throw new Error("url target requires a URL");
  const url = new URL(target.url);
  const opts =
    target.headers && Object.keys(target.headers).length > 0
      ? { requestInit: { headers: target.headers } }
      : undefined;

  try {
    const client = new Client({ name: "mcp-doctor", version: "0.2.0" });
    const transport = new StreamableHTTPClientTransport(url, opts);
    await withTimeout(
      client.connect(transport),
      timeoutMs,
      "streamable HTTP connect",
    );
    return {
      client,
      close: async () => {
        await client.close();
      },
    };
  } catch {
    const client = new Client({ name: "mcp-doctor", version: "0.2.0" });
    const transport = new SSEClientTransport(url, opts);
    await withTimeout(client.connect(transport), timeoutMs, "SSE connect");
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
  timeout?: string;
}): ConnectTarget {
  if (opts.stdio && opts.url) {
    throw new Error("Pass either --stdio or --url, not both");
  }
  if (!opts.stdio && !opts.url) {
    throw new Error('Pass --stdio "command" or --url https://...');
  }
  const timeoutMs = opts.timeout ? Number(opts.timeout) : undefined;
  if (timeoutMs != null && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new Error("--timeout must be a positive number (ms)");
  }
  if (opts.stdio) {
    const { command, args } = parseStdioCommand(opts.stdio);
    return {
      kind: "stdio",
      label: opts.stdio,
      command,
      args,
      timeoutMs,
    };
  }
  return {
    kind: "url",
    label: opts.url!,
    url: opts.url!,
    headers: parseHeaders(opts.header),
    timeoutMs,
  };
}
