import path from "node:path";
import type {
  FileLanguage,
  FileRole,
  SourceFileClassification,
} from "@codaryn/contracts";

export type FileInput = {
  path: string;
  content?: string;
  sizeBytes?: number;
};

const testPatterns = [
  /\.test\.[cm]?[jt]sx?$/,
  /\.spec\.[cm]?[jt]sx?$/,
  /(?:^|\/)__tests__\//,
  /(?:^|\/)tests?\//,
  /(?:^|\/)fixtures?\//,
];

const configPatterns = [
  /(?:^|\/)tsconfig(?:\.[^/]+)?\.json$/,
  /(?:^|\/)package\.json$/,
  /(?:^|\/)eslint\.config\.[cm]?[jt]s$/,
  /(?:^|\/)\.eslintrc(?:\.[^/]+)?$/,
  /(?:^|\/)prettier(?:\.config)?\.[^/]+$/,
  /(?:^|\/)\.prettierrc(?:\.[^/]+)?$/,
  /(?:^|\/)turbo\.json$/,
  /(?:^|\/)docker-compose(?:\.[^/]+)?\.ya?ml$/,
  /(?:^|\/)Dockerfile(?:\.[^/]+)?$/,
  /(?:^|\/)\.github\//,
  /(?:^|\/)\.env(?:\.[^/]+)?$/,
];

const documentationExtensions = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".rst",
  ".adoc",
]);

const assetExtensions = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".css",
  ".scss",
  ".less",
  ".woff",
  ".woff2",
  ".ttf",
]);

const languageByExtension = new Map<string, FileLanguage>([
  [".ts", "typescript"],
  [".mts", "typescript"],
  [".cts", "typescript"],
  [".tsx", "tsx"],
  [".js", "javascript"],
  [".mjs", "javascript"],
  [".cjs", "javascript"],
  [".jsx", "jsx"],
  [".json", "json"],
  [".py", "python"],
  [".java", "java"],
  [".kt", "kotlin"],
  [".kts", "kotlin"],
  [".go", "go"],
  [".rs", "rust"],
  [".rb", "ruby"],
  [".php", "php"],
  [".swift", "swift"],
  [".dart", "dart"],
  [".cs", "csharp"],
]);

export function detectLanguage(filePath: string): {
  language: FileLanguage;
  extension: string;
} {
  const extension = path.extname(filePath).toLowerCase();
  return {
    language: languageByExtension.get(extension) ?? "unknown",
    extension,
  };
}

const unitManifests = new Set([
  "package.json",
  "go.mod",
  "go.work",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "composer.json",
  "Package.swift",
  "pubspec.yaml",
  "serverless.yml",
  "serverless.yaml",
  "cdk.json",
  "samconfig.toml",
]);

export function isAnalysisManifest(filePath: string) {
  return (
    unitManifests.has(path.basename(filePath)) || filePath.endsWith(".csproj")
  );
}

export function detectRole(
  filePath: string,
  language: FileLanguage,
  extension: string,
): FileRole {
  const normalized = filePath.replace(/\\/g, "/");
  const basename = path.basename(normalized);

  if (basename.endsWith(".d.ts")) {
    return "declaration";
  }

  for (const pattern of testPatterns) {
    if (pattern.test(normalized)) {
      return "test";
    }
  }

  if (isAnalysisManifest(normalized)) return "config";

  for (const pattern of configPatterns) {
    if (pattern.test(normalized)) {
      return "config";
    }
  }

  if (documentationExtensions.has(extension) || basename === "LICENSE") {
    return "documentation";
  }

  if (assetExtensions.has(extension)) {
    return "asset";
  }

  if (language !== "unknown" && language !== "json") return "source";

  return "other";
}

export function detectFrameworks(filePath: string, content?: string): string[] {
  const detected = new Set<string>();
  const normalized = filePath.replace(/\\/g, "/");

  if (normalized.endsWith(".tsx") || normalized.endsWith(".jsx")) {
    detected.add("react");
  }

  if (content) {
    if (
      content.includes("from 'react'") ||
      content.includes('from "react"') ||
      content.includes("import React")
    ) {
      detected.add("react");
    }
    if (
      content.includes("from 'next") ||
      content.includes('from "next') ||
      normalized.includes("/app/") ||
      normalized.includes("/pages/")
    ) {
      detected.add("next");
    }
    if (
      content.includes("from 'fastify'") ||
      content.includes('from "fastify"') ||
      content.includes("FastifyInstance")
    ) {
      detected.add("fastify");
    }
    if (
      content.includes("from 'express'") ||
      content.includes('from "express"') ||
      content.includes("express()")
    ) {
      detected.add("express");
    }
    if (
      content.includes("@tailwindcss") ||
      content.includes("tailwindcss") ||
      normalized.includes("tailwind.config")
    ) {
      detected.add("tailwind");
    }
    if (content.includes("drizzle-orm")) {
      detected.add("drizzle");
    }
    if (content.includes("@prisma/client")) {
      detected.add("prisma");
    }
  }

  return [...detected].sort((a, b) => a.localeCompare(b));
}

export function countLines(content?: string): number {
  if (!content) return 0;
  let lines = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) lines++;
  }
  return lines;
}

export function classifyFile(input: FileInput): SourceFileClassification {
  const normalizedPath = input.path.replace(/\\/g, "/").replace(/^\/+/, "");
  const { language, extension } = detectLanguage(normalizedPath);
  const role = detectRole(normalizedPath, language, extension);
  const frameworks = detectFrameworks(normalizedPath, input.content);
  const sizeBytes =
    input.sizeBytes ??
    (input.content ? Buffer.byteLength(input.content, "utf8") : 0);
  const linesOfCode = countLines(input.content);

  return {
    path: normalizedPath,
    extension,
    language,
    role,
    sizeBytes,
    frameworks,
    linesOfCode,
  };
}

export function classifyRepositoryFiles(
  inputs: FileInput[],
): SourceFileClassification[] {
  return inputs
    .map((input) => classifyFile(input))
    .sort((a, b) => a.path.localeCompare(b.path));
}
