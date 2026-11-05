import { test } from "node:test";
import { strict as assert } from "node:assert";
import { runOneExportJob } from "./process.js";
import type { Pool } from "pg";

test("runOneExportJob returns false when no jobs are queued", async () => {
  const mockPool = {
    async query(sql: string) {
      if (sql.includes("WITH candidate AS")) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  } as unknown as Pool;

  const result = await runOneExportJob(mockPool);
  assert.equal(result, false);
});

test("runOneExportJob fails closed when tenant authorization check fails", async () => {
  let updateStatus = "";
  let updateError = "";

  const mockClient = {
    async query(sql: string, values?: unknown[]) {
      if (sql.includes("SELECT o.id AS organization_id")) {
        return { rows: [] };
      }
      if (sql.includes("UPDATE export_jobs SET status='failed'")) {
        updateStatus = "failed";
        updateError = "UNAUTHORIZED";
        return { rowCount: 1 };
      }
      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async query(sql: string, values?: unknown[]) {
      if (sql.includes("UPDATE export_jobs SET status='failed'")) {
        updateStatus = "failed";
        updateError = typeof values?.[0] === "string" ? values[0] : "";
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes("WITH candidate AS")) {
        return {
          rows: [
            {
              id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
              organization_id: "org_1",
              repository_id: "repo_1",
              job_id: "job_1",
              actor_id: "usr_attacker",
              export_type: "diagram",
              format: "svg",
              target_id: "system",
              attempts: 1,
            },
          ],
        };
      }
      return { rows: [] };
    },
    async connect() {
      return mockClient;
    },
  } as unknown as Pool;

  const result = await runOneExportJob(mockPool);
  assert.equal(result, true);
  assert.equal(updateStatus, "failed");
  assert.equal(updateError, "UNAUTHORIZED");
});
