import { Suspense } from "react";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { Workbench } from "@/src/features/workbench/workbench";
import { workbenchOrigins } from "@/src/features/workbench/origins.mjs";

export default function WorkbenchPage() {
  const targets = workbenchOrigins(
    process.env.NEXT_PUBLIC_WORKBENCH_ORIGINS,
    process.env.NODE_ENV !== "production",
  );
  return (
    <Suspense fallback={<LoadingIndicator label="Loading API workbench…" />}>
      <Workbench targets={targets} />
    </Suspense>
  );
}
