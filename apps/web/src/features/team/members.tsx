import { useState } from "react";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
import { teamUrl, useArtifactResource, membersSchema } from "./api";
export function TeamMembers({
  workspaceId,
  canManage,
  refresh,
  onChange,
}: Readonly<{
  workspaceId: string;
  canManage: boolean;
  refresh: number;
  onChange: () => void;
}>) {
  const [page, setPage] = useState(1),
    [recipient, setRecipient] = useState(""),
    [role, setRole] = useState("member"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const list = useArtifactResource(
    teamUrl("members", workspaceId, { page, _retry: refresh }),
    membersSchema,
  );
  async function update(action: string, input: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await workspaceRequest(
        "workspace",
        action,
        workspaceId,
        { id: workspaceId, ...input },
        true,
      );
      setMessage(
        "Membership action saved. Invitations must be accepted by the recipient.",
      );
      onChange();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Membership update failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Members and roles</h2>
      <p>
        Owners manage admin/member roles. The owner role is protected. Invite an
        existing user account ID; the recipient accepts the invitation in
        Workspace settings.
      </p>
      {list.error && <p role="alert">{list.error}</p>}
      {list.loading && <output>Loading members…</output>}
      <output aria-live="polite">{message}</output>
      <ul className="flex flex-col gap-2">
        {list.data?.items.map((member) => (
          <li
            key={member.userId}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700"
          >
            <span className="min-w-0 flex-1 text-sm break-all">
              {member.userId} · {member.role}
            </span>
            {canManage && member.role !== "owner" && (
              <>
                <button
                  className={control}
                  disabled={busy}
                  onClick={() =>
                    update("member", {
                      userId: member.userId,
                      role: member.role === "member" ? "admin" : "member",
                    })
                  }
                >
                  {member.role === "member"
                    ? "Make administrator"
                    : "Make member"}
                </button>
                <button
                  className={control}
                  disabled={busy}
                  onClick={() =>
                    update("member", { userId: member.userId, role: null })
                  }
                >
                  Remove member
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <form
          className="flex flex-wrap items-end gap-3"
          action={() => update("invite", { recipientId: recipient, role })}
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
            Invitation role
            <select
              className={control}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <button className={button} disabled={busy || !recipient}>
            Create invitation
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous members
        </button>
        <button
          className={control}
          disabled={(list.data?.items.length ?? 0) < 50}
          onClick={() => setPage(page + 1)}
        >
          Next members
        </button>
        <a
          href="/workspace"
          className="text-indigo-600 underline dark:text-indigo-400"
        >
          Workspace settings and invitations
        </a>
      </div>
    </section>
  );
}
