export type {
  CheckResult,
  CheckSeverity,
  ConnectTarget,
  DoctorReport,
  PermissionManifest,
} from "./types.js";
export { runDoctor } from "./runner.js";
export {
  buildTargetFromCli,
  connectToTarget,
  parseStdioCommand,
} from "./connect/client.js";
export {
  printTerminalReport,
  reportToJson,
  reportToMarkdown,
  exitCodeForReport,
} from "./reporters/terminal.js";
export { reportToHtml } from "./reporters/html.js";
export { buildPermissionManifest } from "./checks/protocol.js";
