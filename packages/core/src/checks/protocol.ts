import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CheckResult, PermissionManifest } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function schemaLooksValid(schema: unknown): { ok: boolean; reason?: string } {
  if (schema == null) return { ok: false, reason: "missing inputSchema" };
  if (!isRecord(schema)) return { ok: false, reason: "inputSchema is not an object" };
  if (schema.type !== "object") {
    return { ok: false, reason: `expected type "object", got ${String(schema.type)}` };
  }
  if ("properties" in schema && schema.properties != null && !isRecord(schema.properties)) {
    return { ok: false, reason: "properties must be an object" };
  }
  return { ok: true };
}

function requiredArgs(schema: unknown): string[] {
  if (!isRecord(schema) || !Array.isArray(schema.required)) return [];
  return schema.required.filter((x): x is string => typeof x === "string");
}

const HIGH_RISK =
  /\b(exec|shell|sudo|delete|rm\b|drop|write|upload|payment|credential|secret|password|token|filesystem|file_write|run_command)\b/i;
const MED_RISK =
  /\b(email|send|http|fetch|request|browser|network|database|sql|deploy)\b/i;

export function buildPermissionManifest(
  tools: Array<{ name: string; description?: string; inputSchema?: unknown }>,
): PermissionManifest {
  return {
    generatedAt: new Date().toISOString(),
    tools: tools.map((tool) => {
      const blob = `${tool.name} ${tool.description ?? ""}`;
      const riskReasons: string[] = [];
      let risk: "low" | "medium" | "high" = "low";
      if (HIGH_RISK.test(blob)) {
        risk = "high";
        riskReasons.push("name/description suggests privileged or destructive action");
      } else if (MED_RISK.test(blob)) {
        risk = "medium";
        riskReasons.push("name/description suggests network or side-effecting action");
      }
      const req = requiredArgs(tool.inputSchema);
      if (req.some((a) => /path|file|cmd|command|url|sql/i.test(a))) {
        if (risk === "low") risk = "medium";
        riskReasons.push("required args look like paths/commands/URLs");
      }
      return {
        name: tool.name,
        description: tool.description,
        requiredArgs: req,
        risk,
        riskReasons,
      };
    }),
  };
}

