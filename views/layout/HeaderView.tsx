import React from "react";
import { Settings, Github, Zap, RefreshCw, Terminal } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderViewProps {
  onShowSettings: () => void;
  onAutoSelect: () => Promise<void> | void;
  isSelecting: boolean;
  projectPath: string;
}

const HeaderView: React.FC<HeaderViewProps> = ({
  onShowSettings,
  onAutoSelect,
  isSelecting,
  projectPath,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(var(--color-border),0.35)] bg-[rgba(var(--color-bg-primary),0.92)] backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-[rgba(var(--color-primary),0.15)] p-2">
            <Terminal size={18} className="text-[rgb(var(--color-primary))]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold md:text-base">Code to Prompt</h1>
            <p className="text-xs text-[rgb(var(--color-text-muted))]">Focused workspace for code-to-prompt generation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={!projectPath || isSelecting}
                  onClick={onAutoSelect}
                  className="h-9 rounded-md bg-[rgb(var(--color-secondary))] px-3 text-white hover:bg-[rgba(var(--color-secondary),0.9)]"
                >
                  {isSelecting ? (
                    <RefreshCw size={14} className="mr-2 animate-spin" />
                  ) : (
                    <Zap size={14} className="mr-2" />
                  )}
                  {isSelecting ? "Processing..." : "Smart Select"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Select likely-relevant files automatically</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={onShowSettings}
            className="h-9 w-9 rounded-md text-[rgb(var(--color-text-secondary))]"
            aria-label="Settings"
          >
            <Settings size={18} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open("https://github.com/aytzey/CodetoPromptGenerator", "_blank")}
            className="h-9 w-9 rounded-md text-[rgb(var(--color-text-secondary))]"
            aria-label="GitHub repository"
          >
            <Github size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default HeaderView;
