"use client";

import type { DoctorReport } from "@mcp-doctor/core";
import styles from "./report-view.module.css";

const severityClass: Record<string, string> = {
  pass: styles.pass,
  warn: styles.warn,
  fail: styles.fail,
  skip: styles.skip,
};

export function ReportView({ report }: { report: DoctorReport }) {
  return (
    <section className={styles.report}>
      <div className={styles.head}>
        <div>
          <h2>Report</h2>
          <p className={styles.meta}>
            {report.server?.name
              ? `${report.server.name}@${report.server.version ?? "?"}`
              : report.target}
            {" · "}
            {report.durationMs}ms
          </p>
        </div>
        <div className={styles.summary}>
          <span className={styles.pass}>{report.summary.pass} pass</span>
          <span className={styles.warn}>{report.summary.warn} warn</span>
          <span className={styles.fail}>{report.summary.fail} fail</span>
          <span className={styles.skip}>{report.summary.skip} skip</span>
        </div>
      </div>

      <ul className={styles.checks}>
        {report.checks.map((check) => (
          <li key={check.id} className={styles.check}>
            <span className={`${styles.badge} ${severityClass[check.severity]}`}>
              {check.severity}
            </span>
            <div>
              <strong>{check.title}</strong>
              <p>{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {report.permissionManifest?.tools.length ? (
        <div className={styles.perms}>
          <h3>Permission manifest</h3>
          <ul>
            {report.permissionManifest.tools.map((tool) => (
              <li key={tool.name}>
                <span className={severityClass[tool.risk === "high" ? "fail" : tool.risk === "medium" ? "warn" : "pass"]}>
                  {tool.risk}
                </span>{" "}
                <code>{tool.name}</code>
                {tool.riskReasons.length
                  ? ` — ${tool.riskReasons.join("; ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