export async function runHandshakeCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  try {
    const version = client.getServerVersion();
    const caps = client.getServerCapabilities();
    return {
      id: "handshake",
      title: "Initialize handshake",
      severity: "pass",
      detail: `Connected to ${version?.name ?? "unknown"}@${version?.version ?? "?"}`,
      durationMs: Date.now() - started,
      meta: { server: version, capabilities: caps },
    };
  } catch (error) {
    return {
      id: "handshake",
      title: "Initialize handshake",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function runPingCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  try {
    await client.ping();
    return {
      id: "ping",
      title: "Ping",
      severity: "pass",
      detail: "Server responded to ping",
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      id: "ping",
      title: "Ping",
      severity: "warn",
      detail: `Ping failed or unsupported: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - started,
    };
  }
}

export async function runToolsSchemaCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  try {
    const { tools } = await client.listTools();
    if (tools.length === 0) {
      return {
        id: "tools-schema",
        title: "Tool schema quality",
        severity: "warn",
        detail: "Server exposes 0 tools",
        durationMs: Date.now() - started,
        meta: { toolCount: 0 },
      };
    }

    const issues: string[] = [];
    for (const tool of tools) {
      if (!tool.name?.trim()) {
        issues.push("tool with empty name");
        continue;
      }
      if (!tool.description?.trim()) issues.push(`${tool.name}: missing description`);
      const schemaCheck = schemaLooksValid(tool.inputSchema);
      if (!schemaCheck.ok) issues.push(`${tool.name}: ${schemaCheck.reason}`);
    }

    if (issues.length === 0) {
      return {
        id: "tools-schema",
        title: "Tool schema quality",
        severity: "pass",
        detail: `${tools.length} tool(s) have usable schemas and descriptions`,
        durationMs: Date.now() - started,
        meta: { toolCount: tools.length, tools: tools.map((t) => t.name) },
      };
    }

    const failCount = issues.filter(
      (i) => i.includes("missing inputSchema") || i.includes("empty name"),
    ).length;

    return {
      id: "tools-schema",
      title: "Tool schema quality",
      severity: failCount > 0 ? "fail" : "warn",
      detail:
        issues.slice(0, 8).join("; ") +
        (issues.length > 8 ? ` (+${issues.length - 8} more)` : ""),
      durationMs: Date.now() - started,
      meta: { toolCount: tools.length, issues },
    };
  } catch (error) {
    return {
      id: "tools-schema",
      title: "Tool schema quality",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function runResourcesCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  const caps = client.getServerCapabilities();
  if (!caps?.resources) {
    return {
      id: "resources-list",
      title: "Resources listing",
      severity: "skip",
      detail: "Server does not advertise resources capability",
      durationMs: Date.now() - started,
    };
  }
  try {
    const { resources } = await client.listResources();
    return {
      id: "resources-list",
      title: "Resources listing",
      severity: "pass",
      detail: `Listed ${resources.length} resource(s)`,
      durationMs: Date.now() - started,
      meta: { count: resources.length },
    };
  } catch (error) {
    return {
      id: "resources-list",
      title: "Resources listing",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function runPromptsCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  const caps = client.getServerCapabilities();
  if (!caps?.prompts) {
    return {
      id: "prompts-list",
      title: "Prompts listing",
      severity: "skip",
      detail: "Server does not advertise prompts capability",
      durationMs: Date.now() - started,
    };
  }
  try {
    const { prompts } = await client.listPrompts();
    return {
      id: "prompts-list",
      title: "Prompts listing",
      severity: "pass",
      detail: `Listed ${prompts.length} prompt(s)`,
      durationMs: Date.now() - started,
      meta: { count: prompts.length },
    };
  } catch (error) {
    return {
      id: "prompts-list",
      title: "Prompts listing",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function runMalformedInputCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  try {
    const { tools } = await client.listTools();
    const candidates = tools.filter((tool) => requiredArgs(tool.inputSchema).length > 0);
    if (candidates.length === 0) {
      return {
        id: "malformed-input",
        title: "Malformed input handling",
        severity: "skip",
        detail: "No tools with required arguments to probe",
        durationMs: Date.now() - started,
      };
    }
    const tool = candidates[0]!;
    let threwOrErrored = false;
    let detail = "";
    try {
      const result = await client.callTool({ name: tool.name, arguments: {} });
      const isError = Boolean((result as { isError?: boolean }).isError);
      if (isError) {
        threwOrErrored = true;
        detail = `Tool ${tool.name} returned isError=true for empty required args`;
      } else {
        detail = `Tool ${tool.name} accepted empty args despite required fields`;
      }
    } catch (error) {
      threwOrErrored = true;
      detail = `Tool ${tool.name} rejected bad input: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
    return {
      id: "malformed-input",
      title: "Malformed input handling",
      severity: threwOrErrored ? "pass" : "warn",
      detail,
      durationMs: Date.now() - started,
      meta: { tool: tool.name },
    };
  } catch (error) {
    return {
      id: "malformed-input",
      title: "Malformed input handling",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}

export async function runLatencyCheck(client: Client): Promise<CheckResult> {
  const samples: number[] = [];
  try {
    for (let i = 0; i < 3; i++) {
      const started = Date.now();
      await client.listTools();
      samples.push(Date.now() - started);
    }
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    const max = Math.max(...samples);
    return {
      id: "latency",
      title: "listTools latency",
      severity: max > 3000 ? "warn" : "pass",
      detail: `avg ${avg}ms, max ${max}ms over 3 calls`,
      durationMs: avg,
      meta: { samples },
    };
  } catch (error) {
    return {
      id: "latency",
      title: "listTools latency",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runPermissionsCheck(client: Client): Promise<{
  check: CheckResult;
  manifest: PermissionManifest;
}> {
  const started = Date.now();
  const { tools } = await client.listTools();
  const manifest = buildPermissionManifest(tools);
  const high = manifest.tools.filter((t) => t.risk === "high");
  const medium = manifest.tools.filter((t) => t.risk === "medium");
  return {
    manifest,
    check: {
      id: "permissions",
      title: "Permission manifest",
      severity: high.length > 0 ? "warn" : "pass",
      detail:
        high.length > 0
          ? `${high.length} high-risk tool(s): ${high.map((t) => t.name).join(", ")}`
          : medium.length > 0
            ? `${medium.length} medium-risk tool(s); ${manifest.tools.length - medium.length} low`
            : `All ${manifest.tools.length} tool(s) look low-risk`,
      durationMs: Date.now() - started,
      meta: { high: high.length, medium: medium.length, low: manifest.tools.length - high.length - medium.length },
    },
  };
}

export async function runDuplicateNamesCheck(client: Client): Promise<CheckResult> {
  const started = Date.now();
  try {
    const { tools } = await client.listTools();
    const seen = new Map<string, number>();
    for (const t of tools) {
      seen.set(t.name, (seen.get(t.name) ?? 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name);
    return {
      id: "duplicate-tools",
      title: "Duplicate tool names",
      severity: dupes.length ? "fail" : "pass",
      detail: dupes.length
        ? `Duplicate tool names: ${dupes.join(", ")}`
        : "All tool names are unique",
      durationMs: Date.now() - started,
      meta: { duplicates: dupes },
    };
  } catch (error) {
    return {
      id: "duplicate-tools",
      title: "Duplicate tool names",
      severity: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    };
  }
}
