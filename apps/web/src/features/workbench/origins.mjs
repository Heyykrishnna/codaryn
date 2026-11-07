export function workbenchOrigins(value = "", development = false) {
  const origins = [];
  for (const entry of value.split(",").slice(0, 20)) {
    try {
      const url = new URL(entry.trim());
      const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(
        url.hostname,
      );
      const allowed =
        ["https:", "wss:"].includes(url.protocol) ||
        (development && loopback && ["http:", "ws:"].includes(url.protocol));
      if (
        allowed &&
        !url.username &&
        !url.password &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      ) {
        origins.push(url.origin);
      }
    } catch {
      continue;
    }
  }
  return [...new Set(origins)];
}
