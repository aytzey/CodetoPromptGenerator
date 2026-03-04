import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  FileX,
  Info,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExclusionService } from "@/services/exclusionServiceHooks";
import { useExclusionStore } from "@/stores/useExclusionStore";

const SUGGESTIONS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "*.log",
  ".env*",
  "coverage",
  ".next",
  ".nuxt",
  "vendor",
  "__pycache__",
  "*.pyc",
  ".DS_Store",
  "Thumbs.db",
];

const normalize = (value: string) => value.trim();

const RefinedExclusionsManagerView: React.FC = () => {
  const globalExclusions = useExclusionStore((state) => state.globalExclusions);
  const isLoadingGlobal = useExclusionStore((state) => state.isLoadingGlobal);
  const isSavingGlobal = useExclusionStore((state) => state.isSavingGlobal);
  const { fetchGlobalExclusions, updateGlobalExclusions } = useExclusionService();

  const [isEditing, setIsEditing] = useState(false);
  const [draftExclusions, setDraftExclusions] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");

  useEffect(() => {
    void fetchGlobalExclusions();
  }, [fetchGlobalExclusions]);

  useEffect(() => {
    if (!isEditing) return;
    setDraftExclusions([...globalExclusions]);
  }, [isEditing, globalExclusions]);

  const displayedList = isEditing ? draftExclusions : globalExclusions;

  const availableSuggestions = useMemo(
    () => SUGGESTIONS.filter((pattern) => !draftExclusions.includes(pattern)),
    [draftExclusions],
  );

  const addPattern = () => {
    const pattern = normalize(newPattern);
    if (!pattern || draftExclusions.includes(pattern)) return;
    setDraftExclusions((prev) => [...prev, pattern]);
    setNewPattern("");
  };

  const removePattern = (pattern: string) => {
    setDraftExclusions((prev) => prev.filter((item) => item !== pattern));
  };

  const onNewPatternKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPattern();
    }
  };

  const startEdit = () => {
    setDraftExclusions([...globalExclusions]);
    setNewPattern("");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraftExclusions([...globalExclusions]);
    setNewPattern("");
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const ok = await updateGlobalExclusions(draftExclusions);
    if (!ok) return;
    setIsEditing(false);
    setNewPattern("");
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileX size={16} className="text-[rgb(var(--color-error))]" />
          Global Exclusions
          <Badge variant="outline" className="ml-auto">
            {displayedList.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          Exclusions applied to every project.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <Button size="sm" variant="outline" className="h-8" onClick={startEdit} disabled={isLoadingGlobal}>
              <Edit3 size={13} className="mr-1.5" />
              Edit
            </Button>
          ) : (
            <>
              <Button size="sm" className="h-8" onClick={() => void saveEdit()} disabled={isSavingGlobal}>
                {isSavingGlobal ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Save size={13} className="mr-1.5" />}
                Save
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={cancelEdit} disabled={isSavingGlobal}>
                Cancel
              </Button>
            </>
          )}

          {isLoadingGlobal && (
            <span className="inline-flex items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
              <Loader2 size={12} className="animate-spin" />
              Loading...
            </span>
          )}
          {isSavingGlobal && (
            <span className="inline-flex items-center gap-1 text-xs text-[rgb(var(--color-warning))]">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          )}
        </div>

        {isEditing && (
          <div className="space-y-3 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-3">
            <div className="flex items-center gap-2">
              <Input
                value={newPattern}
                onChange={(event) => setNewPattern(event.target.value)}
                onKeyDown={onNewPatternKeyDown}
                placeholder="e.g. node_modules, *.log, .env*"
                className="h-8"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={addPattern}
                disabled={!normalize(newPattern) || draftExclusions.includes(normalize(newPattern))}
              >
                <Plus size={13} />
              </Button>
            </div>

            {availableSuggestions.length > 0 && (
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
        )}

        <ScrollArea className="h-[220px] rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-2">
          {isLoadingGlobal ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-[rgb(var(--color-text-muted))]">
              <Loader2 size={15} className="animate-spin" />
              Loading exclusions...
            </div>
          ) : displayedList.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[rgb(var(--color-text-muted))]">
              No exclusions yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {displayedList.map((pattern, index) => (
                <li
                  key={`${pattern}-${index}`}
                  className="flex items-center justify-between rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.45)] px-3 py-2"
                >
                  <span className="font-mono text-sm text-[rgb(var(--color-text-primary))]">{pattern}</span>
                  {isEditing ? (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[rgb(var(--color-error))]" onClick={() => removePattern(pattern)}>
                      <X size={14} />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="rounded-md border border-[rgba(var(--color-info),0.25)] bg-[rgba(var(--color-info),0.06)] p-3 text-xs text-[rgb(var(--color-text-muted))]">
          <p className="mb-1 inline-flex items-center gap-1 text-[rgb(var(--color-info))]">
            <Info size={12} />
            How it works
          </p>
          <p>Patterns are relative to project root and saved to `ignoreDirs.txt`.</p>
          <p>Changes affect all projects and refresh file trees automatically.</p>
        </div>

        {!isEditing && displayedList.length > 0 && (
          <p className="inline-flex items-center gap-1 text-xs text-[rgb(var(--color-secondary))]">
            <Check size={12} />
            Exclusions are active globally.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RefinedExclusionsManagerView;
