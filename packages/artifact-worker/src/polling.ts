import type { Pool } from "pg";
export function startArtifactPolling(
  pool: Pool,
  run: () => Promise<boolean>,
  label: "Schema" | "Execution" | "Quality" | "Comparison" | "Analysis",
) {
  let stopping = false,
    running: Promise<void> | null = null,
    closing: Promise<void> | null = null;
  function pump() {
    if (stopping || running) return;
    running = run()
      .then(() => undefined)
      .catch(() => {
        console.error(`${label} scheduling failed`);
      })
      .finally(() => {
        running = null;
      });
  }
  const timer = setInterval(pump, 3000);
  pump();
  function close() {
    if (closing) return closing;
    stopping = true;
    clearInterval(timer);
    closing = (async () => {
      await running;
      await pool.end();
    })();
    return closing;
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      close().catch(() => {
        console.error(`${label} shutdown failed`);
        process.exitCode = 1;
      });
    });
  return { close };
}
