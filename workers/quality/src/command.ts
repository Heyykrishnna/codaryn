import { spawn } from "node:child_process";
import { isAbsolute, basename } from "node:path";
export type ScannerCommand = (
  binary: string,
  args: string[],
  cwd: string,
  home: string,
) => Promise<string>;
export const runScannerCommand: ScannerCommand = (binary, args, cwd, home) => {
  if (
    !isAbsolute(binary) ||
    !["semgrep", "osv-scanner"].includes(basename(binary)) ||
    !["linux", "darwin"].includes(process.platform)
  )
    return Promise.reject(new Error("Scanner executable is unavailable"));
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: home,
        SEMGREP_SEND_METRICS: "off",
        SEMGREP_ENABLE_VERSION_CHECK: "0",
      },
    });
    const chunks: Buffer[] = [];
    let total = 0,
      done = false;
    function terminate() {
      if (!child.pid) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (!(
          error instanceof Error &&
          "code" in error &&
          error.code === "ESRCH"
        ))
          reject(new Error("Scanner process cleanup failed"));
      }
    }
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      terminate();
      reject(new Error("Scanner time limit exceeded"));
    }, 45000);
    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > 5 * 1024 * 1024) {
        done = true;
        terminate();
        reject(new Error("Scanner output limit exceeded"));
        return;
      }
      if (!done) chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > 5 * 1024 * 1024) {
        done = true;
        terminate();
        reject(new Error("Scanner output limit exceeded"));
      }
    });
    child.once("error", () => {
      clearTimeout(timer);
      if (done) return;
      done = true;
      reject(new Error("Scanner failed to start"));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      terminate();
      if (done) return;
      done = true;
      if (code !== 0 && code !== 1) {
        reject(new Error("Scanner did not complete"));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
};
