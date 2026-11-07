"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { backendRoutesResponseSchema } from "@codaryn/contracts";
import { z } from "zod";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { useArtifactResource } from "@/src/lib/artifact-resource";
import { control } from "@/src/features/repositories/api";
import {
  importRequests,
  methodSchema,
  readResponse,
  requestUrl,
  type Method,
  type RequestDraft,
} from "./requests";

import { parseStatusTests, statusTestResults } from "./assertions";

const empty: RequestDraft = {
  name: "Request",
  method: "GET",
  path: "/",
  body: "",
};

function substitute(
  value: string,
  previous: unknown,
  encode: (value: unknown) => string,
) {
  return value.replace(/\{\{response\.([\w.]+)\}\}/g, (_, selector: string) => {
    let current = previous;
    for (const key of selector.split(".")) {
      if (
        current === null ||
        typeof current !== "object" ||
        !Object.hasOwn(current, key)
      ) {
        throw new Error(`Previous response has no value for ${selector}.`);
      }
      current = Reflect.get(current, key);
    }
    return encode(current);
  });
}

export function Workbench({ targets }: { targets: string[] }) {
  const params = useSearchParams();
  const workspace = z.uuid().safeParse(params.get("workspaceId")).data;
  const job = z.uuid().safeParse(params.get("jobId")).data;
  return (
    <WorkspaceExplorer
      title="API workbench"
      description="Send requests from your browser to an approved test origin."
      initialWorkspaceId={workspace}
    >
      {(workspaceId) => (
        <RequestPanel
          key={workspaceId}
          workspaceId={workspaceId}
          jobId={workspaceId === workspace ? job : undefined}
          targets={targets}
        />
      )}
    </WorkspaceExplorer>
  );
}

