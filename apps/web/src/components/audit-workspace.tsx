"use client";

import { useState, useTransition } from "react";
import type { DoctorReport } from "@mcp-doctor/core";
import { ReportView } from "./report-view";
import styles from "./audit-workspace.module.css";

type Mode = "demo" | "url";

export function AuditWorkspace() {
  const [mode, setMode] = useState<Mode>("demo");
  const [url, setUrl] = useState("");
  const [header, setHeader] = useState("");
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            url: mode === "url" ? url : undefined,
            header: mode === "url" && header.trim() ? header.trim() : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setReport(null);
          setError(data.error ?? "Audit failed");
          return;
        }
        setReport(data.report as DoctorReport);
      } catch (err) {
        setReport(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === "demo" ? styles.tabActive : styles.tab}
            onClick={() => setMode("demo")}
          >
            Demo fixture
          </button>
          <button
            type="button"
            className={mode === "url" ? styles.tabActive : styles.tab}
            onClick={() => setMode("url")}
          >
            Remote URL
          </button>
        </div>

        {mode === "demo" ? (
          <p className={styles.hint}>
            Runs the bundled fixture server — includes an intentional missing
            tool description so you can see a WARN.
          </p>
        ) : (
          <div className={styles.fields}>
            <label>
              MCP endpoint URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/mcp"
                autoComplete="off"
              />
            </label>
            <label>
              Optional header
              <input
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="Authorization: Bearer …"
                autoComplete="off"
              />
            </label>
          </div>
        )}

        <button
          type="button"
          className={styles.run}
          onClick={run}
          disabled={pending || (mode === "url" && !url.trim())}
        >
          {pending ? "Auditing…" : "Run audit"}
        </button>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      {report ? <ReportView report={report} /> : null}
    </div>
  );
}
