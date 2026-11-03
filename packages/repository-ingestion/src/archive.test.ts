import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  mkdtemp,
  writeFile,
  mkdir,
  readFile,
  symlink,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create, Header } from "tar";
import { gzipSync } from "node:zlib";
import { withRepositoryArchive } from "./index.js";

test("inventory is deterministic, ignores dependencies, and cleans up on success and failure", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codaryn-fixture-"));
  let extracted = "";
  try {
    await mkdir(join(directory, "repo/node_modules"), { recursive: true });
    await writeFile(join(directory, "repo/package.json"), "{}");
    await writeFile(join(directory, "repo/a.ts"), "export const x = 1;");
    await writeFile(join(directory, "repo/.gitignore"), "ignored.ts\n");
    await writeFile(join(directory, "repo/ignored.ts"), "private");
    await writeFile(join(directory, "repo/node_modules/a.js"), "dependency");
    await create(
      { cwd: directory, file: join(directory, "source.tgz"), gzip: true },
      ["repo"],
    );
    const archive = await readFile(join(directory, "source.tgz"));
    const inventory = await withRepositoryArchive(
      archive,
      {},
      async (path, result) => {
        extracted = path;
        assert.equal(
          await readFile(join(path, "a.ts"), "utf8"),
          "export const x = 1;",
        );
        return result;
      },
    );
    assert.deepEqual(
      inventory.files.map((file) => file.path),
      [".gitignore", "a.ts", "package.json"],
    );
    assert.match(inventory.files[1].sha256, /^[a-f0-9]{64}$/);
    await assert.rejects(access(extracted));
    await assert.rejects(
      withRepositoryArchive(archive, {}, async (path) => {
        extracted = path;
        throw new Error("Consumer failed");
      }),
      /Consumer failed/,
    );
    await assert.rejects(access(extracted));
    await symlink("/etc/passwd", join(directory, "repo/link"));
    await create(
      { cwd: directory, file: join(directory, "unsafe.tgz"), gzip: true },
      ["repo"],
    );
    await assert.rejects(
      withRepositoryArchive(
        await readFile(join(directory, "unsafe.tgz")),
        {},
        async () => {},
      ),
      /links/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("traversal, oversized files and malformed archives fail closed", async () => {
  for (const path of [
    "../escape",
    "root/../../escape",
    "/root/escape",
    "root/back\\slash",
  ]) {
    const header = Buffer.alloc(512);
    new Header({ path, size: 0, type: "File" }).encode(header);
    await assert.rejects(
      withRepositoryArchive(
        gzipSync(Buffer.concat([header, Buffer.alloc(1024)])),
        {},
        async () => {},
      ),
    );
  }
  const header = Buffer.alloc(512);
  new Header({
    path: "root/large",
    size: 3 * 1024 * 1024,
    type: "File",
  }).encode(header);
  await assert.rejects(
    withRepositoryArchive(
      gzipSync(Buffer.concat([header, Buffer.alloc(1024)])),
      {},
      async () => {},
    ),
  );
  await assert.rejects(
    withRepositoryArchive(Buffer.from("invalid"), {}, async () => {}),
  );
});

test("duplicate entries and decompression bombs are rejected", async () => {
  const header = Buffer.alloc(512);
  new Header({ path: "root/same", size: 0, type: "File" }).encode(header);
  await assert.rejects(
    withRepositoryArchive(
      gzipSync(Buffer.concat([header, header, Buffer.alloc(1024)])),
      {},
      async () => {},
    ),
    /duplicate/,
  );
  await assert.rejects(
    withRepositoryArchive(
      gzipSync(Buffer.alloc(65 * 1024 * 1024)),
      {},
      async () => {},
    ),
  );
});
