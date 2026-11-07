"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { sharedProjectionSchema } from "@codaryn/contracts";
import type { z } from "zod";
import { authClient } from "@/src/lib/auth-client";
import { button } from "@/src/features/repositories/api";
function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
const fragment = () => window.location.hash.slice(1),
  empty = () => "";
export function AccessPortal({
  download = false,
}: Readonly<{ download?: boolean }>) {
  const session = authClient.useSession();
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <meta name="referrer" content="no-referrer" />
      <Link href="/team" className="text-neutral-800 underline">
        Organization dashboard
      </Link>
      <h1 className="text-3xl font-semibold">
        {download ? "Signed export download" : "Shared architecture view"}
      </h1>
      {session.isPending ? (
        <output>Checking your session…</output>
      ) : session.error ? (
        <p role="alert">Unable to check your session. Reload to retry.</p>
      ) : !session.data ? (
        <p>
          <Link href="/workspace" className="text-neutral-800 underline">
            Sign in
          </Link>{" "}
          with the authorized account, then reopen this private link.
        </p>
      ) : (
        <PortalContent
          key={`${session.data.user.id}:${download}`}
          download={download}
        />
      )}
    </main>
  );
}
function PortalContent({ download }: Readonly<{ download: boolean }>) {
  const token = useSyncExternalStore(subscribe, fragment, empty),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [opened, setOpened] = useState<{
      token: string;
      projection: z.infer<typeof sharedProjectionSchema>;
    } | null>(null),
    [used, setUsed] = useState(false);
  const valid = download
    ? /^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token)
    : /^[A-Za-z0-9_-]{43}$/.test(token);
  async function open() {
    setBusy(true);
    setMessage("");
    try {
      const [id, signature] = token.split("."),
        response = await fetch(
          `/api/v1/team/${download ? "redeem" : "shared"}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-codaryn-request": "workspace",
            },
            body: JSON.stringify(download ? { id, signature } : { token }),
            cache: "no-store",
            referrerPolicy: "no-referrer",
            signal: AbortSignal.timeout(30000),
          },
        );
      if (!response.ok)
        throw new Error(
          "This link is unavailable. Check the signed-in account, current permissions, expiry and whether it was revoked or already used.",
        );
      if (download) {
        const blob = await response.blob(),
          url = URL.createObjectURL(blob),
          anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          /filename="([^"]+)"/.exec(
            response.headers.get("content-disposition") ?? "",
          )?.[1] ?? "export";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        setUsed(true);
        setMessage("Export prepared. This one-use link has been consumed.");
        history.replaceState(null, "", location.pathname);
      } else
        setOpened({
          token,
          projection: sharedProjectionSchema.parse(await response.json()),
        });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to open this private resource.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        {download
          ? "Personal, one-use download links expire after five minutes and require current export permission."
          : "Only the named recipient or creator with current workspace and repository access can open this frozen view. Source code bodies are excluded."}
      </p>
      <button
        className={`${button} self-start`}
        disabled={!valid || busy || used}
        onClick={open}
      >
        {busy
          ? "Checking access…"
          : download
            ? "Download authorized export"
            : "Open shared analysis"}
      </button>
      {!valid && !used && (
        <p role="alert">
          The private link token is missing or malformed. Reopen the complete
          link supplied by its creator.
        </p>
      )}
      <output aria-live="polite">{message}</output>
      {opened?.token === token && (
        <SharedProjection projection={opened.projection} />
      )}
    </>
  );
}
function SharedProjection({
  projection,
}: Readonly<{ projection: z.infer<typeof sharedProjectionSchema> }>) {
  const width = 1000,
    height = Math.max(100, Math.ceil(projection.nodes.length / 4) * 90),
    positions = new Map(
      projection.nodes.map((node, index) => [
        node.id,
        { x: 20 + (index % 4) * 245, y: 20 + Math.floor(index / 4) * 90 },
      ]),
    );
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-xl font-semibold">{projection.name}</h2>
      <p className="text-xs break-all">
        Commit {projection.commitSha} · source fingerprint {projection.hash}
      </p>
      <p>
        {projection.nodes.length} visible nodes · {projection.edges.length}{" "}
        relationships
        {projection.truncated
          ? " · bounded projection, additional evidence omitted"
          : ""}
      </p>
      <div className="max-h-96 overflow-auto rounded-xl border border-dotted border-neutral-300">
        <svg
          className="w-full min-w-160"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Read-only shared architecture graph"
        >
          <title>Frozen shared architecture projection</title>
          {projection.edges.map((edge, index) => {
            const from = positions.get(edge.source),
              to = positions.get(edge.target);
            return from && to ? (
              <line
                key={index}
                x1={from.x + 105}
                y1={from.y + 25}
                x2={to.x + 105}
                y2={to.y + 25}
                className="stroke-neutral-400"
              />
            ) : null;
          })}
          {projection.nodes.map((node) => {
            const point = positions.get(node.id);
            return point ? (
              <g key={node.id}>
                <title>{node.label}</title>
                <rect
                  x={point.x}
                  y={point.y}
                  width={210}
                  height={50}
                  rx={8}
                  className="fill-neutral-800 stroke-neutral-500"
                />
                <text
                  x={point.x + 10}
                  y={point.y + 28}
                  className="fill-neutral-900 text-xs"
                >
                  {node.label.slice(0, 30)}
                </text>
              </g>
            ) : null;
          })}
        </svg>
      </div>
      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {projection.nodes.map((node) => (
          <li key={node.id} className="break-words">
            {node.kind} · {node.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
