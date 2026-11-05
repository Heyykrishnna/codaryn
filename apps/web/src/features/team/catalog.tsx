import { useState } from "react";
import { studioPresets } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
import {
  teamUrl,
  useArtifactResource,
  catalogSchema,
  sharesSchema,
  linkSchema,
} from "./api";
export function TeamCatalog({
  actorId,
  workspaceId,
  canShare,
  canExport,
  canPresets,
  refresh,
  onChange,
}: Readonly<{
  actorId: string;
  workspaceId: string;
  canShare: boolean;
  canExport: boolean;
  canPresets: boolean;
  refresh: number;
  onChange: () => void;
}>) {
  const [kind, setKind] = useState("versions"),
    [page, setPage] = useState(1),
    [resource, setResource] = useState(""),
    [recipient, setRecipient] = useState(""),
    [hours, setHours] = useState(24),
    [name, setName] = useState(""),
    [preset, setPreset] = useState("Recommended"),
    [exportJob, setExportJob] = useState(""),
    [format, setFormat] = useState("svg"),
    [target, setTarget] = useState("system"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [link, setLink] = useState("");
  const catalog = useArtifactResource(
      teamUrl("catalog", workspaceId, { kind, page, _retry: refresh }),
      catalogSchema,
    ),
    shares = useArtifactResource(
      teamUrl("shares", workspaceId, { page, _retry: refresh }),
      sharesSchema,
    );
  async function mutate(action: string, input: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    setLink("");
    try {
      if (action === "preset") {
        const selected = studioPresets.find((item) => item.name === preset);
        if (!selected) throw new Error("Select a preset");
        await workspaceRequest(
          "studio",
          "save",
          workspaceId,
          { name, configuration: selected.configuration },
          true,
        );
      } else if (action === "export") {
        const response = await fetch(
          `/api/v1/workspaces/${workspaceId}/analysis/${exportJob}/exports`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-codaryn-request": "workspace",
            },
            body: JSON.stringify({
              jobId: exportJob,
              exportType: "diagram",
              format,
              targetId: target,
            }),
            signal: AbortSignal.timeout(30000),
          },
        );
        if (!response.ok)
          throw new Error(
            "Export request failed. Check access and the selected analysis.",
          );
      } else {
        const result = await workspaceRequest(
          "team",
          action,
          workspaceId,
          input,
          true,
        );
        if (action === "share" || action === "grant")
          setLink(
            new URL(linkSchema.parse(result).url, location.origin).toString(),
          );
      }
      setMessage(
        "Operation completed. Share links require the named recipient's active workspace membership; download links are personal, one-use and expire in five minutes.",
      );
      onChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">
        Saved views, sharing, presets and exports
      </h2>
      <p>
        Shared links expose a frozen, bounded architecture projection with no
        source bodies. Links require sign-in and current access. Token values
        are shown once and are not included in activity logs.
      </p>
      <output aria-live="polite">{message}</output>
      {link && (
        <label className="flex min-w-0 flex-col gap-2">
          Created private link
          <input className={control} value={link} readOnly />
          <a
            href={link}
            className="text-indigo-600 underline dark:text-indigo-400"
            rel="noreferrer"
          >
            Open authorized link
          </a>
        </label>
      )}
      <label className="flex flex-col gap-2">
        Resource catalog
        <select
          className={control}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
            setResource("");
          }}
        >
          {["versions", "views", "exports", "presets"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      {catalog.error && <p role="alert">{catalog.error}</p>}
      {catalog.loading && <output>Loading resources…</output>}
      <ul className="grid gap-3 md:grid-cols-2">
        {catalog.data?.items.map((item) => (
          <li
            key={item.id}
            className="min-w-0 rounded-lg border border-zinc-300 p-4 break-words dark:border-zinc-700"
          >
            <p>
              {item.name ??
                item.commit_sha?.slice(0, 12) ??
                item.target_id ??
                item.id}{" "}
              ·{" "}
              {item.status ?? item.diagram_type ?? `revision ${item.revision}`}
            </p>
            <p className="text-xs break-all">
              {item.id}
              {item.job_id ? ` · analysis ${item.job_id}` : ""}
            </p>
            {canShare &&
              (kind === "views" ||
                (kind === "versions" && item.status === "completed")) && (
                <button
                  className={control}
                  onClick={() => setResource(item.id)}
                >
                  Select for recipient sharing
                </button>
              )}
            {kind === "exports" && canExport && item.status === "completed" && (
              <button
                className={control}
                disabled={busy}
                onClick={() => mutate("grant", { exportId: item.id })}
              >
                Create signed download
              </button>
            )}
          </li>
        ))}
      </ul>
      {catalog.data && !catalog.data.items.length && (
        <p>
          No resources on this page. Create analyses in Studio and save diagram
          layouts in the architecture view.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous resources
        </button>
        <button
          className={control}
          disabled={(catalog.data?.items.length ?? 0) < 50}
          onClick={() => setPage(page + 1)}
        >
          Next resources
        </button>
        <a
          href="/analysis"
          className="text-indigo-600 underline dark:text-indigo-400"
        >
          Open analysis and saved diagrams
        </a>
        <a
          href="/studio"
          className="text-indigo-600 underline dark:text-indigo-400"
        >
          Manage organization presets in Studio
        </a>
      </div>
      {resource && canShare && (
        <form
          className="flex flex-wrap items-end gap-3"
          action={() =>
            mutate("share", {
              kind: kind === "views" ? "diagram" : "version",
              resourceId: resource,
              recipientId: recipient,
              hours,
            })
          }
        >
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            Recipient account ID
            <input
              className={control}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              maxLength={36}
            />
          </label>
          <label className="flex flex-col gap-2">
            Link lifetime in hours
            <input
              className={control}
              type="number"
              min={1}
              max={168}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </label>
          <button className={button} disabled={busy || !recipient}>
            Share selected analysis
          </button>
        </form>
      )}
      {canPresets && (
        <form
          className="flex flex-wrap items-end gap-3"
          action={() => mutate("preset", {})}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            Organization preset name
            <input
              className={control}
              maxLength={100}
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            Starting configuration
            <select
              className={control}
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
            >
              {studioPresets.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <button className={button} disabled={busy || !name}>
            Create organization preset
          </button>
        </form>
      )}
      {canExport && (
        <form
          className="flex flex-wrap items-end gap-3"
          action={() => mutate("export", {})}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            Export analysis job ID
            <input
              className={control}
              value={exportJob}
              onChange={(e) => setExportJob(e.target.value)}
              required
              maxLength={36}
            />
          </label>
          <label className="flex flex-col gap-2">
            Diagram
            <select
              className={control}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {[
                "system",
                "frontend",
                "backend",
                "api",
                "erd",
                "dependencies",
                "execution",
                "infrastructure",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            Format
            <select
              className={control}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              {["svg", "json", "mermaid", "dbml"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button className={button} disabled={busy || !exportJob}>
            Queue frozen export
          </button>
        </form>
      )}
      <h3 className="text-lg font-semibold">Shared resource access</h3>
      {shares.error && <p role="alert">{shares.error}</p>}
      <ul>
        {shares.data?.items.map((share) => (
          <li
            key={share.id}
            className="flex flex-wrap items-center gap-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 break-words">
              {share.resource_kind} · recipient {share.recipient_id} · expires{" "}
              {new Date(share.expires_at).toLocaleString()} ·{" "}
              {share.revoked_at ? "revoked" : "issued"}
            </span>
            {!share.revoked_at &&
              (canPresets || share.actor_id === actorId) && (
                <button
                  className={control}
                  disabled={busy}
                  onClick={() => mutate("share-revoke", { id: share.id })}
                >
                  Revoke share
                </button>
              )}
          </li>
        ))}
      </ul>
      <p>
        Only the creator or an administrator can revoke a share. The server
        checks every open and download.
      </p>
    </section>
  );
}
