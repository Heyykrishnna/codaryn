"use client";

import { useActionState } from "react";
import { validateConfiguration, type ConfigurationState } from "./actions";

const initialState: ConfigurationState = { status: "idle", message: "" };

export function ConfigurationForm() {
  const [state, action, pending] = useActionState(
    validateConfiguration,
    initialState,
  );
  return (
    <form
      action={action}
      className="flex max-w-xl flex-col gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
    >
      <div>
        <h2 className="text-lg font-semibold">Analysis configuration</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Validate a starting configuration. This does not start an analysis.
        </p>
      </div>
      <label
        className="flex flex-col gap-2 text-sm font-medium"
        htmlFor="depth"
      >
        Analysis depth
        <select
          id="depth"
          name="depth"
          defaultValue="standard"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-700"
        >
          <option value="overview">Overview</option>
          <option value="standard">Standard</option>
          <option value="deep">Deep</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="includeTests"
          className="accent-indigo-600"
        />{" "}
        Include test files
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="excludeGenerated"
          defaultChecked
          className="accent-indigo-600"
        />{" "}
        Exclude generated files
      </label>
      <button
        disabled={pending}
        className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
      >
        {pending ? "Validating…" : "Validate configuration"}
      </button>
      <p
        role="status"
        aria-live="polite"
        className={
          state.status === "error"
            ? "text-sm text-red-700 dark:text-red-400"
            : "text-sm text-zinc-600 dark:text-zinc-400"
        }
      >
        {state.message}
      </p>
    </form>
  );
}
