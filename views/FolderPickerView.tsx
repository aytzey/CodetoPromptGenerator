// views/FolderPickerView.tsx
/**
 * A lightweight folder‑selection component that
 *  • lets the user type or paste a path,
 *  • opens a modal FolderBrowser,
 *  • keeps a short “recent” history in localStorage, and
 *  • optionally notifies a parent component via onPathSelected
 *    **or** updates the global projectPath via zustand.
 *
 * SOLID compliance
 * ----------------
 * ‑ Single‑responsibility  Only concerns picking a folder
 * ‑ Open/Closed      Extensible via injected props / zustand
 * ‑ Liskov        No inheritance
 * ‑ Interface‑segregation Props kept minimal
 * ‑ Dependency‑inversion Uses the generic fetchApi / zustand stores
 */

import React, { useEffect, useState } from 'react';
import {
  Folder,
  FolderSearch,
  History,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

import FolderBrowserView from './FolderBrowserView';
import { useProjectStore } from '@/stores/useProjectStore';

/* ————————————————————————— props ————————————————————————— */
export interface FolderPickerProps {
  /**  true while the backend is scanning a tree – disables every control  */
  isLoading: boolean;
  /**  externally controlled path; when omitted the global store is used   */
  currentPath?: string;
  /**  callback fired after the user has chosen / confirmed a path         */
  onPathSelected?: (path: string) => void;
}

/* ————————————————————————— constants ————————————————————————— */
const RECENTS_KEY = 'recentFolders';
const MAX_RECENTS  = 4;

/* ————————————————————————— component ————————————————————————— */
const FolderPickerView: React.FC<FolderPickerProps> = ({
  isLoading,
  currentPath: externalPath,
  onPathSelected,
}) => {
  /* ───── global store (fallback when no externalPath / onPathSelected) ───── */
  const storePath   = useProjectStore((s) => s.projectPath);
  const setStorePath = useProjectStore((s) => s.setProjectPath);

  /*  final “authoritative” path in use by this component  */
  const activePath  = externalPath ?? storePath;

  /* ───── local UI state ───── */
  const [inputValue,   setInputValue]   = useState(activePath);
  const [showBrowser,  setShowBrowser]  = useState(false);
  const [recent,       setRecent]       = useState<string[]>([]);

  /* ───── initialise “recent” list once ───── */
  useEffect(() => {
    const stored = localStorage.getItem(RECENTS_KEY);
    if (stored) setRecent(JSON.parse(stored));
  }, []);

  /* ───── keep text‑input in sync with externally driven path changes ───── */
  useEffect(() => setInputValue(activePath), [activePath]);

  /* ───── helpers ───── */
  const persistRecents = (list: string[]) =>
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));

  const addRecent = (path: string) => {
    setRecent((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, MAX_RECENTS);
      persistRecents(next);
      return next;
    });
  };

  const choosePath = (path: string) => {
    if (!path) return;                       // guard empty
    if (onPathSelected) {
      try {
        onPathSelected(path);                // delegate to parent
      } catch (err) {
        // eslint‑disable‑next‑line no‑console
        console.error('onPathSelected callback threw:', err);
      }
    } else {
      setStorePath(path);                    // default behaviour
    }
    addRecent(path);
  };

  /* ————————————————————————— render ————————————————————————— */
  return (
    <>
      {/* main control row */}
      <form
        className="flex flex-col md:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          choosePath(inputValue.trim());
        }}
      >
        {/* text input */}
        <div className="relative flex-1">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Enter absolute folder path…"
            value={inputValue}
            disabled={isLoading}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* “Set” button */}
        <Button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          <ArrowRight size={16} className="mr-2" />
          Set
        </Button>

        {/* “Browse…” button */}
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => setShowBrowser(true)}
          className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
        >
          {isLoading ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <FolderSearch size={16} className="mr-2" />
              Browse…
            </>
          )}
        </Button>
      </form>

      {/* recents */}
      {recent.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <History size={14} className="text-indigo-500" />
                <span className="text-sm font-medium">Recent folders</span>
              </div>
              <Badge variant="outline">{recent.length}</Badge>
            </div>
            <Separator />
            <ScrollArea className="h-20 mt-2">
              <ul className="space-y-1">
                {recent.map((p) => (
                  <li key={p}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start truncate"
                            onClick={() => choosePath(p)}
                          >
                            {p}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-mono max-w-xs break-all">
                          {p}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* folder‑browser modal */}
      {showBrowser && (
        <FolderBrowserView
          isOpen={showBrowser}
          onClose={() => setShowBrowser(false)}
          onSelect={(p) => {
            choosePath(p);
            setShowBrowser(false);
          }}
          currentPath={activePath}
        />
      )}
    </>
  );
};

export default FolderPickerView;
