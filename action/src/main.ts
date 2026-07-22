import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  buildTargetFromCli,
  connectToTarget,
  exitCodeForReport,
  reportToMarkdown,
  runDoctor,
} from "@mcp-doctor/core";

async function main() {
  const stdio = core.getInput("stdio");
  const url = core.getInput("url");
  const header = core.getInput("header");
  const failOnWarn = core.getBooleanInput("fail-on-warn");

  if (!stdio && !url) {
    throw new Error("Provide either 'stdio' or 'url' input");
  }

  const target = buildTargetFromCli({
    stdio: stdio || undefined,
    url: url || undefined,
    header: header ? [header] : [],
    timeout: "30000",
  });

  const connected = await connectToTarget(target);
  try {
    const report = await runDoctor(connected.client, target.label);
    const md = reportToMarkdown(report);
    core.setOutput("summary", md);
    core.setOutput("fail-count", String(report.summary.fail));
    core.setOutput("warn-count", String(report.summary.warn));

    const token = process.env.GITHUB_TOKEN;
    if (token && github.context.payload.pull_request) {
      const octokit = github.getOctokit(token);
      await octokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.payload.pull_request.number,
        body: md,
      });
    }

    if (report.summary.fail > 0 || (failOnWarn && report.summary.warn > 0)) {
      core.setFailed(
        `MCP Doctor found ${report.summary.fail} fail(s) and ${report.summary.warn} warn(s)`,
      );
      process.exitCode = exitCodeForReport(report);
      return;
    }

    core.info(md);
  } finally {
    await connected.close();
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
