"use client";
import { useReportWebVitals } from "next/web-vitals";
import { reportMeasurement } from "@/src/lib/measurements";
function report(metric: { name: string; value: number }) {
  if (metric.name === "LCP" || metric.name === "INP" || metric.name === "CLS")
    reportMeasurement(metric.name, metric.value);
}
export function PerformanceMonitor() {
  useReportWebVitals(report);
  return null;
}
