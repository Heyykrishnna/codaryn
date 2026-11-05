import { reportMeasurement } from "./src/lib/measurements";
window.addEventListener("error", () => reportMeasurement("client-error", 1));
window.addEventListener("unhandledrejection", () =>
  reportMeasurement("client-error", 1),
);
