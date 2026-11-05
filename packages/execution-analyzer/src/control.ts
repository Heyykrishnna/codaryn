import ts from "typescript";
import type {
  ExecutionSnapshot,
  ExecutionControlNode,
} from "@codaryn/contracts";
import { callable, evidence, label, diagnostic, bounded } from "./model.js";
type Cursor = { id: string; label: string };
type Context = { breaks: Cursor[]; continueId?: string };
class ControlBuilder {
  private sequence = 0;
  private readonly exit: string;
  constructor(
    private readonly result: ExecutionSnapshot,
    private readonly functionId: string,
    private readonly root: ts.Node,
  ) {
    this.exit = this.node(root, "exit", "Function exit");
  }
  private node(
    node: ts.Node,
    kind: ExecutionControlNode["kind"],
    text: string,
  ) {
    const id = `${this.functionId}:control:${this.sequence++}`;
    this.result.controlNodes.push({
      id,
      functionId: this.functionId,
      kind,
      label: text.slice(0, 300),
      evidence: evidence(node),
    });
    bounded(this.result);
    return id;
  }
  private connect(frontier: Cursor[], target: string) {
    for (const from of frontier) {
      this.result.controlEdges.push({
        id: `${this.functionId}:edge:${this.result.controlEdges.length}`,
        functionId: this.functionId,
        sourceId: from.id,
        targetId: target,
        label: from.label,
      });
      bounded(this.result);
    }
  }
  private cursor(id: string, text = "next"): Cursor[] {
    return [{ id, label: text }];
  }
  build() {
    const entry = this.node(this.root, "entry", "Potential entry");
    const body = callable(this.root) ? this.root.body : this.root;
    let tail = this.cursor(entry);
    if (body && ts.isBlock(body))
      tail = this.statements(body.statements, tail, { breaks: [] });
    else if (body && ts.isSourceFile(body))
      tail = this.statements(body.statements, tail, { breaks: [] });
    else if (body && callable(this.root)) {
      const returned = this.node(body, "return", label(body));
      this.connect(tail, returned);
      tail = this.cursor(returned, "return");
    }
    this.connect(tail, this.exit);
  }
  private statements(
    statements: readonly ts.Statement[],
    frontier: Cursor[],
    context: Context,
  ): Cursor[] {
    let tail = frontier;
    for (const statement of statements) {
      if (!tail.length) break;
      tail = this.statement(statement, tail, context);
    }
    return tail;
  }
  private statement(
    statement: ts.Statement,
    frontier: Cursor[],
    context: Context,
  ): Cursor[] {
    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
      return frontier;
    if (ts.isBlock(statement))
      return this.statements(statement.statements, frontier, context);
    if (ts.isIfStatement(statement))
      return this.branch(statement, frontier, context);
    if (ts.isIterationStatement(statement, false))
      return this.loop(statement, frontier);
    if (ts.isSwitchStatement(statement))
      return this.switchBranch(statement, frontier, context);
    if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) {
      const node = this.node(
        statement,
        ts.isReturnStatement(statement) ? "return" : "throw",
        label(statement),
      );
      this.connect(frontier, node);
      this.connect(
        this.cursor(
          node,
          ts.isReturnStatement(statement) ? "return" : "exception",
        ),
        this.exit,
      );
      return [];
    }
    if (ts.isBreakStatement(statement) || ts.isContinueStatement(statement))
      return this.jump(statement, frontier, context);
    const unsupported =
      ts.isTryStatement(statement) ||
      ts.isWithStatement(statement) ||
      ts.isLabeledStatement(statement);
    const node = this.node(
      statement,
      unsupported ? "unsupported" : "statement",
      label(statement),
    );
    this.connect(frontier, node);
    if (unsupported)
      diagnostic(
        this.result,
        statement,
        "CONTROL_PARTIAL",
        "Exception, with and labelled control regions are opaque; their internal control paths are not reconstructed.",
      );
    return this.cursor(node, unsupported ? "unknown continuation" : "next");
  }
  private branch(
    statement: ts.IfStatement,
    frontier: Cursor[],
    context: Context,
  ) {
    const node = this.node(
      statement.expression,
      "decision",
      label(statement.expression),
    );
    this.connect(frontier, node);
    const yes = this.statement(
      statement.thenStatement,
      this.cursor(node, "true"),
      context,
    );
    const no = statement.elseStatement
      ? this.statement(
          statement.elseStatement,
          this.cursor(node, "false"),
          context,
        )
      : this.cursor(node, "false");
    return [...yes, ...no];
  }
  private loop(statement: ts.IterationStatement, frontier: Cursor[]) {
    const node = this.node(statement, "loop", label(statement).split("\n")[0]);
    const body = this.node(statement.statement, "statement", "Loop body");
    const context: Context = { breaks: [], continueId: node };
    this.connect(frontier, ts.isDoStatement(statement) ? body : node);
    this.connect(this.cursor(node, "iterate / condition true"), body);
    const tail = this.statement(
      statement.statement,
      this.cursor(body),
      context,
    );
    this.connect(tail, node);
    diagnostic(
      this.result,
      statement,
      "LOOP_FLOW_BOUNDARY",
      "Loop condition, initializer and update are summarized; iteration counts and loop-carried values are not proven.",
    );
    return [
      ...this.cursor(node, "condition false / exhausted"),
      ...context.breaks,
    ];
  }
  private switchBranch(
    statement: ts.SwitchStatement,
    frontier: Cursor[],
    outer: Context,
  ) {
    const node = this.node(
      statement.expression,
      "decision",
      label(statement.expression),
    );
    this.connect(frontier, node);
    const context: Context = { breaks: [], continueId: outer.continueId };
    let previous: Cursor[] = [];
    for (const clause of statement.caseBlock.clauses) {
      const marker = this.node(
        clause,
        "statement",
        ts.isCaseClause(clause) ? label(clause.expression) : "default",
      );
      this.connect(
        [
          ...this.cursor(
            node,
            ts.isCaseClause(clause)
              ? `case ${label(clause.expression)}`
              : "default",
          ),
          ...previous,
        ],
        marker,
      );
      previous = this.statements(
        clause.statements,
        this.cursor(marker),
        context,
      );
    }
    const unmatched = statement.caseBlock.clauses.some(ts.isDefaultClause)
      ? []
      : this.cursor(node, "no matching case");
    return [...previous, ...context.breaks, ...unmatched];
  }
  private jump(
    statement: ts.BreakStatement | ts.ContinueStatement,
    frontier: Cursor[],
    context: Context,
  ) {
    const breaking = ts.isBreakStatement(statement);
    const node = this.node(
      statement,
      breaking ? "break" : "continue",
      label(statement),
    );
    this.connect(frontier, node);
    if (statement.label) {
      diagnostic(
        this.result,
        statement,
        "LABELLED_JUMP",
        "Labelled jump target is not resolved.",
      );
      return this.cursor(node, "unknown jump");
    }
    if (breaking) context.breaks.push(...this.cursor(node, "break"));
    else if (context.continueId)
      this.connect(this.cursor(node, "continue"), context.continueId);
    return [];
  }
}
export function collectControl(
  result: ExecutionSnapshot,
  nodes: Map<string, ts.Node>,
) {
  for (const [id, node] of nodes) new ControlBuilder(result, id, node).build();
}
