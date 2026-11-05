import { test } from "node:test";
import { strict as assert } from "node:assert";
import { WorkspaceAccessError } from "@codaryn/database";
import { ExportService } from "./service.js";
import type { Pool } from "pg";

test("ExportService.scheduleExport enqueues an export job", async () => {
  let enqueued = false;

  const mockClient = {
    async query(sql: string) {
      if (sql.includes("SELECT m.role")) {
        return { rowCount: 1, rows: [{ role: "admin" }] };
      }
      if (sql.includes("SELECT repository_id FROM analysis_jobs")) {
        return { rowCount: 1, rows: [{ repository_id: "repo_123" }] };
      }
      if (sql.includes("SELECT count(*) FROM export_jobs")) {
        return { rowCount: 1, rows: [{ count: "1" }] };
      }
      if (sql.includes("INSERT INTO export_jobs")) {
        enqueued = true;
        return { rowCount: 1 };
      }
      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async connect() {
      return mockClient;
    },
  } as unknown as Pool;

  const service = new ExportService(mockPool);
  const validJobId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  const validWorkspaceId = "6ba7b810-9dad-11d1-80b4-00c04fd430c9";
  const response = await service.scheduleExport(
    "usr_123",
    validWorkspaceId,
    validJobId,
    {
      jobId: validJobId,
      exportType: "diagram",
      format: "svg",
      targetId: "system",
    },
  );

  assert.equal(enqueued, true);
  assert.equal(response.status, "queued");
  assert.equal(response.format, "svg");
  assert.equal(response.exportType, "diagram");
});

test("ExportService denies unauthorized tenant access on artifact download", async () => {
  const mockClient = {
    async query(sql: string) {
      if (sql.includes("SELECT m.role")) {
        return { rowCount: 0, rows: [] };
      }
      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async connect() {
      return mockClient;
    },
  } as unknown as Pool;

  const service = new ExportService(mockPool);
  await assert.rejects(async () => {
    await service.getArtifactPayload(
      "usr_attacker",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      "00000000-0000-0000-0000-000000000003",
    );
  }, WorkspaceAccessError);
});

test("ExportService returns artifact payload when export is completed", async () => {
  const mockClient = {
    async query(sql: string) {
      if (sql.includes("SELECT m.role")) {
        return { rowCount: 1, rows: [{ role: "member" }] };
      }
      if (sql.includes("SELECT id,status,error_message FROM export_jobs")) {
        return {
          rowCount: 1,
          rows: [{ id: "export_1", status: "completed", error_message: null }],
        };
      }
      if (
        sql.includes(
          "SELECT id,content_type,filename,payload,size,hash FROM export_artifacts",
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              id: "art_1",
              content_type: "image/svg+xml; charset=utf-8",
              filename: "system.svg",
              payload: "<svg></svg>",
              size: 11,
              hash: "a".repeat(64),
            },
          ],
        };
      }
      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async connect() {
      return mockClient;
    },
  } as unknown as Pool;

  const service = new ExportService(mockPool);
  const artifact = await service.getArtifactPayload(
    "usr_123",
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003",
  );

  assert.equal(artifact.filename, "system.svg");
  assert.equal(artifact.size, 11);
  assert.equal(artifact.payload, "<svg></svg>");
});
