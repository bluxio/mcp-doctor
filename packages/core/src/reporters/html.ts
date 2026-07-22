import type { DoctorReport } from "../types.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COLORS: Record<string, string> = {
  pass: "#1f8a4c",
  warn: "#b7791f",
  fail: "#c53030",
  skip: "#718096",
};

export function reportToHtml(report: DoctorReport): string {
  const rows = report.checks
    .map((c) => {
      const color = COLORS[c.severity] ?? "#333";
      return `<tr>
        <td><span class="badge" style="background:${color}">${esc(c.severity.toUpperCase())}</span></td>
        <td>${esc(c.title)}</td>
        <td>${esc(c.detail)}</td>
        <td class="muted">${c.durationMs != null ? `${c.durationMs}ms` : "—"}</td>
      </tr>`;
    })
    .join("\n");

  const perm =
    report.permissionManifest?.tools
      .map(
        (t) =>
          `<li><strong style="color:${COLORS[t.risk === "high" ? "fail" : t.risk === "medium" ? "warn" : "pass"]}">${esc(t.risk)}</strong> ${esc(t.name)}${t.riskReasons.length ? ` — ${esc(t.riskReasons.join("; "))}` : ""}</li>`,
      )
      .join("") ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MCP Doctor Report</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; margin: 0; background: #eef2f6; color: #0f172a; }
    .wrap { max-width: 920px; margin: 0 auto; padding: 48px 24px 80px; }
    h1 { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 28px; margin: 0 0 8px; letter-spacing: -0.03em; }
    .meta { color: #475569; margin-bottom: 28px; line-height: 1.5; }
    .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
    .pill { padding: 8px 12px; border-radius: 8px; background: #fff; border: 1px solid #cbd5e1; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #cbd5e1; }
    th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 14px; }
    th { background: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    .badge { color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; }
    .muted { color: #888; white-space: nowrap; }
    h2 { margin-top: 36px; font-size: 18px; }
    ul { line-height: 1.7; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>MCP Doctor</h1>
    <div class="meta">
      <div><strong>Target:</strong> ${esc(report.target)}</div>
      ${report.server?.name ? `<div><strong>Server:</strong> ${esc(report.server.name)}@${esc(report.server.version ?? "?")}</div>` : ""}
      <div><strong>Duration:</strong> ${report.durationMs}ms · ${esc(report.finishedAt)}</div>
    </div>
    <div class="summary">
      <div class="pill" style="color:${COLORS.pass}">${report.summary.pass} pass</div>
      <div class="pill" style="color:${COLORS.warn}">${report.summary.warn} warn</div>
      <div class="pill" style="color:${COLORS.fail}">${report.summary.fail} fail</div>
      <div class="pill" style="color:${COLORS.skip}">${report.summary.skip} skip</div>
    </div>
    <table>
      <thead><tr><th>Status</th><th>Check</th><th>Detail</th><th>Time</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${perm ? `<h2>Permission manifest</h2><ul>${perm}</ul>` : ""}
  </div>
</body>
</html>`;
}
