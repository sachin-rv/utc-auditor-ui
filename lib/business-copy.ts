const FILE_ALIASES: Record<string, string> = {
  "verify.txt": "verification checks",
  "readme.md": "product documentation",
  "index": "the main module",
};

const CATEGORY_LABELS: Record<string, string> = {
  quality: "Quality",
  "static-analysis": "Test quality",
  "cms-migration": "CMS migration",
  completeness: "Missing coverage",
  coverage: "Coverage",
};

export function humanizeCategory(category: string): string {
  const key = category.trim().toLowerCase();
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  return category
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeFileLabel(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/:\d+$/, "");
  const base = (normalized.split("/").pop() ?? normalized).trim();
  const lower = base.toLowerCase();
  if (FILE_ALIASES[lower]) return FILE_ALIASES[lower];
  const withoutExt = base.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  if (!withoutExt) return "this area";
  return withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
}

export function humanizeTechnicalText(text: string, fileHint?: string): string {
  const raw = (text || "").replace(/\s+/g, " ").trim();
  if (!raw) return fileHint ? `${humanizeFileLabel(fileHint)} still needs test coverage.` : "This area still needs test coverage.";

  const notFound = raw.match(/['"`]?([^'"`\s]+\.[a-z0-9]+)['"`]?\s*(?:was\s+)?not found/i);
  if (notFound || /not found/i.test(raw)) {
    const file = notFound?.[1] ?? fileHint ?? "";
    const label = file ? humanizeFileLabel(file) : "this part of the product";
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} is not covered by tests yet.`;
  }

  if (/enoent|no such file|cannot find module/i.test(raw)) {
    return "A supporting file or module is missing, so this area is not fully protected by tests.";
  }

  if (/\.(tsx?|jsx?|txt|json|md)\b/i.test(raw) && raw.length < 80) {
    return raw.replace(/\b[\w./-]+\.(tsx?|jsx?|txt|json|md)\b/gi, (m) => humanizeFileLabel(m));
  }

  return raw;
}

export function businessFindingTitle(title: string, detail: string, file?: string): string {
  const source = title && title !== "Finding" ? title : detail;
  return humanizeTechnicalText(source, file);
}
