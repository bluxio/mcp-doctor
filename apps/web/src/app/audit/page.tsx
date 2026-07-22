import Link from "next/link";
import { AuditWorkspace } from "@/components/audit-workspace";
import styles from "./audit.module.css";

export default function AuditPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand}>
          MCP Doctor
        </Link>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>Live audit</h1>
          <p>
            Point at a remote MCP URL, or run the built-in fixture demo. The
            server-side engine is the same one the CLI uses.
          </p>
        </div>
        <AuditWorkspace />
      </main>
    </div>
  );
}
