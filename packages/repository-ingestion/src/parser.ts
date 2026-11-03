import { gunzipSync } from "node:zlib";
import { Parser, type ReadEntry } from "tar";
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

class ArchiveCollector {
  readonly entries = new Map<string, Buffer>();
  private readonly seen = new Set<string>();
  private root: string | undefined;
  private bytes = 0;
  private count = 0;
  collect(entry: ReadEntry, parser: Parser) {
    const parts = safePath(entry.path);
    if (this.root && parts[0] !== this.root)
      throw new Error("Archive must have a single root directory");
    this.root = parts[0];
    if (entry.type !== "File" && entry.type !== "Directory")
      throw new Error("Archive links and special files are not allowed");
    if (++this.count > 10000) throw new Error("Archive has too many entries");
    if (entry.type === "Directory") {
      entry.resume();
      return;
    }
    const path = parts.slice(1).join("/");
    if (!path || this.seen.has(path))
      throw new Error("Archive has duplicate or invalid file paths");
    this.seen.add(path);
    this.bytes += entry.size;
    if (
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      entry.size > MAX_FILE ||
      this.bytes > MAX_TOTAL
    )
      throw new Error("Archive exceeds extraction limits");
    this.readFile(entry, parser, path);
  }
  private readFile(entry: ReadEntry, parser: Parser, path: string) {
    const chunks: Buffer[] = [];
    let received = 0;
    entry.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > entry.size || received > MAX_FILE)
        parser.abort(new Error("Invalid archive entry size"));
      else chunks.push(chunk);
    });
    entry.on("error", (error: unknown) =>
      parser.abort(
        error instanceof Error ? error : new Error("Archive read failed"),
      ),
    );
    entry.on("end", () => {
      if (received !== entry.size)
        parser.abort(new Error("Truncated archive entry"));
      else this.entries.set(path, Buffer.concat(chunks));
    });
  }
}
export async function readArchive(archive: Buffer) {
  const collector = new ArchiveCollector();
  await new Promise<void>((resolve, reject) => {
    const parser = new Parser({ strict: true, maxMetaEntrySize: 1024 * 1024 });
    parser.on("error", reject);
    parser.on("end", resolve);
    parser.on("entry", (entry) => {
      try {
        collector.collect(entry, parser);
      } catch (error) {
        parser.abort(
          error instanceof Error ? error : new Error("Invalid archive"),
        );
        entry.resume();
      }
    });
    parser.end(gunzipSync(archive, { maxOutputLength: 64 * 1024 * 1024 }));
  });
  if (!collector.entries.size)
    throw new Error("Archive contains no source files");
  return collector.entries;
}
