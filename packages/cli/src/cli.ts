#!/usr/bin/env node
import { Command } from "commander";
import { writeFile } from "node:fs/promises";
import {
  buildTargetFromCli,
  connectToTarget,
  exitCodeForReport,
  printTerminalReport,
  reportToHtml,
  reportToJson,
  runDoctor,
} from "@mcp-doctor/core";

const program = new Command();

program
  .name("mcp-doctor")
  .description(
    "Audit MCP servers for handshake, schema quality, permissions, error handling, and latency",
  )
  .version("0.2.0")
  .option(
    "--stdio <command>",
    'Spawn a local MCP server, e.g. --stdio "npx -y @modelcontextprotocol/server-everything"',
  )
  .option("--url <url>", "Connect to a remote MCP endpoint URL")
  .option(
    "--header <name:value>",
    "HTTP header for --url (repeatable)",
    (value: string, previous: string[]) => [...previous, value],
    [] as string[],
  )
  .option("--timeout <ms>", "Connection timeout in milliseconds", "20000")
  .option("--json", "Print JSON report to stdout")
  .option("--html <file>", "Write HTML report to a file")
  .option("--out <file>", "Write JSON report to a file")
  .action(async (opts: {
    stdio?: string;
    url?: string;
    header: string[];
    timeout?: string;
    json?: boolean;
    html?: string;
    out?: string;
  }) => {
    let connected;
    try {
      const target = buildTargetFromCli(opts);
      connected = await connectToTarget(target);
      const report = await runDoctor(connected.client, target.label);

      if (opts.json) {
        console.log(reportToJson(report));
      } else {
        printTerminalReport(report);
      }

      if (opts.out) {
        await writeFile(opts.out, reportToJson(report), "utf8");
        if (!opts.json) console.log(`Wrote ${opts.out}`);
      }
      if (opts.html) {
        await writeFile(opts.html, reportToHtml(report), "utf8");
        if (!opts.json) console.log(`Wrote ${opts.html}`);
      }

      process.exitCode = exitCodeForReport(report);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 2;
    } finally {
      if (connected) {
        try {
          await connected.close();
        } catch {
          // ignore
        }
      }
    }
  });

await program.parseAsync(process.argv);
