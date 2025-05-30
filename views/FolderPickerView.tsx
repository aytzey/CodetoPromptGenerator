// FILE: views/FolderPickerView.tsx
// views/FolderPickerView.tsx
/**
 * A visually enhanced folder‑selection component that
 *  • lets the user type or paste a path,
 *  • opens a modal FolderBrowser,
 *  • keeps a short "recent" history in localStorage
 */

import React, { useEffect, useState } from 'react';
import {
  Folder,
  FolderSearch,
  History,
  ArrowRight,
  RefreshCw,
  HardDrive,
  Clock,
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

  /*  final "authoritative" path in use by this component  */
  const activePath  = externalPath ?? storePath;

  /* ───── local UI state ───── */
  const [inputValue,   setInputValue]   = useState(activePath);
  const [showBrowser,  setShowBrowser]  = useState(false);
  const [recent,       setRecent]       = useState<string[]>([]);
  const [isHovered,    setIsHovered]    = useState(false);

  /* ───── initialise "recent" list once ───── */
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
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          choosePath(inputValue.trim());
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Decorative element that appears on hover */}
        <div className={`absolute -inset-3 bg-gradient-to-r from-[rgba(123,147,253,0.1)] to-[rgba(189,147,249,0.1)] rounded-xl blur-md transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
        
        <div className="relative flex flex-col md:flex-row gap-3 z-10">
          {/* Text input with icon */}
          <div className="relative flex-1">
            <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-[rgba(123,147,253,0.1)] border-r border-[rgba(60,63,87,0.7)] rounded-l-lg">
              <Folder className="h-5 w-5 text-[rgb(123,147,253)]" />
            </div>
            <Input
              placeholder="Enter project folder path..."
              value={inputValue}
              disabled={isLoading}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-12 h-12 bg-[rgba(22,23,46,0.6)] border-[rgba(60,63,87,0.7)] focus:ring-2 focus:ring-[rgb(123,147,253)] focus:border-transparent text-[rgb(224,226,240)] font-medium"
            />
          </div>

          {/* "Set" button */}
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="h-12 px-5 bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(123,147,253)] hover:from-[rgb(123,147,253)] hover:to-[rgb(189,147,249)] text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300"
          >
            <ArrowRight size={18} className="mr-2" />
            Set Project
          </Button>

          {/* "Browse…" button */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => setShowBrowser(true)}
            className="h-12 px-5 border-[rgba(123,147,253,0.5)] bg-[rgba(123,147,253,0.1)] text-[rgb(123,147,253)] hover:bg-[rgba(123,147,253,0.2)] hover:text-[rgb(123,147,253)] hover:border-[rgba(123,147,253,0.7)] transition-all duration-300"
          >
            {isLoading ? (
              <>
                <RefreshCw size={18} className="mr-2 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <FolderSearch size={18} className="mr-2" />
                Browse…
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Recent folders section with enhanced design */}
      {recent.length > 0 && (
        <Card className="mt-5 overflow-hidden border-[rgba(60,63,87,0.5)] bg-[rgba(15,16,36,0.4)] backdrop-blur-sm animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="p-1.5 rounded-md bg-[rgba(139,233,253,0.1)] mr-2">
                  <Clock size={16} className="text-[rgb(139,233,253)]" />
                </div>
                <span className="text-sm font-medium text-[rgb(224,226,240)]">Recent projects</span>
              </div>
              <Badge className="bg-[rgba(139,233,253,0.1)] text-[rgb(139,233,253)] border-[rgba(139,233,253,0.3)]">
                {recent.length}
              </Badge>
            </div>
            
            <Separator className="bg-[rgba(60,63,87,0.5)] mb-3" />
            
            <ScrollArea className="h-24 pr-2">
              <ul className="space-y-2">
                {recent.map((p, index) => (
                  <li key={p} style={{animationDelay: `${index * 50}ms`}} className="animate-slide-up">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start rounded-lg py-2 pl-3 pr-2 h-auto bg-[rgba(22,23,46,0.6)] hover:bg-[rgba(123,147,253,0.1)] border border-[rgba(60,63,87,0.5)] hover:border-[rgba(123,147,253,0.4)] transition-all duration-200 group"
                            onClick={() => choosePath(p)}
                          >
                            <div className="flex items-center w-full">
                              <HardDrive size={14} className="shrink-0 mr-2 text-[rgb(139,233,253)] group-hover:text-[rgb(123,147,253)]" />
                              <span className="truncate font-medium text-[rgb(190,192,210)] group-hover:text-[rgb(224,226,240)]">{p}</span>
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="font-mono max-w-xs break-all bg-[rgba(15,16,36,0.95)] border-[rgba(60,63,87,0.7)] shadow-xl backdrop-blur-lg"
                        >
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