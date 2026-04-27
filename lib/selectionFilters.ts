import picomatch from "picomatch";

const normalizeRelativePath = (path: string): string =>
  path.replace(/\\/g, "/").replace(/\/+/g, "/").trim();

const pathSegments = (path: string): string[] =>
  normalizeRelativePath(path)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

const hasGlobSyntax = (pattern: string): boolean => /[*?[\]{}()!+@]/.test(pattern);

export const normalizeExclusionPattern = (pattern: string): string | null => {
  const normalized = normalizeRelativePath(pattern);
  if (!normalized || normalized.startsWith("#")) {
    return null;
  }
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
};

export const normalizeExclusionPatterns = (patterns: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  patterns.forEach((pattern) => {
    const normalized = normalizeExclusionPattern(pattern);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });

  return out;
};

const buildGlobCandidates = (pattern: string): string[] => {
  const candidates = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeExclusionPattern(value);
    if (normalized) candidates.add(normalized);
  };

  add(pattern);
  if (!pattern.includes("/")) {
    add(`**/${pattern}`);
  }
  if (!hasGlobSyntax(pattern)) {
    add(`${pattern}/**`);
    if (!pattern.includes("/")) {
      add(`**/${pattern}/**`);
    }
  }

  return Array.from(candidates);
};

const pathAncestorCandidates = (path: string): string[] => {
  const segments = pathSegments(path);
  const ancestors: string[] = [];
  for (let i = 1; i < segments.length; i += 1) {
    ancestors.push(segments.slice(0, i).join("/"));
  }
  return ancestors;
};

const stripNegation = (pattern: string): { negated: boolean; body: string | null } => {
  const normalized = normalizeExclusionPattern(pattern);
  if (!normalized) return { negated: false, body: null };
  return normalized.startsWith("!")
    ? { negated: true, body: normalizeExclusionPattern(normalized.slice(1)) }
    : { negated: false, body: normalized };
};

export const matchesExclusionPattern = (path: string, pattern: string): boolean => {
  const normalizedPath = normalizeRelativePath(path).replace(/^\/+/, "");
  const { negated, body: normalizedPattern } = stripNegation(pattern);
  if (!normalizedPath || !normalizedPattern) return false;
  if (negated) return false;

  const segments = pathSegments(normalizedPath);
  const filename = segments[segments.length - 1] ?? normalizedPath;
  const ancestors = pathAncestorCandidates(normalizedPath);

  if (!normalizedPattern.includes("/") && !hasGlobSyntax(normalizedPattern)) {
    return segments.includes(normalizedPattern);
  }

  const candidates = buildGlobCandidates(normalizedPattern);
  return candidates.some((candidate) => {
    const matcher = picomatch(candidate, { nocase: true, dot: true });
    return matcher(normalizedPath) || matcher(filename) || ancestors.some((ancestor) => matcher(ancestor));
  });
};

export const isExcludedByPatterns = (path: string, patterns: Iterable<string>): boolean => {
  let excluded = false;
  for (const pattern of patterns) {
    const { negated, body } = stripNegation(pattern);
    if (!body) continue;
    if (matchesExclusionPattern(path, body)) {
      excluded = !negated;
    }
  }
  return excluded;
};

const PROMPT_EXCLUDED_SEGMENTS = new Set([
  ".cache",
  ".codetoprompt",
  ".eggs",
  ".git",
  ".github",
  ".mypy_cache",
  ".next",
  ".nuxt",
  ".parcel-cache",
  ".pytest_cache",
  ".ruff_cache",
  ".secrets",
  ".svelte-kit",
  ".tox",
  ".turbo",
  ".venv",
  ".vercel",
  ".worktrees",
  ".yarn",
  "__pycache__",
  "bower_components",
  "build",
  "coverage",
  "dist",
  "env",
  "htmlcov",
  "node_modules",
  "out",
  "target",
  "venv",
]);

const PROMPT_EXCLUDED_FILENAMES = new Set([
  ".ds_store",
  "bun.lockb",
  "cargo.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "tsconfig.tsbuildinfo",
  "yarn.lock",
]);

const PROMPT_EXCLUDED_EXTENSIONS = new Set([
  ".7z",
  ".avi",
  ".bak",
  ".bin",
  ".bmp",
  ".class",
  ".db",
  ".dll",
  ".doc",
  ".docx",
  ".dylib",
  ".eot",
  ".exe",
  ".feather",
  ".flac",
  ".gif",
  ".gz",
  ".h5",
  ".hdf5",
  ".ico",
  ".icns",
  ".jar",
  ".jpeg",
  ".jpg",
  ".joblib",
  ".lock",
  ".log",
  ".map",
  ".mov",
  ".mp3",
  ".mp4",
  ".o",
  ".obj",
  ".otf",
  ".parquet",
  ".pdf",
  ".pickle",
  ".pkl",
  ".png",
  ".ppt",
  ".pptx",
  ".pyc",
  ".pyo",
  ".rar",
  ".sqlite",
  ".sqlite3",
  ".so",
  ".svg",
  ".swp",
  ".swo",
  ".tar",
  ".tmp",
  ".ttf",
  ".wav",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".zip",
]);

const isProtectedPromptSelectionName = (name: string): boolean => {
  const lower = name.toLowerCase();

  return (
    lower === ".env" ||
    lower === ".envrc" ||
    lower.startsWith(".env.") ||
    (lower.startsWith(".") && lower.endsWith("ignore"))
  );
};

export const isPromptSelectionExcludedPath = (path: string): boolean => {
  const segments = pathSegments(path);
  const filename = segments[segments.length - 1]?.toLowerCase() ?? "";
  const extension = filename.includes(".") ? `.${filename.split(".").pop()}` : "";

  return (
    segments.length === 0 ||
    segments.some((segment) => PROMPT_EXCLUDED_SEGMENTS.has(segment.toLowerCase())) ||
    segments.some(isProtectedPromptSelectionName) ||
    PROMPT_EXCLUDED_FILENAMES.has(filename) ||
    PROMPT_EXCLUDED_EXTENSIONS.has(extension) ||
    filename.endsWith(".min.js") ||
    filename.endsWith(".min.css")
  );
};

export const filterPromptSelectablePaths = (paths: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const path of paths) {
    const normalized = normalizeRelativePath(path);
    if (!normalized || isPromptSelectionExcludedPath(normalized) || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
};
