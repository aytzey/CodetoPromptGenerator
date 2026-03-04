import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileX,
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
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useAppStore } from "@/stores/useAppStore";
import { useExclusionStore } from "@/stores/useExclusionStore";
import { useProjectStore } from "@/stores/useProjectStore";

const SUGGESTIONS = [
  "*.test.js",
  "*.spec.ts",
  "*.test.tsx",
  "test/",
  "tests/",
  "__tests__/",
  "*.min.js",
  "*.min.css",
  "*.map",
  ".cache/",
  "tmp/",
  "temp/",
  "logs/",
  "*.backup",
];

const normalize = (value: string) => value.trim();

const RefinedLocalExclusionsManagerView: React.FC = () => {
  const projectPath = useProjectStore((state) => state.projectPath);
  const localExclusions = useExclusionStore((state) => state.localExclusions);
  const isLoadingLocal = useExclusionStore((state) => state.isLoadingLocal);
  const isSavingLocal = useExclusionStore((state) => state.isSavingLocal);
  const error = useAppStore((state) => state.error);
  const { fetchLocalExclusions, updateLocalExclusions } = useExclusionService();

  const [newPattern, setNewPattern] = useState("");

  useEffect(() => {
    if (!projectPath) return;
    void fetchLocalExclusions();
  }, [projectPath, fetchLocalExclusions]);

  const availableSuggestions = useMemo(
    () => SUGGESTIONS.filter((pattern) => !localExclusions.includes(pattern)),
    [localExclusions],
  );

  const addPattern = async () => {
    const pattern = normalize(newPattern);
    if (!pattern || localExclusions.includes(pattern)) return;
    await updateLocalExclusions([...localExclusions, pattern]);
    setNewPattern("");
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
            {localExclusions.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          Exclusions applied only to the current project.
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
              disabled={!normalize(newPattern) || localExclusions.includes(normalize(newPattern)) || isSavingLocal}
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
          ) : localExclusions.length === 0 ? (
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
                  <span className="font-mono text-sm text-[rgb(var(--color-text-primary))]">{pattern}</span>
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
            </ul>
          )}
        </ScrollArea>

        <div className="rounded-md border border-[rgba(var(--color-tertiary),0.25)] bg-[rgba(var(--color-tertiary),0.06)] p-3 text-xs text-[rgb(var(--color-text-muted))]">
          <p className="mb-1 inline-flex items-center gap-1 text-[rgb(var(--color-tertiary))]">
            <Info size={12} />
            About project exclusions
          </p>
          <p>Used by project actions like “Select All”.</p>
          <p>Global exclusions stay active in addition to these rules.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RefinedLocalExclusionsManagerView;
