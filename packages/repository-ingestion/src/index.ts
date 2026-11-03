import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Parser } from "tar";
import ignore from "ignore";

export interface InventoryFile {
  path: string;
  bytes: number;
  sha256: string;
}
export interface RepositoryInventory {
  files: InventoryFile[];
  packageRoots: string[];
  monorepo: boolean;
  archiveSha256: string;
}
export interface IngestionOptions {
  excludes?: string[];
  respectGitignore?: boolean;
}
const MAX_FILE = 2 * 1024 * 1024;
const MAX_TOTAL = 50 * 1024 * 1024;

function safePath(path: string) {
  if (path.length > 512 || /[\\\x00-\x1f:]/.test(path) || path.startsWith("/"))
    throw new Error("Unsafe archive path");
  const parts = path.replace(/\/$/, "").split("/");
  if (
    parts.length > 32 ||
    parts.some((part) => !part || part === "." || part === "..")
  )
    throw new Error("Unsafe archive path");
  return parts;
}

export async function withRepositoryArchive<T>(
  archive: Buffer,
  options: IngestionOptions,
  consume: (directory: string, inventory: RepositoryInventory) => Promise<T>,
): Promise<T> {
  if (archive.byteLength > 25 * 1024 * 1024)
    throw new Error("Archive exceeds 25 MiB");
  const directory = await mkdtemp(join(tmpdir(), "codaryn-ingestion-"));
  const archiveFile = join(directory, "source.tgz");
  const sourceDirectory = join(directory, "source");
  try {
    await writeFile(archiveFile, archive, { mode: 0o600, flag: "wx" });
    await mkdir(sourceDirectory, { mode: 0o700 });
    const deadline = Date.now() + 90000;
    const entries = new Map<string, Buffer>();
    const seen = new Set<string>();
    let root: string | undefined;
    let bytes = 0;
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      const parser = new Parser({
        strict: true,
        maxMetaEntrySize: 1024 * 1024,
      });
      parser.on("error", reject);
      parser.on("end", resolve);
      parser.on("entry", (entry) => {
        try {
          const parts = safePath(entry.path);
          if (root && parts[0] !== root)
            throw new Error("Archive must have a single root directory");
          root = parts[0];
          if (entry.type !== "File" && entry.type !== "Directory")
            throw new Error("Archive links and special files are not allowed");
          if (++count > 10000) throw new Error("Archive has too many entries");
          if (entry.type === "Directory") {
            entry.resume();
            return;
          }
          const path = parts.slice(1).join("/");
          if (!path || seen.has(path))
            throw new Error("Archive has duplicate or invalid file paths");
          seen.add(path);
          if (
            !Number.isSafeInteger(entry.size) ||
            entry.size < 0 ||
            entry.size > MAX_FILE ||
            (bytes += entry.size) > MAX_TOTAL
          )
            throw new Error("Archive exceeds extraction limits");
          const chunks: Buffer[] = [];
          let received = 0;
          entry.on("data", (chunk: Buffer) => {
            received += chunk.length;
            if (received > entry.size || received > MAX_FILE)
              parser.abort(new Error("Invalid archive entry size"));
            else chunks.push(chunk);
          });
          entry.on("error", (error: Error) => parser.abort(error));
          entry.on("end", () => {
            if (received !== entry.size)
              parser.abort(new Error("Truncated archive entry"));
            else entries.set(path, Buffer.concat(chunks));
          });
        } catch (error) {
          parser.abort(
            error instanceof Error ? error : new Error("Invalid archive"),
          );
          entry.resume();
        }
      });
      parser.end(gunzipSync(archive, { maxOutputLength: 64 * 1024 * 1024 }));
    });
    if (!root || !entries.size)
      throw new Error("Archive contains no source files");
    const rules = ignore().add([
      ".git/",
      "node_modules/",
      "vendor/",
      "dist/",
      "build/",
      "coverage/",
      ...(options.excludes ?? []),
    ]);
    const ignores: {
      base: string;
      rules: ReturnType<typeof ignore>;
    }[] = [];
    let ignoreBytes = 0;
    let ignoreLines = 0;
    if (options.respectGitignore !== false)
      for (const [path, content] of entries) {
        if (path === ".gitignore" || path.endsWith("/.gitignore")) {
          if (content.length > 65536)
            throw new Error("Ignore file exceeds 64 KiB");
          ignoreBytes += content.length;
          ignoreLines += content.toString("utf8").split("\n").length;
          if (
            ignores.length >= 100 ||
            ignoreBytes > 262144 ||
            ignoreLines > 2000
          )
            throw new Error("Repository ignore rules exceed supported limits");
          ignores.push({
            base: path === ".gitignore" ? "" : path.slice(0, -10),
            rules: ignore().add(content.toString("utf8")),
          });
        }
      }
    ignores.sort((a, b) => a.base.length - b.base.length);
    const files: InventoryFile[] = [];
    for (const [path, content] of entries) {
      if (Date.now() > deadline)
        throw new Error("Repository extraction timed out");
      if (rules.ignores(path)) continue;
      let excluded = false;
      for (const rule of ignores) {
        if (!path.startsWith(rule.base)) continue;
        const relative = path.slice(rule.base.length);
        const parts = relative.split("/");
        let parentExcluded = false;
        for (let index = 1; index < parts.length; index++)
          if (rule.rules.ignores(parts.slice(0, index).join("/") + "/")) {
            parentExcluded = true;
            break;
          }
        if (parentExcluded) {
          excluded = true;
          break;
        }
        const result = rule.rules.test(relative);
        if (result.ignored) excluded = true;
        else if (result.unignored) excluded = false;
      }
      if (excluded) continue;
      const destination = join(sourceDirectory, path);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await writeFile(destination, content, { flag: "wx", mode: 0o600 });
      files.push({
        path,
        bytes: content.byteLength,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }
    files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    const packageRoots = files
      .filter(
        (file) =>
          file.path === "package.json" || file.path.endsWith("/package.json"),
      )
      .map((file) =>
        file.path === "package.json" ? "." : file.path.slice(0, -13),
      );
    const inventory = {
      files,
      packageRoots,
      monorepo:
        packageRoots.length > 1 ||
        files.some((file) => file.path === "pnpm-workspace.yaml"),
      archiveSha256: createHash("sha256").update(archive).digest("hex"),
    };
    return await consume(sourceDirectory, inventory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
