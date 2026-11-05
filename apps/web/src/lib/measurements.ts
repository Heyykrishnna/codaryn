export function reportMeasurement(
  name: "LCP" | "INP" | "CLS" | "client-error",
  value: number,
) {
  if (!Number.isFinite(value) || value < 0 || value > 3600000) return;
  return fetch("/api/v1/operations/client", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, value }),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => response.ok)
    .catch(() => false);
}
