import type { FileNode } from "@/types";

export type ExclusionCandidateType = "file" | "directory" | "pattern";

export interface ExclusionCandidate {
  path: string;
  type: ExclusionCandidateType;
  source?: string;
}

export const flattenExclusionCandidates = (nodes: FileNode[]): ExclusionCandidate[] => {
  const candidates: ExclusionCandidate[] = [];

  const walk = (items: FileNode[]) => {
    items.forEach((node) => {
      candidates.push({
        path: node.relativePath,
        type: node.type,
      });
      if (node.type === "directory" && node.children?.length) {
        walk(node.children);
      }
    });
  };

  walk(nodes);

  return candidates.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
};

const hasGlobSyntax = (pattern: string): boolean => /[*?[\]{}()!+@]/.test(pattern);

export const inferExclusionCandidateType = (pattern: string): ExclusionCandidateType => {
  const trimmed = pattern.trim();
  if (!trimmed || trimmed.startsWith("!") || hasGlobSyntax(trimmed)) {
    return "pattern";
  }
  if (trimmed.endsWith("/")) {
    return "directory";
  }

  const lastSegment = trimmed.split("/").filter(Boolean).pop() ?? trimmed;
  return lastSegment.includes(".") ? "file" : "directory";
};
