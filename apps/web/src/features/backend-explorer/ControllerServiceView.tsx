"use client";

import { useState } from "react";
import type {
  BackendController,
  BackendService,
  BackendRepository,
} from "@codaryn/contracts";

type ControllerServiceViewProps = {
  controllers: BackendController[];
  services: BackendService[];
  repositories: BackendRepository[];
};

export function ControllerServiceView({
  controllers,
  services,
  repositories,
}: ControllerServiceViewProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "controllers" | "services" | "repositories"
  >("all");
  const [search, setSearch] = useState("");

  const filteredControllers = controllers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.filePath.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredServices = services.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.filePath.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredRepositories = repositories.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.filePath.toLowerCase().includes(search.toLowerCase()),
  );

  const getOrmBadge = (orm: string) => {
    switch (orm.toLowerCase()) {
      case "drizzle":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      case "prisma":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      case "typeorm":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      case "kysely":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Layered Architecture &amp; Dependency Injection
          </h2>
          <p className="text-xs text-zinc-500">
            Controllers, services, repositories, and ORM abstractions discovered
            via static dependency injection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter architecture layers"
            placeholder="Search classes or files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              All Layers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("controllers")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "controllers"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Controllers ({controllers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "services"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Services ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("repositories")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "repositories"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Repositories ({repositories.length})
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(activeTab === "all" || activeTab === "controllers") && (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Controllers ({filteredControllers.length})
              </h3>
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Presentation Layer
              </span>
            </div>
            {filteredControllers.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">
                No controllers discovered.
              </p>
            ) : (
              filteredControllers.map((ctrl) => (
                <div
                  key={ctrl.id}
                  className="flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {ctrl.name}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 capitalize dark:bg-zinc-800 dark:text-zinc-300">
                      {ctrl.framework}
                    </span>
                  </div>
                  {ctrl.basePath && (
                    <div className="font-mono text-[11px] text-zinc-500">
                      Base path: {ctrl.basePath}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{ctrl.routesCount} routes mounted</span>
                    <span className="font-mono text-[10px]">
                      {ctrl.filePath}:{ctrl.sourceEvidence.startLine}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {(activeTab === "all" || activeTab === "services") && (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Services ({filteredServices.length})
              </h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Business Logic Layer
              </span>
            </div>
            {filteredServices.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">
                No services discovered.
              </p>
            ) : (
              filteredServices.map((svc) => (
                <div
                  key={svc.id}
                  className="flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {svc.name}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {svc.filePath}:{svc.sourceEvidence.startLine}
                    </span>
                  </div>
                  {svc.methods.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {svc.methods.map((m) => (
                        <span
                          key={m}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {m}()
                        </span>
                      ))}
                    </div>
                  )}
                  {svc.injectedDependencies.length > 0 && (
                    <div className="text-[11px] text-zinc-500">
                      Injects:{" "}
                      <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {svc.injectedDependencies.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {(activeTab === "all" || activeTab === "repositories") && (
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Repositories &amp; Data Access ({filteredRepositories.length})
              </h3>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Persistence Layer
              </span>
            </div>
            {filteredRepositories.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">
                No repositories discovered.
              </p>
            ) : (
              filteredRepositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex flex-col gap-1.5 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {repo.name}
                    </span>
                    <span
                      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${getOrmBadge(
                        repo.ormType,
                      )}`}
                    >
                      {repo.ormType}
                    </span>
                  </div>
                  {repo.methods.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {repo.methods.map((m) => (
                        <span
                          key={m}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {m}()
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-zinc-400">
                    {repo.filePath}:{repo.sourceEvidence.startLine}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
