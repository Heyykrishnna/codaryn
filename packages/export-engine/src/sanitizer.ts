const secretPatterns: RegExp[] = [
  /gh[pousr]_[a-zA-Z0-9]{36,255}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /xox[baprs]-[a-zA-Z0-9-]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[^-]+-----END (?:[A-Z]+ )?PRIVATE KEY-----/gs,
  /(?:password|passwd|secret|api_key|apikey|auth_token)\s*[:=]\s*["'][^"'\r\n]{4,}["']/gi,
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /(postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/([^:]+):([^@]+)@/gi,
];

export function sanitizeExportContent(content: string): string {
  let sanitized = content;
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replaceAll(pattern, (...args: unknown[]) => {
      const p1 = typeof args[1] === "string" ? args[1] : undefined;
      const p2 = typeof args[2] === "string" ? args[2] : undefined;
      const p3 = typeof args[3] === "string" ? args[3] : undefined;
      if (p1 && p2 && p3) {
        return `${p1}://${p2}:[REDACTED_PASSWORD]@`;
      }
      return "[REDACTED_SECRET]";
    });
  }
  return sanitized;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replaceAll(/[\r\n\0]/g, "")
    .replaceAll(/[/\\]/g, "_")
    .replaceAll(/\.\.+/g, "_")
    .trim();
}
