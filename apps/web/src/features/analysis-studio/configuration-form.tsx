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
      className="flex max-w-xl flex-col gap-5 rounded-xl border border-dotted border-neutral-200 p-6"
    >
      <div>
        <h2 className="text-lg font-semibold">Analysis configuration</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Validate a starting configuration. This does not start an analysis.
        </p>
      </div>
      <label
        className="flex flex-col gap-2 text-sm font-medium"
        htmlFor="depth"
      >
        <span>Analysis depth</span>
        <select
          id="depth"
          name="depth"
          defaultValue="standard"
          className="rounded-md border border-dotted border-neutral-300 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
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
          className="accent-neutral-500"
        />{" "}
        <span>Include test files</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="excludeGenerated"
          defaultChecked
          className="accent-neutral-500"
        />{" "}
        <span>Exclude generated files</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 disabled:opacity-50"
      >
        {pending ? "Validating…" : "Validate configuration"}
      </button>
      <output
        aria-live="polite"
        className={
          state.status === "error"
            ? "text-sm text-neutral-800"
            : "text-sm text-neutral-600"
        }
      >
        {state.message}
      </output>
    </form>
  );
}
