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
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "prisma":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "typeorm":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "kysely":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200   ";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            Layered Architecture &amp; Dependency Injection
          </h2>
          <p className="text-xs text-neutral-600">
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
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          />

          <div className="flex rounded-lg border border-dotted border-neutral-200 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-white text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              All Layers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("controllers")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "controllers"
                  ? "bg-white text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Controllers ({controllers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "services"
                  ? "bg-white text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Services ({services.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("repositories")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === "repositories"
                  ? "bg-white text-neutral-950"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Repositories ({repositories.length})
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(activeTab === "all" || activeTab === "controllers") && (
          <div className="flex flex-col gap-3 rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                Controllers ({filteredControllers.length})
              </h3>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-800">
                Presentation Layer
              </span>
            </div>
            {filteredControllers.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-600">
                No controllers discovered.
              </p>
            ) : (
              filteredControllers.map((ctrl) => (
                <div
                  key={ctrl.id}
                  className="flex flex-col gap-1.5 rounded-md border border-dotted border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {ctrl.name}
                    </span>
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600 capitalize">
                      {ctrl.framework}
                    </span>
                  </div>
                  {ctrl.basePath && (
                    <div className="font-mono text-[11px] text-neutral-600">
                      Base path: {ctrl.basePath}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-neutral-600">
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
          <div className="flex flex-col gap-3 rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                Services ({filteredServices.length})
              </h3>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-800">
                Business Logic Layer
              </span>
            </div>
            {filteredServices.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-600">
                No services discovered.
              </p>
            ) : (
              filteredServices.map((svc) => (
                <div
                  key={svc.id}
                  className="flex flex-col gap-1.5 rounded-md border border-dotted border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {svc.name}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-600">
                      {svc.filePath}:{svc.sourceEvidence.startLine}
                    </span>
                  </div>
                  {svc.methods.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {svc.methods.map((m) => (
                        <span
                          key={m}
                          className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600"
                        >
                          {m}()
                        </span>
                      ))}
                    </div>
                  )}
                  {svc.injectedDependencies.length > 0 && (
                    <div className="text-[11px] text-neutral-600">
                      Injects:{" "}
                      <span className="font-mono font-medium text-neutral-700">
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
          <div className="flex flex-col gap-3 rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                Repositories &amp; Data Access ({filteredRepositories.length})
              </h3>
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-800">
                Persistence Layer
              </span>
            </div>
            {filteredRepositories.length === 0 ? (
              <p className="py-4 text-center text-xs text-neutral-600">
                No repositories discovered.
              </p>
            ) : (
              filteredRepositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex flex-col gap-1.5 rounded-md border border-dotted border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-900">
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
                          className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600"
                        >
                          {m}()
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-neutral-600">
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
