// views/layout/HeaderView.tsx
import React from "react";
import {
  Settings,
  Github,
  Zap,
  RefreshCw,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <header className="sticky top-0 z-30 backdrop-blur-[32px] bg-[rgba(var(--color-bg-primary),0.8)] border-b border-[rgba(var(--color-border),0.3)] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      {/* Refined top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--color-primary),0.4)] to-transparent"></div>
      
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Minimalist Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="p-2 bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))] rounded-lg shadow-[0_4px_16px_rgba(var(--color-primary),0.3)] animate-float">
                <Terminal size={20} className="text-white" strokeWidth={2} />
              </div>
              {/* Subtle glow on hover */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))] opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-300"></div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))]">
                Code to Prompt
              </h1>
              <div className="flex items-center text-[rgb(var(--color-text-muted))] text-xs space-x-1">
                <span className="opacity-80">Generator</span>
                <span className="w-1 h-1 bg-[rgb(var(--color-text-muted))] rounded-full opacity-50"></span>
                <span className="text-[rgb(var(--color-accent-2))] font-medium">v1.2</span>
              </div>
            </div>
          </div>

          {/* Refined Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Smart-select with cleaner design */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!projectPath || isSelecting}
                    onClick={onAutoSelect}
                    className="relative bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgb(var(--color-secondary))] hover:to-[rgb(var(--color-accent-2))] text-white font-medium shadow-[0_4px_12px_rgba(var(--color-secondary),0.3)] hover:shadow-[0_6px_16px_rgba(var(--color-secondary),0.4)] rounded-lg px-4 h-9 transition-all duration-300 active:scale-95"
                  >
                    {isSelecting ? (
                      <RefreshCw size={16} className="animate-spin mr-2" />
                    ) : (
                      <Zap size={16} className="mr-2" />
                    )}
                    <span className="text-sm">{isSelecting ? "Processing..." : "Smart-Select"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass py-2 px-3 shadow-lg border-[rgba(var(--color-border),0.2)]">
                  <p className="text-[rgb(var(--color-text-secondary))] text-xs">Smart-Select files with Gemma-3</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings with hover animation */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onShowSettings}
                    className="rounded-full h-9 w-9 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-primary),0.15)] hover:text-[rgb(var(--color-accent-2))] transition-all duration-300 relative group"
                  >
                    <Settings size={20} className="transition-transform duration-500 group-hover:rotate-45" />
                    {/* Subtle ring on hover */}
                    <span className="absolute inset-0 rounded-full border border-[rgba(var(--color-primary),0.3)] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"></span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass py-2 px-3 shadow-lg">
                  <p className="text-[rgb(var(--color-text-secondary))]">Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* GitHub with hover effects */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      window.open(
                        "https://github.com/aytzey/CodetoPromptGenerator",
                        "_blank",
                      )
                    }
                    className="rounded-full h-9 w-9 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-tertiary),0.15)] hover:text-[rgb(var(--color-tertiary))] transition-all duration-300 relative group"
                  >
                    <Github size={20} />
                    {/* Subtle external indicator on hover */}
                    <ExternalLink size={10} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Subtle ring on hover */}
                    <span className="absolute inset-0 rounded-full border border-[rgba(var(--color-tertiary),0.3)] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"></span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass py-2 px-3 shadow-lg">
                  <p className="text-[rgb(var(--color-text-secondary))]">View on GitHub</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      
      {/* Bottom shadow gradient */}
      <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.2)] to-transparent"></div>
    </header>
  );
};

export default HeaderView;
