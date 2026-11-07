"use client";
import {
  analyzerRegistry,
  diagramIds,
  documentIds,
  type StudioConfiguration,
} from "@codaryn/contracts";
import { control } from "@/src/features/repositories/api";
export function ModuleSelection({
  step,
  configuration,
  change,
}: Readonly<{
  step: number;
  configuration: StudioConfiguration;
  change: (next: StudioConfiguration) => void;
}>) {
  const category = ["frontend", "backend", "database", "infrastructure"][
    step - 3
  ];
  if (step >= 3 && step <= 6)
    return (
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-semibold">Select modules</legend>
        {analyzerRegistry
          .filter(
            (item) =>
              item.category === category ||
              (step === 3 && item.category === "foundation"),
          )
          .map((item) => (
            <label
              key={item.id}
              htmlFor={`analyzer-${item.id}`}
              aria-label={item.id}
              className="flex items-start gap-3 rounded-lg border border-dotted border-neutral-300 p-4"
            >
              <input
                id={`analyzer-${item.id}`}
                type="checkbox"
                checked={configuration.analyzers.includes(item.id)}
                onChange={(event) =>
                  change({
                    ...configuration,
                    analyzers: event.target.checked
                      ? [...configuration.analyzers, item.id]
                      : configuration.analyzers.filter((id) => id !== item.id),
                  })
                }
                className="mt-1 accent-neutral-500"
              />
              <span>
                <strong>{item.id}</strong>
                <span className="block text-sm">{item.description}</span>
                <span className="block text-sm text-neutral-600">
                  Requires: {item.dependencies.join(", ") || "none"} · Resource
                  estimate: {item.resource} · Frameworks:{" "}
                  {item.frameworks.join(", ") || "any"}
                </span>
              </span>
            </label>
          ))}
      </fieldset>
    );
  if (step === 7)
    return (
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-semibold">Analysis depth</legend>
        {(["overview", "standard", "deep"] as const).map((depth) => (
          <label key={depth} className="flex gap-3">
            <input
              type="radio"
              name="depth"
              checked={configuration.depth === depth}
              onChange={() => change({ ...configuration, depth })}
            />
            <span>{depth}</span>
          </label>
        ))}
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={configuration.includeTests}
            onChange={(event) =>
              change({ ...configuration, includeTests: event.target.checked })
            }
          />
          <span>Include test files (required for testing analyzer)</span>
        </label>
      </fieldset>
    );
  if (step === 8)
    return (
      <div className="flex flex-col gap-4">
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={configuration.excludeGenerated}
            onChange={(event) =>
              change({
                ...configuration,
                excludeGenerated: event.target.checked,
              })
            }
          />
          <span>Exclude generated files</span>
        </label>
        <label className="flex flex-col gap-2">
          <span>Exclusion globs, one per line</span>
          <textarea
            className={control}
            rows={7}
            maxLength={20100}
            value={configuration.exclusions.join("\n")}
            onChange={(event) =>
              change({
                ...configuration,
                exclusions: event.target.value.split("\n"),
              })
            }
          />
        </label>
        <p className="text-sm">
          Use repository-relative globs such as vendor/**. Up to 100 globs of
          200 characters; absolute paths and traversal are rejected.
        </p>
      </div>
    );
  if (step === 9)
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Diagrams to prepare</legend>
        {diagramIds.map((id) => (
          <label className="flex gap-3" key={id}>
            <input
              type="checkbox"
              checked={configuration.diagrams.includes(id)}
              onChange={(event) =>
                change({
                  ...configuration,
                  diagrams: event.target.checked
                    ? [...configuration.diagrams, id]
                    : configuration.diagrams.filter((value) => value !== id),
                })
              }
            />
            <span>
              {id}
              {id === "dataflow" ? " (requires deep analysis)" : ""}
            </span>
          </label>
        ))}
      </fieldset>
    );
  if (step === 10)
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Documents to prepare</legend>
        {documentIds.map((id) => (
          <label className="flex gap-3" key={id}>
            <input
              type="checkbox"
              checked={configuration.documents.includes(id)}
              onChange={(event) =>
                change({
                  ...configuration,
                  documents: event.target.checked
                    ? [...configuration.documents, id]
                    : configuration.documents.filter((value) => value !== id),
                })
              }
            />
            <span>{id}</span>
          </label>
        ))}
      </fieldset>
    );
  return null;
}
