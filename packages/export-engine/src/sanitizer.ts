const secretPatterns = [
  /ghp_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /xox[baprs]-[a-zA-Z0-9-]+/g,
  /bearer\s+[a-zA-Z0-9._~+/-]{20,}/gi,
  /password\s*[:=]\s*["'][^"']+["']/gi,
  /client_secret\s*[:=]\s*["'][^"']+["']/gi,
];

export function sanitizeExportContent(content: string): string {
  let sanitized = content;
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replaceAll(pattern, "[REDACTED_SECRET]");
  }
  return sanitized;
}
