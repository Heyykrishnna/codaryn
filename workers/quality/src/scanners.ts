import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import type { QualitySnapshot } from "@codaryn/contracts";
import {
  importSemgrep,
  importOsv,
  lookupOsv,
} from "@codaryn/engineering-analyzer";
import { runScannerCommand, type ScannerCommand } from "./command.js";
export interface ScannerOptions {
  semgrepBinary?: string;
  osvBinary?: string;
  allowOsv: boolean;
  command?: ScannerCommand;
  request?: typeof fetch;
}
function failed(
  snapshot: QualitySnapshot,
  tool: "semgrep" | "osv",
  message: string,
) {
  const i = snapshot.scanners.findIndex((status) => status.tool === tool);
  snapshot.scanners[i] = {
    tool,
    status: "failed",
    message,
    checkedAt: new Date().toISOString(),
    version: "configured-cli",
  };
}
async function curated<T>(
  files: Record<string, string>,
  onlyLocks: boolean,
  consume: (
    source: string,
    home: string,
    root: string,
    paths: string[],
  ) => Promise<T>,
) {
  const root = await mkdtemp(join(tmpdir(), "codaryn-quality-")),
    source = join(root, "source"),
    home = join(root, "home");
  try {
    await mkdir(source, { mode: 0o700 });
    await mkdir(home, { mode: 0o700 });
    const entries = Object.entries(files).filter(([path]) =>
      onlyLocks
        ? path.endsWith("pnpm-lock.yaml") || path.endsWith("package-lock.json")
        : /\.[cm]?[jt]sx?$/.test(path),
    );
    async function* batches() {
      for (let offset = 0; offset < entries.length; offset += 8)
        yield Promise.allSettled(
          entries.slice(offset, offset + 8).map(async ([path, text]) => {
            if (
              path.length > 1024 ||
              isAbsolute(path) ||
              path.includes("\\") ||
              path.includes("\0") ||
              path.split("/").includes("..")
            )
              throw new Error("Unsafe scan source path");
            const target = join(source, path);
            await mkdir(join(target, ".."), { recursive: true, mode: 0o700 });
            await writeFile(target, text, { mode: 0o600, flag: "wx" });
          }),
        );
    }
    for await (const batch of batches())
      if (batch.some((item) => item.status === "rejected"))
        throw new Error("Scanner source preparation failed");
    return await consume(
      source,
      home,
      root,
      entries.map(([path]) => join(source, path)),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
export async function runConfiguredScanners(
  files: Record<string, string>,
  snapshot: QualitySnapshot,
  external: boolean,
  options: ScannerOptions,
) {
  const command = options.command ?? runScannerCommand;
  if (options.semgrepBinary) {
    try {
      await curated(files, false, async (source, home, root) => {
        const rules = await readFile(
            new URL("../rules/semgrep.yml", import.meta.url),
            "utf8",
          ),
          config = join(root, "trusted-rules.yml");
        await writeFile(config, rules, { mode: 0o600, flag: "wx" });
        const raw = await command(
          options.semgrepBinary!,
          [
            "scan",
            "--config",
            config,
            "--json",
            "--metrics",
            "off",
            "--disable-version-check",
            "--disable-nosem",
            "--no-git-ignore",
            "--jobs",
            "1",
            "--max-memory",
            "256",
            "--max-target-bytes",
            "2097152",
            "--timeout",
            "5",
            "--timeout-threshold",
            "1",
            source,
          ],
          source,
          home,
        );
        const parsed: unknown = JSON.parse(raw);
        importSemgrep(parsed, files, snapshot);
      });
    } catch {
      failed(
        snapshot,
        "semgrep",
        "Configured Semgrep scan failed or returned unsupported output; no clean result is asserted.",
      );
    }
  }
  if (!external || !options.allowOsv) return;
  if (!options.osvBinary) {
    await lookupOsv(snapshot, options.request);
    return;
  }
  try {
    await curated(files, true, async (source, home, root, paths) => {
      if (!paths.length) return;
      const config = join(root, "trusted-osv.toml");
      await writeFile(config, "", { mode: 0o600, flag: "wx" });
      const raw = await command(
        options.osvBinary!,
        [
          "scan",
          "source",
          "--format=json",
          "--all-packages",
          "--config",
          config,
          "--no-resolve",
          "--no-call-analysis=go",
          ...paths.slice(0, 20).map((path) => `--lockfile=:${path}`),
        ],
        source,
        home,
      );
      const parsed: unknown = JSON.parse(raw);
      importOsv(parsed, files, snapshot);
    });
  } catch {
    failed(
      snapshot,
      "osv",
      "Configured OSV-Scanner failed or returned unsupported output; no clean result is asserted.",
    );
  }
}
