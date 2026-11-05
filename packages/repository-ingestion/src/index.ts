import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readArchive } from "./parser.js";
import { exclusionPredicate } from "./exclusions.js";

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
function compareFiles(a: InventoryFile, b: InventoryFile) {
  if (a.path < b.path) return -1;
  if (a.path > b.path) return 1;
  return 0;
}
async function writeBatch(
  batch: [string, Buffer][],
  directory: string,
  deadline: number,
  files: InventoryFile[],
) {
  const results = await Promise.allSettled(
    batch.map(async ([path, content]) => {
      if (Date.now() > deadline)
        throw new Error("Repository extraction timed out");
      const destination = join(directory, path);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await writeFile(destination, content, { flag: "wx", mode: 0o600 });
      files.push({
        path,
        bytes: content.byteLength,
        sha256: createHash("sha256").update(content).digest("hex"),
      });
    }),
  );
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
async function writeInventory(
  entries: Map<string, Buffer>,
  directory: string,
  options: IngestionOptions,
  deadline: number,
) {
  const excluded = exclusionPredicate(entries, options);
  const selected = [...entries].filter(([path]) => !excluded(path));
  const batches = Array.from(
    { length: Math.ceil(selected.length / 8) },
    (_, index) => selected.slice(index * 8, index * 8 + 8),
  );
  const files: InventoryFile[] = [];
  await batches.reduce(
    (previous, batch) =>
      previous.then(() => writeBatch(batch, directory, deadline, files)),
    Promise.resolve(),
  );
  return files.sort(compareFiles);
}
export async function withRepositoryArchive<T>(
  archive: Buffer,
  options: IngestionOptions,
  consume: (directory: string, inventory: RepositoryInventory) => Promise<T>,
): Promise<T> {
  if (archive.byteLength > 25 * 1024 * 1024)
    throw new Error("Archive exceeds 25 MiB");
  const directory = await mkdtemp(join(tmpdir(), "codaryn-ingestion-"));
  const source = join(directory, "source");
  try {
    await writeFile(join(directory, "source.tgz"), archive, {
      mode: 0o600,
      flag: "wx",
    });
    await mkdir(source, { mode: 0o700 });
    const deadline = Date.now() + 90000;
    const entries = await readArchive(archive);
    const files = await writeInventory(entries, source, options, deadline);
    const packageRoots = files
      .filter(
        (file) =>
          file.path === "package.json" || file.path.endsWith("/package.json"),
      )
      .map((file) =>
        file.path === "package.json" ? "." : file.path.slice(0, -13),
      );
    return await consume(source, {
      files,
      packageRoots,
      monorepo:
        packageRoots.length > 1 ||
        files.some((file) => file.path === "pnpm-workspace.yaml"),
      archiveSha256: createHash("sha256").update(archive).digest("hex"),
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export { exclusionPredicate } from "./exclusions.js";
