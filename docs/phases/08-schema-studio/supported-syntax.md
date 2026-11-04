# Supported schema syntax

All adapters are static and intentionally bounded. Unsupported declarations produce diagnostics rather than executing repository code. These capabilities describe source declarations, not a live database introspection result. Later TypeORM, Sequelize and Mongoose adapters remain outside Phase 8's initial scope.

| Adapter        | Supported declarations                                                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL            | `CREATE TABLE`, qualified/quoted table names, scalar/parameterized types, arrays, nullability, literal/function-text defaults, inline/table primary/unique/foreign keys, table checks, indexes, `CREATE TYPE ... AS ENUM`                                                          |
| SQL migrations | Lexically ordered source paths; `ALTER TABLE ADD [COLUMN]`, added supported constraints, `DROP COLUMN`, `ALTER COLUMN TYPE`, setting/dropping nullability/defaults, and `DROP TABLE`                                                                                               |
| Prisma         | Multiline models/enums, scalar/enum fields, optional/list fields, defaults, native `@db` types, `@id`, `@unique`, `@@id`, `@@unique`, `@@index`, `@@schema`, `@map`, `@@map`, explicit `@relation` keys/delete actions and implicit list-to-list relations                         |
| Drizzle        | Named imports and aliases from Drizzle modules; `pgTable`, `mysqlTable`, `sqliteTable`, `pgSchema(...).table`, `pgEnum`, literal table/column names, scalar builders, arrays, nullability/defaults, primary/unique keys, indexes/checks, column and table foreign-key declarations |

Cross-file Drizzle named imports resolve relative source modules and imported aliases. Arbitrary dynamic names, spreads, runtime factory evaluation, wildcard re-exports and arbitrary project alias resolution are not executed. Static custom builders remain identified by their source name and carry a review diagnostic when their underlying type is unknown.

SQL is a PostgreSQL-oriented DDL subset. General stored procedures, dynamic SQL, views, triggers, table inheritance/partitioning, dialect-specific advanced clauses, enum alterations, constraint/index renaming and arbitrary data migrations are outside the subset. Quoted strings, dollar-quoted bodies and nested comments are tokenized so embedded SQL is not mistaken for top-level DDL. Malformed declarations are not applied to the extracted model. Unknown statements remain diagnostics.

Migration files are replayed in lexical path order, not through the project's migration runner. Projects that mix schema dumps with migration histories can have duplicate/ambiguous declarations; review diagnostics and analyze a consistent source set. Duplicate logical tables retain the first declaration and mark affected targets unresolved rather than claiming a merged schema.

Schema comparison detects supported additions, removals and property changes. It compares declared types/defaults and structural constraints; it does not infer renames, prove data-preserving migrations or assess migration safety against production records. Use the snapshot hashes and source evidence when reviewing differences.

## Limits

| Resource        | Limit                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Source archive  | Existing Phase 2 compressed/decompressed/extraction limits                                                  |
| Schema inputs   | 10,000 files, 50 MiB combined, 2 MiB per file                                                               |
| Tokenization    | 200,000 tokens per source; comment nesting at most 64                                                       |
| Snapshot        | 1,000 tables; 500 columns and 500 constraints per table; 5,000 relations; 1,000 enums; 10,000 lineage items |
| Stored payload  | 20 MiB                                                                                                      |
| Request body    | 8 KiB                                                                                                       |
| Requests        | Five per workspace per minute                                                                               |
| API pages       | 20 snapshot summaries; 50 schema objects; bounded page number                                               |
| Canvas / SVG    | 100 tables; diagram columns truncated to eleven with full inspector available                               |
| Comparison      | 20,000 structural changes per response                                                                      |
| Worker recovery | Three attempts; five-minute lease expiry                                                                    |

Resource-limit failures never execute repository code or return raw internal exceptions. SVG exports escape all untrusted labels and contain no scripts or external assets. Documents escape HTML and table delimiters. Downloads use attachment disposition, no-store caching, nosniff and a restrictive sandbox/content policy.
