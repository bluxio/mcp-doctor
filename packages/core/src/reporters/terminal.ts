import chalk from "chalk";
import type { CheckResult, DoctorReport } from "../types.js";

function icon(severity: CheckResult["severity"]): string {
  switch (severity) {
    case "pass":
      return chalk.green("PASS");
    case "warn":
      return chalk.yellow("WARN");
    case "fail":
      return chalk.red("FAIL");
    case "skip":
      return chalk.gray("SKIP");
  }
}

export function printTerminalReport(report: DoctorReport): void {
  console.log("");
  console.log(chalk.bold("MCP Doctor"));
  console.log(chalk.dim(`Target: ${report.target}`));
  if (report.server?.name) {
    console.log(
      chalk.dim(`Server: ${report.server.name}@${report.server.version ?? "?"}`),
    );
  }
  console.log(chalk.dim(`Duration: ${report.durationMs}ms`));
  console.log("");

  for (const check of report.checks) {
    const timing =
      check.durationMs != null ? chalk.dim(` (${check.durationMs}ms)`) : "";
    console.log(`${icon(check.severity)}  ${check.title}${timing}`);
    console.log(`      ${check.detail}`);
  }

  if (report.permissionManifest?.tools.length) {
    console.log("");
    console.log(chalk.bold("Permission manifest"));
    for (const tool of report.permissionManifest.tools) {
      const color =
        tool.risk === "high"
          ? chalk.red
          : tool.risk === "medium"
            ? chalk.yellow
            : chalk.green;
      console.log(`  ${color(tool.risk.toUpperCase().padEnd(6))} ${tool.name}`);
    }
  }

  console.log("");
  console.log(
    chalk.bold("Summary: ") +
      chalk.green(`${report.summary.pass} pass`) +
      " · " +
      chalk.yellow(`${report.summary.warn} warn`) +
      " · " +
      chalk.red(`${report.summary.fail} fail`) +
      " · " +
      chalk.gray(`${report.summary.skip} skip`),
  );
  console.log("");
}

export function reportToJson(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}

export function exitCodeForReport(report: DoctorReport): number {
  return report.summary.fail > 0 ? 1 : 0;
}

export function reportToMarkdown(report: DoctorReport): string {
  const lines = [
    `## MCP Doctor`,
    ``,
    `**Target:** \`${report.target}\``,
    report.server?.name
      ? `**Server:** ${report.server.name}@${report.server.version ?? "?"}`
      : null,
    `**Duration:** ${report.durationMs}ms`,
    ``,
    `| Status | Check | Detail |`,
    `| --- | --- | --- |`,
    ...report.checks.map(
      (c) =>
        `| ${c.severity.toUpperCase()} | ${c.title} | ${c.detail.replace(/\|/g, "\\|")} |`,
    ),
    ``,
    `**Summary:** ${report.summary.pass} pass · ${report.summary.warn} warn · ${report.summary.fail} fail · ${report.summary.skip} skip`,
  ];
  return lines.filter((l) => l != null).join("\n");
}
