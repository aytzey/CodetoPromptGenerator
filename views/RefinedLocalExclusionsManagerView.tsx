import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  File,
  FileX,
  Folder,
  FolderOpen,
  Info,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type ExclusionCandidate,
  flattenExclusionCandidates,
} from "@/lib/exclusionCandidates";
import { normalizeExclusionPattern } from "@/lib/selectionFilters";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useAppStore } from "@/stores/useAppStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type { ProjectIgnoreExclusion } from "@/types";

const SUGGESTIONS = [
  "*.tsbuildinfo",
  "*.test.js",
  "*.spec.ts",
  "*.test.tsx",
  "*.log",
  "*.map",
  "*.min.js",
  "*.min.css",
  "*.png",
  "*.svg",
  ".env*",
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  "test/",
  "tests/",
  "__tests__/",
  ".cache/",
  "tmp/",
  "temp/",
  "logs/",
  "*.backup",
];

const normalize = (value: string) => value.trim();
const normalizeForCompare = (value: string) => normalizeExclusionPattern(value) ?? normalize(value);

interface ProjectCandidateOption extends ExclusionCandidate {
  value: string;
}

const candidateIcon = (candidate: ExclusionCandidate) => {
  if (candidate.type === "directory") return <Folder size={13} />;
  if (candidate.type === "file") return <File size={13} />;
  return <FileX size={13} />;
};

