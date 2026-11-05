import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  defaultWorkspaceControls,
  teamPermissions,
  workspaceControlsSchema,
  sharedProjectionSchema,
} from "./team.js";
test("team capabilities preserve least privilege and member exports compatibility", () => {
  const permissions = teamPermissions("member", defaultWorkspaceControls);
  assert.equal(permissions.shareAnalysis, false);
  assert.equal(permissions.manageMembers, false);
  assert.equal(permissions.exportAnalysis, true);
  assert.equal(
    teamPermissions("admin", defaultWorkspaceControls).manageMembers,
    false,
  );
  assert.equal(
    teamPermissions("owner", defaultWorkspaceControls).manageMembers,
    true,
  );
  assert.equal(
    workspaceControlsSchema.safeParse({
      ...defaultWorkspaceControls,
      retentionDays: 0,
    }).success,
    false,
  );
});
test("shared projections reject extra source payloads", () => {
  assert.equal(
    sharedProjectionSchema.safeParse({
      kind: "version",
      jobId: "bad",
      source: "private code",
    }).success,
    false,
  );
});
