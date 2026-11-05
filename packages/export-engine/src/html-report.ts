function escapeHtml(unsafe: string): string {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderPrintableHtml(
  title: string,
  markdown: string,
  svgPreview?: string,
): string {
  const lines = markdown.split("\n");
  const htmlBodyParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      htmlBodyParts.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      htmlBodyParts.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      htmlBodyParts.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      htmlBodyParts.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else if (line.trim().length > 0) {
      htmlBodyParts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #0f172a; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #1e293b; }
    h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; color: #334155; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    p { margin: 8px 0; }
    li { margin: 4px 0; }
    .diagram-container { margin: 24px 0; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f8fafc; text-align: center; }
    @media print { body { max-width: 100%; margin: 0; padding: 0; } }
  </style>
</head>
<body>
  ${svgPreview ? `<div class="diagram-container">${svgPreview}</div>` : ""}
  ${htmlBodyParts.join("\n")}
</body>
</html>`;
}
