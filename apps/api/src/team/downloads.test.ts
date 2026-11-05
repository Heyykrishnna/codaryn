import { test } from "node:test";
import { strict as assert } from "node:assert";
import { signDownload } from "./downloads.js";
test("signed grants bind the actor artifact expiry and purpose fields", () => {
  const key = "fixture-signing-key-longer-than-thirty-two",
    args = [
      "grant",
      "actor",
      "export",
      "a".repeat(64),
      "2030-01-01T00:00:00.000Z",
    ] as const;
  const signature = signDownload(key, ...args);
  assert.match(signature, /^[a-f0-9]{64}$/);
  assert.notEqual(
    signDownload(key, args[0], "other", args[2], args[3], args[4]),
    signature,
  );
  assert.notEqual(
    signDownload(key, args[0], args[1], args[2], "b".repeat(64), args[4]),
    signature,
  );
  assert.notEqual(
    signDownload(
      key,
      args[0],
      args[1],
      args[2],
      args[3],
      "2030-01-02T00:00:00.000Z",
    ),
    signature,
  );
});
