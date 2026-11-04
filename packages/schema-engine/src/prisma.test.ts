import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractPrisma } from "./prisma.js";
test("Prisma relations keep mapped scalar columns and declared delete actions", () => {
  const result = extractPrisma(
    "schema.prisma",
    `model User {
 id Int @id
}
model Profile {
 id Int @id
 userId Int @unique @map("user_id")
 user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}`,
  );
  assert.equal(result.tables.length, 2);
  assert.deepEqual(result.relations[0].columns, ["user_id"]);
  assert.equal(result.relations[0].onDelete, "Cascade");
  assert.ok(
    result.tables[1].columns.find((column) => column.name === "user_id")
      ?.unique,
  );
});
