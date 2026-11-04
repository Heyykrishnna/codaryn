import React, { lazy, Suspense } from "react";

const LazyChart = lazy(() => import("./HeavyChart"));

export function DynamicLoader() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <LazyChart />
    </Suspense>
  );
}