function RequestPanel({
  workspaceId,
  jobId,
  targets,
}: {
  workspaceId: string;
  jobId?: string;
  targets: string[];
}) {
  const catalog = useArtifactResource(
    jobId
      ? `/api/v1/backend/routes?${new URLSearchParams({ workspaceId, jobId })}`
      : null,
    backendRoutesResponseSchema,
  );
  const [draft, setDraft] = useState<RequestDraft>(empty);
  const [detected, setDetected] = useState("");
  const [origin, setOrigin] = useState(targets[0] ?? "");
  const [token, setToken] = useState("");
  const [accept, setAccept] = useState("application/json");
  const [imported, setImported] = useState<RequestDraft[]>([]);
  const [importChoice, setImportChoice] = useState("");
  const [queue, setQueue] = useState<RequestDraft[]>([]);
  const [script, setScript] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const socketTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const websocket = /^wss?:/.test(origin);
  const routeOptions = (catalog.data?.routes ?? []).flatMap((route) => {
    const method = methodSchema.safeParse(
      route.method === "ALL" ? "GET" : route.method,
    );
    return method.success ? [{ route, method: method.data }] : [];
  });

  useEffect(
    () => () => {
      active.current?.abort();
      socket.current?.close();
      if (socketTimer.current) clearTimeout(socketTimer.current);
    },
    [],
  );

  async function run(requests: RequestDraft[]) {
    if (active.current || socket.current) return;
    const controller = new AbortController();
    active.current = controller;
    setMessage("");
    setOutput("");
    setBusy(true);
    let previous: unknown;
    let history = "";
    try {
      const assertions = parseStatusTests(script);
      for (const request of requests) {
        const path = substitute(request.path, previous, (value) =>
          encodeURIComponent(String(value)),
        );
        const url = requestUrl(origin, path, targets, window.location.hostname);
        const body = substitute(
          request.body,
          previous,
          (value) => JSON.stringify(value) ?? "null",
        );
        if (!["http:", "https:"].includes(url.protocol) || body.length > 65536)
          throw new Error(
            "Choose an HTTP origin and keep the request body below 64 KiB.",
          );
        const response = await fetch(url, {
          method: request.method,
          redirect: "error",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          headers: {
            Accept: accept,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body && request.method !== "GET" && request.method !== "HEAD"
              ? { "Content-Type": "application/json" }
              : {}),
          },
          body:
            request.method === "GET" || request.method === "HEAD"
              ? undefined
              : body || undefined,
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(20000),
          ]),
        });
        const heading = `${request.method} ${path} · ${response.status}\n`;
        const text = await readResponse(response, (stream) =>
          setOutput(`${history}${heading}${stream}`),
        );
        history += `${heading}${text}\n\n`;
        setOutput(history);
        const results = statusTestResults(assertions, response.status);
        if (results.length) {
          history +=
            results
              .map(
                (result) =>
                  `${result.passed ? "PASS" : "FAIL"} ${result.name} (expected ${result.expected}, received ${result.actual})`,
              )
              .join("\n") + "\n\n";
          setOutput(history);
        }
        if (!response.ok || results.some((result) => !result.passed)) {
          setMessage(
            "The run stopped at an unsuccessful response or assertion.",
          );
          return;
        }
        try {
          previous = JSON.parse(text);
        } catch {
          previous = undefined;
        }
      }
      setMessage("Request run finished.");
    } catch (error) {
      setMessage(
        controller.signal.aborted
          ? "Request cancelled."
          : error instanceof TypeError
            ? "Could not reach the test API. Check its CORS settings and the configured origin."
            : error instanceof Error
              ? error.message
              : "Request failed.",
      );
    } finally {
      active.current = null;
      setBusy(false);
    }
  }

  function connectSocket() {
    if (active.current || socket.current) return;
    setMessage("");
    setOutput("");
    try {
      const url = requestUrl(
        origin,
        draft.path,
        targets,
        window.location.hostname,
      );
      if (!["ws:", "wss:"].includes(url.protocol) || draft.body.length > 65536)
        throw new Error(
          "Choose a WebSocket origin and keep the message below 64 KiB.",
        );
      const connection = new WebSocket(url);
      socket.current = connection;
      setBusy(true);
      let history = "";
      socketTimer.current = setTimeout(() => connection.close(), 20000);
      connection.onopen = () => {
        setMessage("WebSocket connected.");
        if (draft.body) connection.send(draft.body);
      };
      connection.onmessage = (event) => {
        const chunk =
          typeof event.data === "string" ? event.data : "[Binary frame]";
        history += `${chunk.slice(0, 65536 - history.length)}\n`;
        setOutput(history);
        if (history.length >= 65536) connection.close();
      };
      connection.onerror = () => setMessage("WebSocket connection failed.");
      connection.onclose = () => {
        if (socketTimer.current) clearTimeout(socketTimer.current);
        socket.current = null;
        setBusy(false);
        setMessage((value) =>
          value === "WebSocket connection failed."
            ? value
            : "WebSocket closed.",
        );
      };
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not open WebSocket.",
      );
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <section
        aria-label="Request setup"
        className="border-border bg-card min-w-0 space-y-4 rounded-xl border border-dotted p-4"
      >
        {catalog.loading && (
          <LoadingIndicator variant="inline" label="Loading detected routes…" />
        )}
        {catalog.error && (
          <p role="alert" className="text-sm">
            {catalog.error}
          </p>
        )}
        {catalog.data && (
          <DropdownSelect
            label="Detected route"
            searchable
            value={detected}
            options={routeOptions.map(({ route }) => ({
              value: route.id,
              label: `${route.method} ${route.path}`,
              description: route.filePath,
            }))}
            placeholder="Select a detected route"
            onChange={(id) => {
              const choice = routeOptions.find(({ route }) => route.id === id);
              if (!choice) return;
              setDetected(id);
              setDraft({
                name: choice.route.handlerName,
                method: choice.method,
                path: choice.route.path,
                body: "",
              });
            }}
          />
        )}
        <label className="block space-y-2 text-sm">
          <span>Import collection JSON</span>
          <input
            type="file"
            accept=".json,application/json"
            className={`${control} block w-full`}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setMessage("");
              try {
                if (file.size > 1024 * 1024)
                  throw new Error("Collections must be smaller than 1 MiB.");
                const requests = importRequests(JSON.parse(await file.text()));
                setImported(requests);
                setImportChoice("");
                setMessage(
                  requests.length
                    ? `Imported ${requests.length} request templates. Review paths and bodies before sending.`
                    : "No supported request templates found.",
                );
              } catch {
                setMessage(
                  "Import a valid OpenAPI, Postman, or Insomnia JSON export under 1 MiB.",
                );
              }
            }}
          />
        </label>
        {imported.length > 0 && (
          <DropdownSelect
            label="Imported request"
            searchable
            value={importChoice}
            options={imported.map((item, index) => ({
              value: String(index),
              label: item.name,
              description: item.path,
            }))}
            onChange={(value) => {
              const request = imported[Number(value)];
              if (request) {
                setDraft(request);
                setImportChoice(value);
              }
            }}
          />
        )}
        {!targets.length && (
          <p className="text-muted text-xs">
            An administrator must configure a workbench test origin before
            sending requests.
          </p>
        )}
        <label className="block space-y-2 text-sm">
          <span>Test origin</span>
          <select
            className={`${control} block w-full`}
            value={origin}
            onChange={(event) => {
              setOrigin(event.target.value);
              setToken("");
            }}
          >
            {!targets.length && (
              <option value="">No test origins configured</option>
            )}
            {targets.map((target) => (
              <option key={target}>{target}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {!websocket && (
            <select
              aria-label="HTTP method"
              className={control}
              value={draft.method}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  method: methodSchema.parse(event.target.value),
                })
              }
            >
              {methodSchema.options.map((method: Method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          )}
          <input
            aria-label="Relative path"
            maxLength={2048}
            className={`${control} min-w-40 flex-1`}
            value={draft.path}
            onChange={(event) =>
              setDraft({ ...draft, path: event.target.value })
            }
          />
        </div>
        {!websocket && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              aria-label="Bearer access token"
              placeholder="Bearer access token (optional)"
              autoComplete="off"
              type="password"
              maxLength={4096}
              className={control}
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <select
              aria-label="Response format"
              className={control}
              value={accept}
              onChange={(event) => setAccept(event.target.value)}
            >
              <option value="application/json">JSON response</option>
              <option value="text/event-stream">Server-sent events</option>
              <option value="*/*">Any response</option>
            </select>
          </div>
        )}
        <textarea
          aria-label={websocket ? "WebSocket message" : "Request body"}
          maxLength={65536}
          placeholder={
            websocket
              ? "Optional message to send on connect"
              : "Optional JSON request body"
          }
          className={`${control} min-h-24 w-full font-mono`}
          value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })}
        />
        {!websocket && (
          <details className="border-border rounded-lg border border-dotted p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Response assertions
            </summary>
            <label className="text-muted mt-2 block space-y-2 text-xs">
              <span>
                One Postman-style status assertion per line. Assertions run
                against each response.
              </span>
              <textarea
                maxLength={4096}
                className={`${control} block w-full font-mono`}
                value={script}
                onChange={(event) => setScript(event.target.value)}
                placeholder={
                  'pm.test("OK", () => { pm.response.to.have.status(200); });'
                }
              />
            </label>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          <CandyButton
            variant="pearl"
            disabled={!origin || busy}
            onClick={() => (websocket ? connectSocket() : void run([draft]))}
          >
            {websocket ? "Connect" : "Send request"}
          </CandyButton>
          {!websocket && (
            <CandyButton
              disabled={busy || queue.length >= 8}
              onClick={() => setQueue([...queue, draft])}
            >
              Add to chain
            </CandyButton>
          )}
          {busy && (
            <CandyButton
              onClick={() => {
                active.current?.abort();
                socket.current?.close();
              }}
            >
              Stop
            </CandyButton>
          )}
        </div>
        {queue.length > 0 && !websocket && (
          <section
            className="border-border space-y-2 border-t border-dotted pt-3"
            aria-label="Request chain"
          >
            <p className="text-muted text-xs">
              Run requests in order. Use {"{{response.field}}"} to reference the
              previous JSON response.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-xs">
              {queue.map((request, index) => (
                <li key={index} className="break-all">
                  {request.method} {request.path}
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <CandyButton
                disabled={!origin || busy}
                onClick={() => run(queue)}
              >
                Run chain
              </CandyButton>
              <CandyButton disabled={busy} onClick={() => setQueue([])}>
                Clear chain
              </CandyButton>
            </div>
          </section>
        )}
      </section>
      <section
        aria-label="Response"
        className="border-border bg-card min-w-0 space-y-3 rounded-xl border border-dotted p-4"
      >
        <h2 className="font-semibold">Response</h2>
        {busy && (
          <LoadingIndicator variant="inline" label="Waiting for response…" />
        )}
        {message && (
          <p role="status" className="text-muted text-sm break-words">
            {message}
          </p>
        )}
        <pre className="max-h-[65vh] overflow-auto rounded-lg bg-neutral-50 p-3 font-mono text-xs break-all whitespace-pre-wrap">
          {output || "Responses appear here after you send a request."}
        </pre>
      </section>
    </div>
  );
}
