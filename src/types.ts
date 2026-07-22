export type CheckSeverity = "pass" | "warn" | "fail" | "skip";

export interface CheckResult {
  id: string;
  title: string;
  severity: CheckSeverity;
  detail: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface DoctorReport {
  target: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  server?: {
    name?: string;
    version?: string;
    protocolVersion?: string;
    capabilities?: Record<string, unknown>;
  };
  summary: {
    pass: number;
    warn: number;
    fail: number;
    skip: number;
  };
  checks: CheckResult[];
}

export interface ConnectTarget {
  kind: "stdio" | "url";
  label: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}
