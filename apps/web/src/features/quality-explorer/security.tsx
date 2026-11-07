import { useDeferredValue, useState } from "react";
import { z } from "zod";
import {
  findingReviewSchema,
  findingStateSchema,
  findingSeveritySchema,
  findingReasonSchema,
} from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import {
  useArtifactResource,
  qualityUrl,
  findingsSchema,
  findingSchema,
  auditSchema,
  type Overview,
} from "./api";
export function SecurityDashboard({
  workspaceId,
  snapshotId,
  overview,
  onReview,
}: Readonly<{
  workspaceId: string;
  snapshotId: string;
  overview: Overview;
  onReview: () => void;
}>) {
  const [page, setPage] = useState(1),
    [auditPage, setAuditPage] = useState(1),
    [search, setSearch] = useState(""),
    [severity, setSeverity] = useState(""),
    [state, setState] = useState(""),
    [tool, setTool] = useState(""),
    [category, setCategory] = useState(""),
    [selected, setSelected] = useState(""),
    [refresh, setRefresh] = useState(0);
  const deferred = useDeferredValue(search),
    base = { snapshotId, _retry: refresh };
  const findings = useArtifactResource(
      qualityUrl("findings", workspaceId, {
        ...base,
        page,
        search: deferred,
        severity,
        state,
        tool,
        category,
      }),
      findingsSchema,
    ),
    detail = useArtifactResource(
      selected
        ? qualityUrl("finding", workspaceId, { ...base, objectId: selected })
        : null,
      findingSchema,
    ),
    audit = useArtifactResource(
      qualityUrl("audit", workspaceId, { ...base, page: auditPage }),
      auditSchema,
    );
  const error = findings.error || detail.error || audit.error;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">Security findings</h2>
      <p>
        {Object.entries(overview.groups)
          .map(([key, count]) => `${key}: ${count}`)
          .join(" · ") || "No supported findings"}
        . Counts use reviewed severity. OSV advisory severity stays unknown when
        the scanner provides no supported score.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          Search findings
          <input
            className={control}
            value={search}
            maxLength={100}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {[
          {
            label: "Severity",
            value: severity,
            set: setSeverity,
            options: findingSeveritySchema.options,
          },
          {
            label: "State",
            value: state,
            set: setState,
            options: findingStateSchema.options,
          },
          {
            label: "Tool",
            value: tool,
            set: setTool,
            options: ["builtin", "semgrep", "osv"],
          },
          {
            label: "Category",
            value: category,
            set: setCategory,
            options: [
              "secret",
              "dangerous-code",
              "configuration",
              "dependency",
            ],
          },
        ].map((filter) => (
          <label className="flex flex-col gap-2" key={filter.label}>
            {filter.label}
            <select
              className={control}
              value={filter.value}
              onChange={(e) => {
                filter.set(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {filter.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-neutral-800">
          {error}
        </p>
      )}
      {findings.loading && (
        <LoadingIndicator variant="inline" label="Loading security findings…" />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {findings.data?.items.map((finding) => (
          <li
            key={finding.id}
            className="min-w-0 rounded-xl border border-dotted border-neutral-300 bg-white p-4 font-mono text-xs break-words text-neutral-900"
          >
            <button
              className="text-left font-bold text-neutral-950 transition-colors hover:text-neutral-900"
              onClick={() => setSelected(finding.id)}
            >
              {finding.title}
            </button>
            <p className="mt-1 text-neutral-600">
              {finding.effectiveSeverity} · {finding.state} · {finding.tool} ·{" "}
              {finding.category}
            </p>
            <p className="text-neutral-600">
              {finding.evidence.path}:{finding.evidence.startLine}
            </p>
          </li>
        ))}
      </ul>
      {findings.data && !findings.data.items.length && (
        <p className="text-xs text-neutral-600">
          No findings match these filters. Check scanner status and diagnostics
          before drawing conclusions.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous findings
        </button>
        <span className="font-mono text-xs text-neutral-600">
          Page {page} · {findings.data?.total ?? 0} matching
        </span>
        <button
          className={control}
          disabled={(findings.data?.total ?? 0) <= page * 50}
          onClick={() => setPage(page + 1)}
        >
          Next findings
        </button>
      </div>
      {detail.loading && (
        <LoadingIndicator variant="inline" label="Loading finding inspector…" />
      )}
      {detail.data && (
        <aside className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dotted border-neutral-300 bg-white p-5 font-mono text-xs break-words text-neutral-900">
          <h3 className="text-base font-semibold text-neutral-950">
            {detail.data.finding.title}
          </h3>
          <p className="text-neutral-600">{detail.data.finding.description}</p>
          <p className="text-neutral-600">
            Rule: {detail.data.finding.ruleId} · {detail.data.finding.tool} ·
            confidence: {detail.data.finding.confidence}
          </p>
          <p className="text-neutral-600">
            Detected severity: {detail.data.finding.severity} · effective:{" "}
            {detail.data.finding.effectiveSeverity} · state:{" "}
            {detail.data.finding.state}
          </p>
          <p className="text-neutral-600">
            Evidence: {detail.data.finding.evidence.path}:
            {detail.data.finding.evidence.startLine}–
            {detail.data.finding.evidence.endLine}
          </p>
          {detail.data.dependency && (
            <p>
              Dependency: {detail.data.dependency.name}@
              {detail.data.dependency.version} ·{" "}
              {detail.data.dependency.provenance} ·{" "}
              {detail.data.dependency.evidence.path}
            </p>
          )}
          {detail.data.canReview ? (
            <FindingReview
              key={`${detail.data.finding.id}:${detail.data.finding.review?.revision ?? 0}`}
              workspaceId={workspaceId}
              snapshotId={snapshotId}
              data={detail.data}
              onSaved={() => {
                setRefresh((n) => n + 1);
                onReview();
              }}
            />
          ) : (
            <p>
              Only workspace owners and administrators can change finding
              reviews.
            </p>
          )}
        </aside>
      )}
      <h3 className="text-base font-semibold text-neutral-950">
        Review history
      </h3>
      {audit.loading && (
        <LoadingIndicator variant="inline" label="Loading review history…" />
      )}
      <ol className="flex flex-col gap-2">
        {audit.data?.items.map((event) => (
          <li key={event.id} className="min-w-0 text-sm break-words">
            <time dateTime={event.createdAt}>
              {new Date(event.createdAt).toLocaleString()}
            </time>{" "}
            · actor {event.actorId} · {event.findingId} ·{" "}
            {event.before?.state ?? "open"} → {event.after.state} · severity{" "}
            {event.after.severity ?? "detected"} · {event.after.reason} ·
            revision {event.after.revision}
          </li>
        ))}
      </ol>
      {audit.data && !audit.data.items.length && (
        <p>No review events on this page.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className={control}
          disabled={auditPage === 1}
          onClick={() => setAuditPage(auditPage - 1)}
        >
          Previous reviews
        </button>
        <button
          className={control}
          disabled={(audit.data?.items.length ?? 0) < 50}
          onClick={() => setAuditPage(auditPage + 1)}
        >
          Next reviews
        </button>
      </div>
    </section>
  );
}
function FindingReview({
  workspaceId,
  snapshotId,
  data,
  onSaved,
}: Readonly<{
  workspaceId: string;
  snapshotId: string;
  data: z.infer<typeof findingSchema>;
  onSaved: () => void;
}>) {
  const [state, setState] = useState(data.finding.state),
    [severity, setSeverity] = useState(data.finding.review?.severity ?? ""),
    [reason, setReason] = useState(
      data.finding.review?.reason ?? "needs-review",
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      action={async () => {
        setBusy(true);
        setMessage("");
        try {
          findingReviewSchema.parse(
            await workspaceRequest(
              "quality",
              "review",
              workspaceId,
              {
                snapshotId,
                findingId: data.finding.id,
                state,
                severity: severity || null,
                reason,
                revision: data.finding.review?.revision ?? 0,
              },
              true,
            ),
          );
          setMessage("Review saved.");
          onSaved();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Review failed. Refresh before retrying.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Reviews are recorded with your identity and timestamp. Refresh the
        snapshot if another reviewer changed this finding.
      </p>
      <label className="flex flex-col gap-2">
        Review state
        <select
          className={control}
          value={state}
          onChange={(e) => setState(findingStateSchema.parse(e.target.value))}
        >
          {findingStateSchema.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        Severity override
        <select
          className={control}
          value={severity}
          onChange={(e) =>
            setSeverity(
              e.target.value ? findingSeveritySchema.parse(e.target.value) : "",
            )
          }
        >
          <option value="">Use detected severity</option>
          {findingSeveritySchema.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        Review reason
        <select
          className={control}
          value={reason}
          onChange={(e) => setReason(findingReasonSchema.parse(e.target.value))}
        >
          {findingReasonSchema.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button className={`${button} self-start`} disabled={busy}>
        {busy ? "Saving review…" : "Save finding review"}
      </button>
      <output aria-live="polite">{message}</output>
    </form>
  );
}
