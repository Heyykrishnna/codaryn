import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  extractSchema,
  compareSchemas,
  renderSchemaSvg,
  renderSchemaMarkdown,
} from "./index.js";

test("SQL extracts keys, enums, migration changes, composite constraints and source evidence without executing code", () => {
  const result = extractSchema({
    "001.sql": `CREATE TYPE role AS ENUM ('user','admin');
CREATE TABLE users (id uuid PRIMARY KEY, email text NOT NULL UNIQUE, role role DEFAULT 'user');
CREATE TABLE posts (id integer PRIMARY KEY, user_id uuid REFERENCES users(id), title varchar(200), CONSTRAINT title_unique UNIQUE (user_id,title));
CREATE INDEX title_idx ON posts(title);`,
    "002.sql":
      "ALTER TABLE posts ADD COLUMN published boolean NOT NULL DEFAULT false; ALTER TABLE posts ALTER COLUMN title SET NOT NULL;",
  });
  assert.equal(result.snapshot.tables.length, 2);
  const users = result.snapshot.tables.find((item) => item.name === "users")!;
  const posts = result.snapshot.tables.find((item) => item.name === "posts")!;
  assert.equal(users.columns[0].primaryKey, true);
  assert.equal(users.columns[0].nullable, false);
  assert.equal(users.columns[1].unique, true);
  assert.equal(
    posts.columns.find((item) => item.name === "published")?.defaultValue,
    "false",
  );
  assert.equal(
    posts.columns.find((item) => item.name === "title")?.nullable,
    false,
  );
  assert.equal(result.snapshot.relations[0].resolution, "DIRECT");
  assert.equal(result.snapshot.enums[0].values[1], "admin");
  assert.equal(posts.evidence.startLine, 3);
});
test("Prisma mapping, compound keys, optional fields and implicit many-to-many relations are represented", () => {
  const { snapshot } = extractSchema({
    "schema.prisma": `model User {
 id Int @id @default(autoincrement())
 email String @unique
 posts Post[]
 tags Tag[]
 @@map("users")
}
model Post {
 id Int @id
 authorId Int? @map("author_id")
 author User? @relation(fields: [authorId], references: [id], onDelete: Cascade)
}
model Tag {
 id Int @id
 users User[]
}`,
  });
  assert.equal(snapshot.tables[0].adapter, "prisma");
  assert.ok(snapshot.tables.some((item) => item.name === "users"));
  assert.equal(
    snapshot.relations.find((item) => item.columns.includes("author_id"))
      ?.targetName,
    "users",
  );
  assert.ok(
    snapshot.relations.some((item) => item.cardinality === "many-to-many"),
  );
  assert.equal(
    snapshot.tables.find((item) => item.name === "Post")?.columns[1].nullable,
    true,
  );
});
test("Drizzle static AST handles keys, indexes, references and enum declarations without evaluating functions", () => {
  const { snapshot } = extractSchema({
    "schema.ts": `import {pgTable,pgEnum,integer,text,uniqueIndex} from 'drizzle-orm/pg-core';
export const role=pgEnum('role',['reader','writer']);
export const users=pgTable('users',{id:integer('id').primaryKey(),email:text('email').notNull()},t=>[uniqueIndex('email_idx').on(t.email)]);
export const posts=pgTable('posts',{id:integer('id').primaryKey(),author:integer('author_id').references(()=>users.id),body:text('body').default('hello')});
throw new Error('must never run');`,
  });
  assert.equal(snapshot.tables.length, 2);
  assert.equal(snapshot.enums.length, 1);
  assert.equal(snapshot.relations[0].targetTableId, "drizzle:public.users");
  assert.equal(snapshot.relations[0].resolution, "DIRECT");
  assert.ok(
    snapshot.tables
      .find((item) => item.name === "users")
      ?.constraints.some((item) => item.name === "email_idx"),
  );
});
test("snapshot hashes, structural comparison and escaped exports share one snapshot", () => {
  const files = {
    "schema.sql": "CREATE TABLE users (id integer PRIMARY KEY, name text);",
  };
  const first = extractSchema(files);
  assert.equal(first.hash, extractSchema(files).hash);
  const next = extractSchema({
    "schema.sql":
      "CREATE TABLE users (id integer PRIMARY KEY, name text NOT NULL, email text);",
  });
  const changes = compareSchemas(first.snapshot, next.snapshot).changes;
  assert.ok(
    changes.some(
      (item) => item.name === "users.email" && item.kind === "added",
    ),
  );
  assert.ok(
    changes.some(
      (item) => item.name === "users.name" && item.kind === "changed",
    ),
  );
  assert.ok(
    renderSchemaMarkdown(first.snapshot, "snapshot-1", first.hash).includes(
      first.hash,
    ),
  );
  assert.ok(
    renderSchemaSvg(
      first.snapshot,
      "<script>alert(1)</script>",
      first.hash,
    ).includes("&lt;script&gt;"),
  );
  assert.ok(
    !renderSchemaSvg(first.snapshot, "<script>", first.hash).includes(
      "<script>",
    ),
  );
});
test("inferred and unresolved relations stay distinct and unsafe inputs are rejected", () => {
  const { snapshot } = extractSchema(
    {
      "schema.sql":
        "CREATE TABLE users (id int PRIMARY KEY); CREATE TABLE posts (user_id int, missing int REFERENCES absent(id));",
    },
    true,
  );
  assert.ok(snapshot.relations.some((item) => item.resolution === "INFERRED"));
  assert.ok(
    snapshot.relations.some((item) => item.resolution === "UNRESOLVED"),
  );
  assert.throws(() => extractSchema({ "../outside.sql": "SELECT 1;" }));
  const unsupported = extractSchema({
    "schema.sql": "CREATE VIEW dynamic AS SELECT 1;",
  });
  assert.equal(unsupported.snapshot.tables.length, 0);
  assert.equal(unsupported.snapshot.diagnostics[0].code, "SQL_UNSUPPORTED");
});

