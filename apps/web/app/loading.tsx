import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { DashboardPage } from "@/src/components/dashboard-page";

export default function Loading() {
  return (
    <DashboardPage>
      <LoadingIndicator label="Loading section…" />
    </DashboardPage>
  );
}
