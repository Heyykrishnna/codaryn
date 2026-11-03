# @codaryn/symbol-resolver

Cross-file symbol linker and evidence collector for TypeScript and JavaScript repositories.

## Capabilities

- **Direct Named Linker**: Links imported specifiers to declared functions, classes, interfaces, and types.
- **Default Export Resolver**: Resolves default exports across modules and re-export barrels.
- **Transitive Re-Export Traversal**: Follows `export *` and named re-exports recursively with cycle detection.
- **External Package Classification**: Correctly segments external third-party module imports.
- **Unresolved Reference Containment**: Tracks unresolvable imports cleanly without synthesizing artificial edges.
- **Deterministic Reference IDs**: Computes stable SHA-256 reference IDs with source evidence line ranges.
