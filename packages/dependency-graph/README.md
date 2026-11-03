# @codaryn/dependency-graph

Graph builder, cycle detector, and coupling metric engine for TypeScript and JavaScript codebases.

## Capabilities

- **Dependency Graph Synthesis**: Builds file and symbol directed dependency graphs with source evidence provenance.
- **Tarjan Strongly Connected Components**: Identifies all circular dependency cycles and extracts navigable loop paths.
- **Coupling & Instability Metrics**: Computes afferent coupling ($C_a$), efferent coupling ($C_e$), instability index ($I = \frac{C_e}{C_a + C_e}$), and dependency depth.
- **Neighborhood Subgraphs**: Traverses incoming, outgoing, or bidirectional ego-networks up to depth $N$.
- **Edge Weight Aggregation**: Aggregates repeated references between the same modules with full source line ranges.