const RefinedLocalExclusionsManagerView: React.FC = () => {
  const projectPath = useProjectStore((state) => state.projectPath);
  const fileTree = useProjectStore((state) => state.fileTree);
  const localExclusions = useExclusionStore((state) => state.localExclusions);
  const isLoadingLocal = useExclusionStore((state) => state.isLoadingLocal);
  const isSavingLocal = useExclusionStore((state) => state.isSavingLocal);
  const error = useAppStore((state) => state.error);
  const { fetchLocalExclusions, updateLocalExclusions, fetchProjectIgnoreExclusions } = useExclusionService();

  const [newPattern, setNewPattern] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [projectIgnoreExclusions, setProjectIgnoreExclusions] = useState<ProjectIgnoreExclusion[]>([]);
  const [isLoadingProjectIgnores, setIsLoadingProjectIgnores] = useState(false);

  useEffect(() => {
    if (!projectPath) return;
    void fetchLocalExclusions();

    let cancelled = false;
    setIsLoadingProjectIgnores(true);
    void fetchProjectIgnoreExclusions()
      .then((entries) => {
        if (!cancelled) {
          setProjectIgnoreExclusions(entries);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProjectIgnores(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, fetchLocalExclusions, fetchProjectIgnoreExclusions]);

  const normalizedLocalExclusions = useMemo(
    () => new Set(localExclusions.map(normalizeForCompare)),
    [localExclusions],
  );

  const availableSuggestions = useMemo(
    () => SUGGESTIONS.filter((pattern) => !normalizedLocalExclusions.has(normalizeForCompare(pattern))),
    [normalizedLocalExclusions],
  );

  const projectCandidates = useMemo(
    () => {
      const seen = new Set<string>();
      return flattenExclusionCandidates(fileTree).filter((candidate) => {
        const key = normalizeForCompare(candidate.path);
        if (!key || normalizedLocalExclusions.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    [fileTree, normalizedLocalExclusions],
  );

  const candidateOptions = useMemo<ProjectCandidateOption[]>(
    () =>
      projectCandidates.map((candidate, index) => ({
        ...candidate,
        value: `${candidate.source ?? "tree"}:${candidate.type}:${index}`,
      })),
    [projectCandidates],
  );

  const effectiveExclusionCount = useMemo(() => {
    const keys = new Set<string>();
    localExclusions.forEach((pattern) => keys.add(normalizeForCompare(pattern)));
    projectIgnoreExclusions.forEach((entry) => keys.add(normalizeForCompare(entry.pattern)));
    return keys.size;
  }, [localExclusions, projectIgnoreExclusions]);

  const addPattern = async () => {
    const pattern = normalize(newPattern);
    if (!pattern || normalizedLocalExclusions.has(normalizeForCompare(pattern))) return;
    await updateLocalExclusions([...localExclusions, pattern]);
    setNewPattern("");
  };

  const addCandidate = async () => {
    const candidate = candidateOptions.find((option) => option.value === selectedCandidate);
    const path = candidate?.path ?? "";
    if (!path || normalizedLocalExclusions.has(normalizeForCompare(path))) return;
    await updateLocalExclusions([...localExclusions, path]);
    setSelectedCandidate("");
  };

  const removePattern = async (pattern: string) => {
    await updateLocalExclusions(localExclusions.filter((item) => item !== pattern));
  };

  const onNewPatternKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void addPattern();
    }
  };

  if (!projectPath) {
    return (
      <Card className="glass">
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2 text-center text-sm text-[rgb(var(--color-text-muted))]">
            <FolderOpen className="h-7 w-7 opacity-70" />
            Select a project to manage project-only exclusions.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileX size={16} className="text-[rgb(var(--color-tertiary))]" />
          Project Exclusions
          <Badge variant="outline" className="ml-auto">
            {effectiveExclusionCount}
          </Badge>
        </CardTitle>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          Local rules plus ignore-file rules applied only to the current project.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-[rgba(var(--color-error),0.4)] bg-[rgba(var(--color-error),0.08)] text-[rgb(var(--color-error))]">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-3">
          <div className="flex items-center gap-2">
            <Input
              value={newPattern}
              onChange={(event) => setNewPattern(event.target.value)}
              onKeyDown={onNewPatternKeyDown}
              placeholder="e.g. *.test.ts, tests/, tmp/"
              className="h-8"
              disabled={isSavingLocal}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => void addPattern()}
              disabled={
                !normalize(newPattern) ||
                normalizedLocalExclusions.has(normalizeForCompare(newPattern)) ||
                isSavingLocal
              }
            >
              {isSavingLocal ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate} disabled={isSavingLocal || candidateOptions.length === 0}>
              <SelectTrigger className="h-8 min-w-0 flex-1">
                <SelectValue placeholder="Select a project file or folder" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {candidateOptions.slice(0, 500).map((candidate) => (
                  <SelectItem
                    key={candidate.value}
                    value={candidate.value}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 font-mono text-xs">
                      {candidateIcon(candidate)}
                      <span className="truncate">{candidate.path}</span>
                      {candidate.source ? (
                        <Badge variant="outline" className="ml-1 h-5 shrink-0 px-1.5 text-[10px]">
                          {candidate.source}
                        </Badge>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => void addCandidate()}
              disabled={!selectedCandidate || isSavingLocal}
            >
              {isSavingLocal ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            </Button>
          </div>

          {availableSuggestions.length > 0 && !newPattern && (
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  className="rounded border border-[rgba(var(--color-border),0.45)] px-2 py-1 font-mono text-xs text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-bg-secondary),0.4)]"
                  onClick={() => setNewPattern(pattern)}
                >
                  {pattern}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-[rgb(var(--color-text-muted))]">
          {isLoadingLocal ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Loading...
            </span>
          ) : null}
          {isLoadingProjectIgnores ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Reading ignore files...
            </span>
          ) : null}
          {isSavingLocal ? (
            <span className="inline-flex items-center gap-1 text-[rgb(var(--color-warning))]">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          ) : null}
        </div>

        <ScrollArea className="h-[200px] rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-2">
          {isLoadingLocal ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-[rgb(var(--color-text-muted))]">
              <Loader2 size={15} className="animate-spin" />
              Loading exclusions...
            </div>
          ) : effectiveExclusionCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[rgb(var(--color-text-muted))]">
              <AlertTriangle className="h-5 w-5 opacity-70" />
              No project exclusions yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {localExclusions.map((pattern, index) => (
                <li
                  key={`${pattern}-${index}`}
                  className="flex items-center justify-between rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.45)] px-3 py-2"
                >
                  <span className="min-w-0 truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">{pattern}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-[rgb(var(--color-error))]"
                    onClick={() => void removePattern(pattern)}
                    disabled={isSavingLocal}
                  >
                    <X size={14} />
                  </Button>
                </li>
              ))}
              {projectIgnoreExclusions.map((entry, index) => (
                <li
                  key={`${entry.source}-${entry.pattern}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.28)] px-3 py-2"
                >
                  <span className="min-w-0 truncate font-mono text-sm text-[rgb(var(--color-text-primary))]">
                    {entry.pattern}
                  </span>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                    {entry.negated ? (
                      <Badge variant="outline" className="text-[10px]">
                        include
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="text-[10px]">
                      {entry.source}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="rounded-md border border-[rgba(var(--color-tertiary),0.25)] bg-[rgba(var(--color-tertiary),0.06)] p-3 text-xs text-[rgb(var(--color-text-muted))]">
          <p className="mb-1 inline-flex items-center gap-1 text-[rgb(var(--color-tertiary))]">
            <Info size={12} />
            About project exclusions
          </p>
          <p>Local rules can be edited here; .gitignore, .dockerignore, .ignore, and .codetopromptignore rules are read-only.</p>
          <p>Global exclusions stay active in addition to these rules.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefinedLocalExclusionsManagerView;
