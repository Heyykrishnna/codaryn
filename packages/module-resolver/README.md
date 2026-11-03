# @codaryn/module-resolver

Deterministic module and path resolution for TypeScript and JavaScript repositories.

## Capabilities

- **Relative Module Resolution**: Probes `.ts`, `.tsx`, `.d.ts`, `.js`, `.jsx`, `.json` and `/index` entry points.
- **TypeScript Extension Mapping**: Maps `.js` specifiers to underlying `.ts` or `.tsx` source files.
- **Path Alias Resolution**: Full support for `tsconfig.json` `compilerOptions.paths` patterns and `baseUrl`.
- **Monorepo Package Roots**: Maps package dependencies to workspace entry files.
- **External Package Classification**: Identifies third-party packages, handles scoped packages (`@scope/pkg`), and sub-path imports.
- **Unresolved Reference Tracking**: Flags broken local imports without synthesizing artificial edges.
