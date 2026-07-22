import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CheckResult, DoctorReport } from "./types.js";
import {
  runDuplicateNamesCheck,
  runHandshakeCheck,
  runLatencyCheck,
  runMalformedInputCheck,
  runPermissionsCheck,
  runPingCheck,
  runPromptsCheck,
  runResourcesCheck,
  runToolsSchemaCheck,
} from "./checks/protocol.js";

function summarize(checks: CheckResult[]): DoctorReport["summary"] {
  return {
    pass: checks.filter((c) => c.severity === "pass").length,
    warn: checks.filter((c) => c.severity === "warn").length,
    fail: checks.filter((c) => c.severity === "fail").length,
    skip: checks.filter((c) => c.severity === "skip").length,
  };
}

export async function runDoctor(
  client: Client,
  targetLabel: string,
): Promise<DoctorReport> {
  const startedAt = new Date();
  const checks: CheckResult[] = [];

  checks.push(await runHandshakeCheck(client));
  checks.push(await runPingCheck(client));
  checks.push(await runToolsSchemaCheck(client));
  checks.push(await runDuplicateNamesCheck(client));
  checks.push(await runResourcesCheck(client));
  checks.push(await runPromptsCheck(client));
  checks.push(await runMalformedInputCheck(client));
  checks.push(await runLatencyCheck(client));

  const { check: permCheck, manifest } = await runPermissionsCheck(client);
  checks.push(permCheck);

  const finishedAt = new Date();
  const version = client.getServerVersion();
  const capabilities = client.getServerCapabilities();

  return {
    target: targetLabel,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    server: {
      name: version?.name,
      version: version?.version,
      capabilities: capabilities as Record<string, unknown> | undefined,
    },
    summary: summarize(checks),
    checks,
    permissionManifest: manifest,
  };
}