test("join tables yield many-to-many paths while composite keys do not imply uniqueness of a single field", () => {
  const { snapshot } = extractSchema({
    "schema.sql":
      "CREATE TABLE users (id int PRIMARY KEY); CREATE TABLE groups (id int PRIMARY KEY); CREATE TABLE members (user_id int REFERENCES users(id), group_id int REFERENCES groups(id), PRIMARY KEY(user_id,group_id));",
  });
  assert.equal(
    snapshot.tables.find((item) => item.name === "members")?.joinTable,
    true,
  );
  assert.ok(
    snapshot.relations.some(
      (item) =>
        item.cardinality === "many-to-many" && item.resolution === "RESOLVED",
    ),
  );
  assert.equal(
    snapshot.relations.find((item) => item.name === "members_user_id_fkey")
      ?.cardinality,
    "one-to-many",
  );
});
test("source lineage has evidence and never promotes naming inference to a confirmed link", () => {
  const { snapshot } = extractSchema({
    "schema.ts":
      "import {pgTable,integer,text} from 'drizzle-orm/pg-core'; export const users=pgTable('users',{id:integer('id').primaryKey(),email:text('email')});",
    "repository.ts":
      "import {users} from './schema'; class CreateUserDto { email: string; } const result=db.select().from(users);",
  });
  assert.ok(
    snapshot.lineage.some(
      (item) =>
        item.kind === "repository" &&
        item.resolution === "INFERRED" &&
        item.evidence.path === "repository.ts",
    ),
  );
  assert.ok(
    snapshot.lineage.some(
      (item) =>
        item.kind === "dto-field" && item.name === "CreateUserDto.email",
    ),
  );
});

test("cross-file Drizzle aliases resolve deterministically and input map order does not change the snapshot hash", () => {
  const schema =
    "import {pgTable,integer} from 'drizzle-orm/pg-core'; export const users=pgTable('users',{id:integer('id').primaryKey()});";
  const posts =
    "import {pgTable,integer} from 'drizzle-orm/pg-core'; import {users as account} from './users'; export const posts=pgTable('posts',{id:integer('id').primaryKey(),author:integer('author_id').references(()=>account.id)});";
  const first = extractSchema({ "users.ts": schema, "posts.ts": posts });
  const second = extractSchema({ "posts.ts": posts, "users.ts": schema });
  assert.equal(first.hash, second.hash);
  assert.equal(
    first.snapshot.relations[0].targetTableId,
    "drizzle:public.users",
  );
  assert.equal(first.snapshot.relations[0].resolution, "DIRECT");
});

test("comparison orders accented identifiers consistently and documentation escapes table delimiters", () => {
  const before = extractSchema({});
  const after = extractSchema({
    "schema.sql":
      'CREATE TABLE "ä"(id int PRIMARY KEY); CREATE TABLE "Z"(id int PRIMARY KEY);',
  });
  assert.deepEqual(
    compareSchemas(before.snapshot, after.snapshot)
      .changes.filter((item) => item.object === "table")
      .map((item) => item.name),
    ["sql:public.ä", "sql:public.Z"],
  );
  const document = renderSchemaMarkdown(
    after.snapshot,
    "snapshot|1",
    after.hash,
  );
  assert.ok(document.includes(String.raw`snapshot\|1`));
});
