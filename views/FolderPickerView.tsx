import React, { useEffect, useState } from "react";
import { Folder, FolderSearch, History, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import StunningFolderBrowserView from "./StunningFolderBrowserView";
import { useProjectStore } from "@/stores/useProjectStore";

export interface FolderPickerProps {
  isLoading: boolean;
  currentPath?: string;
  onPathSelected?: (path: string) => void;
}

const RECENTS_KEY = "recentFolders";
const MAX_RECENTS = 4;

const parseStoredRecents = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const FolderPickerView: React.FC<FolderPickerProps> = ({
  isLoading,
  currentPath: externalPath,
  onPathSelected,
}) => {
  const storePath = useProjectStore((state) => state.projectPath);
  const setStorePath = useProjectStore((state) => state.setProjectPath);
  const activePath = externalPath ?? storePath;

  const [inputValue, setInputValue] = useState(activePath);
  const [showBrowser, setShowBrowser] = useState(false);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentPaths(parseStoredRecents(localStorage.getItem(RECENTS_KEY)));
  }, []);

  useEffect(() => {
    setInputValue(activePath);
  }, [activePath]);

  const persistRecents = (paths: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(RECENTS_KEY, JSON.stringify(paths));
  };

  const addRecentPath = (path: string) => {
    setRecentPaths((prev) => {
      const next = [path, ...prev.filter((item) => item !== path)].slice(0, MAX_RECENTS);
      persistRecents(next);
      return next;
    });
  };

  const clearRecents = () => {
    setRecentPaths([]);
    persistRecents([]);
  };

  const choosePath = (path: string) => {
    const normalized = path.trim();
    if (!normalized) return;

    if (onPathSelected) {
      onPathSelected(normalized);
    } else {
      setStorePath(normalized);
    }

    addRecentPath(normalized);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    choosePath(inputValue);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Folder
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))]"
            />
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Enter project folder path..."
              className="h-10 pl-9"
            />
          </div>

          <Button type="submit" disabled={!inputValue.trim()} className="h-10 px-4">
            {isLoading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
            Set Project
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowBrowser(true)}
            className="h-10 px-4"
          >
            <FolderSearch size={14} className="mr-1.5" />
            Browse
          </Button>
        </div>
      </form>

      {recentPaths.length > 0 && (
        <div className="mt-4 space-y-2 rounded-md border border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-secondary),0.2)] p-3">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--color-text-muted))]">
              <History size={13} />
              Recent projects
            </p>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearRecents}>
              <X size={12} className="mr-1.5" />
              Clear
            </Button>
          </div>

          <ScrollArea className="h-24">
            <ul className="space-y-1.5 pr-2">
              {recentPaths.map((path) => (
                <li key={path}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start px-2 text-left"
                    onClick={() => choosePath(path)}
                  >
                    <span className="truncate font-mono text-xs">{path}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}

      {showBrowser && (
        <StunningFolderBrowserView
          isOpen={showBrowser}
          onClose={() => setShowBrowser(false)}
          onSelect={(path) => {
            choosePath(path);
            setShowBrowser(false);
          }}
          currentPath={activePath}
        />
      )}
    </>
  );
};

export default FolderPickerView;
