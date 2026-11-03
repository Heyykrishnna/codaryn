"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import {
  workspaceListSchema,
  workspaceDetailsSchema,
  workspaceInvitationsSchema,
  type WorkspaceSummary,
  type WorkspaceDetails,
} from "@codaryn/contracts";

const auth = createAuthClient();
const inputClass =
  "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-zinc-700";
const buttonClass =
  "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50";

async function request(
  path: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`/api/v1/workspace/${path}`, {
    method: body ? "POST" : "GET",
    headers: body
      ? { "content-type": "application/json", "x-codaryn-request": "workspace" }
      : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session has expired. Sign in again."
        : response.status === 404
          ? "Workspace not found or access denied."
          : "The request failed. Check your input and try again.",
    );
  return response.json();
}

export default function WorkspacePage() {
  const { data: session, isPending, error: sessionError } = auth.useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [details, setDetails] = useState<WorkspaceDetails | null>(null);
  const [invitations, setInvitations] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const list = workspaceListSchema.parse(await request("list"));
    setWorkspaces(list.workspaces);
    const selected = list.active ?? list.workspaces[0]?.id;
    setDetails(
      selected
        ? workspaceDetailsSchema.parse(
            await request(`details?id=${encodeURIComponent(selected)}`),
          )
        : null,
    );
    setInvitations(
      workspaceInvitationsSchema.parse(await request("invitations"))
        .invitations,
    );
  }, []);
  useEffect(() => {
    if (!session) return;
    let current = true;
    void Promise.all([request("list"), request("invitations")])
      .then(async ([rawList, rawInvitations]) => {
        const list = workspaceListSchema.parse(rawList);
        const selected = list.active ?? list.workspaces[0]?.id;
        const detail = selected
          ? workspaceDetailsSchema.parse(
              await request(`details?id=${encodeURIComponent(selected)}`),
            )
          : null;
        const invites = workspaceInvitationsSchema.parse(rawInvitations);
        if (current) {
          setWorkspaces(list.workspaces);
          setDetails(detail);
          setInvitations(invites.invitations);
        }
      })
      .catch(() => {
        if (current) setMessage("Unable to load workspaces. Please retry.");
      });
    return () => {
      current = false;
    };
  }, [session]);
  async function run(operation: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      await refresh();
      setMessage("Changes saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save changes.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (isPending)
    return (
      <main className="p-8" role="status">
        Loading your account…
      </main>
    );
  if (sessionError)
    return (
      <main className="p-8" role="alert">
        Unable to verify your session. Reload to retry.
      </main>
    );
  if (!session)
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
        <Link href="/" className="text-xl font-semibold">
          codaryn
        </Link>
        <h1 className="text-3xl font-semibold">Sign in to your workspace</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Use your GitHub account to manage your workspaces.
        </p>
        <button
          className={buttonClass}
          onClick={() => {
            void auth.signIn
              .social({ provider: "github", callbackURL: "/workspace" })
              .then((result) => {
                if (result.error)
                  setMessage(
                    "GitHub sign-in could not start. Please try again.",
                  );
              })
              .catch(() =>
                setMessage("Sign-in is unavailable. Try again later."),
              );
          }}
        >
          Continue with GitHub
        </button>
        <p role="alert">{message}</p>
      </main>
    );
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-xl font-semibold">
          codaryn
        </Link>
        <button
          className={buttonClass}
          onClick={() => {
            void auth
              .signOut()
              .then((result) => {
                if (result.error) setMessage("Sign out failed. Please retry.");
              })
              .catch(() => setMessage("Sign out failed. Please retry."));
          }}
        >
          Sign out
        </button>
      </header>
      <h1 className="text-3xl font-semibold">Your workspaces</h1>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <button
        className={buttonClass}
        disabled={busy}
        onClick={() => {
          void run(refresh);
        }}
      >
        Refresh
      </button>
      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="my-2 text-sm break-all">Account ID: {session.user.id}</p>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          action={async (form) => {
            setBusy(true);
            try {
              const result = await auth.updateUser({
                name: String(form.get("name")),
              });
              setMessage(
                result.error ? "Profile update failed." : "Profile updated.",
              );
            } catch {
              setMessage("Profile update failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="flex-1">
            Display name
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={session.user.name}
              className={inputClass}
            />
          </label>
          <button className={buttonClass} disabled={busy}>
            Update profile
          </button>
        </form>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Create a workspace</h2>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          action={(form) => {
            void run(() => request("create", { name: form.get("name") }));
          }}
        >
          <input
            aria-label="Workspace name"
            name="name"
            required
            maxLength={100}
            className={inputClass}
          />
          <button className={buttonClass} disabled={busy}>
            Create workspace
          </button>
        </form>
      </section>
      {workspaces.length === 0 && (
        <p>No workspaces yet. Create one or accept an invitation.</p>
      )}
      {workspaces.length > 0 && (
        <label className="flex flex-col gap-2">
          Active workspace
          <select
            className={inputClass}
            value={details?.id ?? ""}
            disabled={busy}
            onChange={(event) => {
              void run(() => request("switch", { id: event.target.value }));
            }}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name} · {workspace.role}
              </option>
            ))}
          </select>
        </label>
      )}
      {details && (
        <section className="flex flex-col gap-6 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">{details.name}</h2>
          {details.role !== "member" && (
            <form
              className="flex flex-col gap-3 sm:flex-row"
              action={(form) => {
                void run(() =>
                  request("rename", { id: details.id, name: form.get("name") }),
                );
              }}
            >
              <input
                aria-label="Workspace display name"
                name="name"
                defaultValue={details.name}
                required
                maxLength={100}
                className={inputClass}
              />
              <button className={buttonClass} disabled={busy}>
                Rename
              </button>
            </form>
          )}
          <h3 className="font-semibold">Members</h3>
          <ul className="flex flex-col gap-4">
            {details.members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="text-sm break-all">
                  {member.userId} · {member.role}
                </span>
                {details.role === "owner" && member.role !== "owner" && (
                  <>
                    <select
                      aria-label={`Role for ${member.userId}`}
                      className={inputClass}
                      disabled={busy}
                      value={member.role}
                      onChange={(event) => {
                        void run(() =>
                          request("member", {
                            id: details.id,
                            userId: member.userId,
                            role: event.target.value,
                          }),
                        );
                      }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className={buttonClass}
                      disabled={busy}
                      onClick={() => {
                        void run(() =>
                          request("member", {
                            id: details.id,
                            userId: member.userId,
                            role: null,
                          }),
                        );
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {details.role !== "member" && (
            <form
              className="flex flex-col gap-3"
              action={(form) => {
                void run(() =>
                  request("invite", {
                    id: details.id,
                    recipientId: form.get("recipientId"),
                    role: form.get("role"),
                  }),
                );
              }}
            >
              <h3 className="font-semibold">Invite an existing account</h3>
              <p className="text-sm">
                Ask your teammate for their account ID. They can accept the
                invitation from their workspace page.
              </p>
              <input
                name="recipientId"
                aria-label="Recipient account ID"
                required
                className={inputClass}
              />
              <select
                name="role"
                aria-label="Invitation role"
                className={inputClass}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className={buttonClass} disabled={busy}>
                Invite
              </button>
            </form>
          )}
          <h3 className="font-semibold">Recent activity</h3>
          <ul>
            {details.events.map((event, index) => (
              <li key={index} className="py-1 text-sm">
                {event.action} · {new Date(event.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
          {details.role !== "owner" && (
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => {
                void run(() =>
                  request("member", {
                    id: details.id,
                    userId: session.user.id,
                    role: null,
                  }),
                );
              }}
            >
              Leave workspace
            </button>
          )}
          {details.role === "owner" && (
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this workspace? Members will lose access.",
                  )
                )
                  void run(() => request("delete", { id: details.id }));
              }}
            >
              Delete workspace
            </button>
          )}
        </section>
      )}
      <section>
        <h2 className="text-lg font-semibold">Invitations</h2>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm">No pending invitations.</p>
        ) : (
          invitations.map((invitation) => (
            <div
              className="mt-3 flex flex-wrap items-center gap-3"
              key={invitation.id}
            >
              <span>
                {invitation.name} · {invitation.role}
              </span>
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() => {
                  void run(() => request("accept", { id: invitation.id }));
                }}
              >
                Accept
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
