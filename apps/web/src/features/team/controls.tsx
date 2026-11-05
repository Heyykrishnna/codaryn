import { useState } from "react";
import { z } from "zod";
import {
  workspaceControlsSchema,
  retentionPreviewSchema,
} from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
export function TeamControls({
  workspaceId,
  settings,
  onChange,
}: Readonly<{
  workspaceId: string;
  settings: z.infer<typeof workspaceControlsSchema>;
  onChange: () => void;
}>) {
  const [days, setDays] = useState(settings.retentionDays),
    [enabled, setEnabled] = useState(settings.retentionEnabled),
    [sharing, setSharing] = useState(settings.allowMemberSharing),
    [exports, setExports] = useState(settings.allowMemberExports),
    [preview, setPreview] = useState<z.infer<
      typeof retentionPreviewSchema
    > | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function action(kind: string, input: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const result = await workspaceRequest(
        "team",
        kind,
        workspaceId,
        input,
        kind !== "retention-preview",
      );
      if (kind === "retention-preview") {
        setPreview(retentionPreviewSchema.parse(result));
        setConfirmed(false);
      } else {
        setPreview(null);
        setMessage("Workspace operation completed.");
        onChange();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Workspace operation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
      <h2 className="text-xl font-semibold">
        Workspace controls and retention
      </h2>
      <p>
        Role and retention changes require a recent sign-in. Retention is
        disabled by default and only runs after you review a fresh preview.
        Running jobs, current snapshots, active shares, baseline/comparison
        references and unused valid download grants are protected.
      </p>
      <output aria-live="polite">{message}</output>
      <form
        className="flex flex-col gap-3"
        action={() =>
          action("settings", {
            revision: settings.revision,
            retentionDays: days,
            retentionEnabled: enabled,
            allowMemberSharing: sharing,
            allowMemberExports: exports,
          })
        }
      >
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={sharing}
            onChange={(e) => setSharing(e.target.checked)}
          />
          Allow members to create recipient-bound architecture shares
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={exports}
            onChange={(e) => setExports(e.target.checked)}
          />
          Allow members to generate and download exports
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable manual retention operations
        </label>
        <label className="flex flex-col gap-2">
          Retention age in days
          <input
            className={control}
            type="number"
            min={7}
            max={3650}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
          />
        </label>
        <button className={`${button} self-start`} disabled={busy}>
          Save workspace controls
        </button>
      </form>
      <button
        className={`${control} self-start`}
        disabled={busy || !settings.retentionEnabled}
        onClick={() => action("retention-preview", {})}
      >
        Preview eligible retained data
      </button>
      {preview && (
        <>
          <p>
            {preview.candidates.length} eligible objects in this bounded batch.
            Applying retention permanently deletes exactly these objects if the
            preview is still current.
          </p>
          <ul className="max-h-64 overflow-auto text-sm">
            {preview.candidates.map((item) => (
              <li key={`${item.kind}:${item.id}`}>
                {item.kind} · {item.id}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-3">
            <input
              className="mt-1"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              I reviewed this batch and understand deletion is permanent.
            </span>
          </label>
          <button
            className={`${control} self-start`}
            disabled={busy || !confirmed || !preview.candidates.length}
            onClick={() =>
              action("retention-apply", {
                revision: preview.revision,
                hash: preview.hash,
              })
            }
          >
            Apply reviewed retention batch
          </button>
        </>
      )}
    </section>
  );
}
