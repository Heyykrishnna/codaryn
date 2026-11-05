import type { QualitySnapshot, SourceEvidence } from "@codaryn/contracts";
import {
  object,
  array,
  strings,
  text,
  configuration,
  evidence,
  identity,
  safeLabel,
  finding,
  diagnostic,
  bounds,
} from "./model.js";
const dangerous = (
  result: QualitySnapshot,
  ruleId: string,
  title: string,
  where: SourceEvidence,
  severity: "high" | "medium" = "high",
) =>
  finding(result, {
    ruleId,
    title,
    tool: "builtin",
    category: "configuration",
    description:
      "Configuration requires security review; no runtime exploit is asserted.",
    severity,
    confidence: "high",
    evidence: where,
    dependencyId: null,
  });
function environment(
  result: QualitySnapshot,
  mapping: unknown,
  path: string,
  source: string,
) {
  const names = Array.isArray(mapping)
    ? strings(mapping).map((value) => value.split("=")[0])
    : Object.keys(object(mapping));
  for (const name of names)
    if (/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name))
      result.environment.push({
        id: identity(path, name, "configuration"),
        name,
        source: "configuration",
        evidence: evidence(path, source),
      });
}
export function extractDocker(
  path: string,
  source: string,
  result: QualitySnapshot,
) {
  const stages = new Map<string, string>();
  let current = "",
    user = "",
    lastEvidence = evidence(path, source),
    instruction = "",
    offset = 0,
    start = 0;
  for (const line of source.split("\n")) {
    if (!instruction) start = offset;
    offset += line.length + 1;
    if (!instruction && /^\s*#/.test(line)) continue;
    instruction += (instruction ? " " : "") + line.trim().replace(/\\$/, "");
    if (line.trimEnd().endsWith("\\")) continue;
    const parts = /^([A-Za-z]+)\s+([\s\S]+)$/.exec(instruction);
    instruction = "";
    if (!parts) continue;
    const command = parts[1].toUpperCase(),
      value = parts[2],
      where = evidence(path, source, start, Math.min(offset, source.length));
    if (command === "FROM") {
      const match = /^(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?$/i.exec(
        value,
      );
      if (!match) {
        diagnostic(
          result,
          path,
          source,
          "DOCKER_PARTIAL",
          "A dynamic or unsupported FROM declaration was not modeled.",
        );
        continue;
      }
      current = identity(path, "stage", result.resources.length);
      user = "";
      lastEvidence = where;
      result.resources.push({
        id: current,
        name: safeLabel(match[2] ?? `stage-${stages.size}`),
        kind: "docker-stage",
        details: [`base: ${safeLabel(match[1])}`],
        evidence: where,
      });
      const parent = stages.get(match[1]);
      if (parent)
        result.relations.push({
          id: identity(current, parent, "builds"),
          sourceId: current,
          targetId: parent,
          kind: "builds",
          evidence: where,
        });
      stages.set(match[2] ?? String(stages.size), current);
    } else if (current && command === "USER") user = value.trim();
    else if (current && command === "COPY") {
      const parent = /--from=(\S+)/.exec(value)?.[1],
        target = parent ? stages.get(parent) : undefined;
      if (target)
        result.relations.push({
          id: identity(current, target, "copy"),
          sourceId: current,
          targetId: target,
          kind: "builds",
          evidence: where,
        });
    } else if (command === "ENV" || command === "ARG")
      environment(result, [value.split(/[=\s]/)[0]], path, source);
    bounds(result);
  }
  if (instruction)
    diagnostic(
      result,
      path,
      source,
      "DOCKER_PARTIAL",
      "An incomplete continued instruction was not modeled.",
    );
  if (current && (!user || ["root", "0"].includes(user.split(":")[0])))
    dangerous(
      result,
      "docker-user",
      "Final stage lacks an explicit non-root user",
      lastEvidence,
      "medium",
    );
}
export function extractCompose(
  path: string,
  source: string,
  result: QualitySnapshot,
) {
  const doc = configuration(source),
    services = object(doc.services),
    volumes = object(doc.volumes),
    networks = object(doc.networks),
    ids = new Map<string, string>();
  for (const [kind, mapping] of [
    ["service", services],
    ["volume", volumes],
    ["network", networks],
  ] as const)
    for (const name of Object.keys(mapping)) {
      const id = identity(path, kind, name);
      ids.set(`${kind}:${name}`, id);
      result.resources.push({
        id,
        name: safeLabel(name),
        kind,
        details:
          kind === "service"
            ? [
                `image: ${safeLabel(text(object(mapping[name]).image)) || "build/context"}`,
              ]
            : [],
        evidence: evidence(path, source),
      });
      bounds(result);
    }
  for (const [name, raw] of Object.entries(services)) {
    const service = object(raw),
      id = ids.get(`service:${name}`)!;
    const needs = Array.isArray(service.depends_on)
      ? strings(service.depends_on)
      : Object.keys(object(service.depends_on));
    for (const target of needs) {
      const targetId = ids.get(`service:${target}`);
      if (targetId)
        result.relations.push({
          id: identity(id, targetId),
          sourceId: id,
          targetId,
          kind: "depends-on",
          evidence: evidence(path, source),
        });
      else
        diagnostic(
          result,
          path,
          source,
          "COMPOSE_REFERENCE",
          "A service dependency was not found in this document.",
        );
    }
    for (const mount of array(service.volumes)) {
      const entry =
          typeof mount === "string"
            ? mount.split(":")[0]
            : text(object(mount).source),
        targetId = ids.get(`volume:${entry}`);
      if (targetId)
        result.relations.push({
          id: identity(id, targetId),
          sourceId: id,
          targetId,
          kind: "mounts",
          evidence: evidence(path, source),
        });
      if (entry.includes("docker.sock"))
        dangerous(
          result,
          "compose-docker-socket",
          "Container mounts a Docker daemon socket",
          evidence(path, source),
        );
    }
    const connected = Array.isArray(service.networks)
      ? strings(service.networks)
      : Object.keys(object(service.networks));
    for (const name of connected) {
      const targetId = ids.get(`network:${name}`);
      if (targetId)
        result.relations.push({
          id: identity(id, targetId),
          sourceId: id,
          targetId,
          kind: "uses",
          evidence: evidence(path, source),
        });
    }
    if (service.privileged === true)
      dangerous(
        result,
        "compose-privileged",
        "Container declares privileged mode",
        evidence(path, source),
      );
    if (service.network_mode === "host")
      dangerous(
        result,
        "compose-host-network",
        "Container shares the host network",
        evidence(path, source),
        "medium",
      );
    environment(result, service.environment, path, source);
    bounds(result);
  }
  if (doc.include || doc.extends)
    diagnostic(
      result,
      path,
      source,
      "COMPOSE_PARTIAL",
      "External Compose includes/extends are not loaded or executed.",
    );
}
export function extractWorkflow(
  path: string,
  source: string,
  result: QualitySnapshot,
) {
  const doc = configuration(source),
    jobs = object(doc.jobs),
    ids = new Map(
      Object.keys(jobs).map((name) => [name, identity(path, "job", name)]),
    );
  environment(result, doc.env, path, source);
  if (doc.permissions === "write-all")
    dangerous(
      result,
      "workflow-permissions",
      "Workflow grants broad write permissions",
      evidence(path, source),
    );
  if (
    Object.hasOwn(object(doc.on), "pull_request_target") ||
    strings(doc.on).includes("pull_request_target")
  )
    dangerous(
      result,
      "workflow-pr-target",
      "Privileged pull-request trigger requires trust-boundary review",
      evidence(path, source),
    );
  for (const [name, raw] of Object.entries(jobs)) {
    const job = object(raw),
      id = ids.get(name)!,
      steps = array(job.steps),
      actions = steps.map((step) => text(object(step).uses)).filter(Boolean);
    result.resources.push({
      id,
      name: safeLabel(name),
      kind: "workflow-job",
      details: actions
        .slice(0, 30)
        .map((action) => `uses: ${safeLabel(action)}`),
      evidence: evidence(path, source),
    });
    for (const need of strings(job.needs)) {
      const targetId = ids.get(need);
      if (targetId)
        result.relations.push({
          id: identity(id, targetId),
          sourceId: id,
          targetId,
          kind: "depends-on",
          evidence: evidence(path, source),
        });
      else
        diagnostic(
          result,
          path,
          source,
          "WORKFLOW_REFERENCE",
          "A required workflow job was not found in this document.",
        );
    }
    for (const action of actions)
      if (
        !action.startsWith("./") &&
        !action.startsWith("docker://") &&
        !/@[a-f0-9]{40}$/i.test(action)
      )
        dangerous(
          result,
          "workflow-action-pin",
          "Action reference is not pinned to an immutable commit",
          evidence(path, source),
          "medium",
        );
    environment(result, job.env, path, source);
    for (const step of steps)
      environment(result, object(step).env, path, source);
    if (job.uses)
      diagnostic(
        result,
        path,
        source,
        "WORKFLOW_REUSABLE",
        "Reusable workflow contents are not fetched or executed.",
      );
    bounds(result);
  }
}
