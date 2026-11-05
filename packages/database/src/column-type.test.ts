import { test } from "node:test";
import { strict as assert } from "node:assert";
import { columnTypeMatches, expectedColumnType } from "./column-type.js";
test("schema verification distinguishes arrays and verifies numeric precision and scale", () => {
  const textArray = {
    udt_name: "_text",
    numeric_precision: null,
    numeric_scale: null,
  };
  assert.equal(columnTypeMatches("text[]", textArray), true);
  assert.equal(columnTypeMatches("text", textArray), false);
  assert.equal(
    columnTypeMatches("text[]", { ...textArray, udt_name: "jsonb" }),
    false,
  );
  const numeric = {
    udt_name: "numeric",
    numeric_precision: 5,
    numeric_scale: 4,
  };
  assert.equal(columnTypeMatches("numeric(5, 4)", numeric), true);
  assert.equal(columnTypeMatches("numeric(5,4)", numeric), true);
  assert.equal(
    columnTypeMatches("numeric(5,4)", { ...numeric, numeric_scale: 3 }),
    false,
  );
  assert.equal(
    columnTypeMatches("numeric(5,4)", { ...numeric, numeric_precision: 6 }),
    false,
  );
  assert.throws(() => expectedColumnType("unrecognized"), /Unsupported/);
});

test("schema verification validates SQL date columns without accepting timestamp substitutes", () => {
  assert.equal(
    columnTypeMatches("date", {
      udt_name: "date",
      numeric_precision: null,
      numeric_scale: null,
    }),
    true,
  );
  assert.equal(
    columnTypeMatches("date", {
      udt_name: "timestamptz",
      numeric_precision: null,
      numeric_scale: null,
    }),
    false,
  );
});
