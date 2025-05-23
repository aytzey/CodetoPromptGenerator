// views/layout/HeaderView.tsx
import React from "react";
import {
  Code,
  Settings,
  Github,
  Zap,
  RefreshCw,
  Users,
  Terminal,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderViewProps {
  onShowSettings: () => void;
  onAutoSelect: () => void;
  onGenerateActors: () => void;
  isSelecting: boolean;
  isGeneratingActors: boolean;
  projectPath: string;
}

const HeaderView: React.FC<HeaderViewProps> = ({
  onShowSettings,
  onAutoSelect,
  onGenerateActors,
  isSelecting,
  isGeneratingActors,
  projectPath,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[rgba(var(--color-bg-primary),0.85)] border-b border-[rgba(var(--color-border),0.6)] shadow-lg">
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[rgba(var(--color-primary),0)] via-[rgba(var(--color-primary),0.3)] to-[rgba(var(--color-primary),0)]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo & Brand - Enhanced with animation and depth */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))] rounded-xl shadow-[0_0_20px_rgba(var(--color-primary),0.4)] animate-float relative group">
              {/* Inner shine effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-transparent opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <Terminal size={22} className="text-white relative z-10" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] to-[rgb(var(--color-tertiary))]">
                Code to Prompt
              </h1>
              <div className="flex items-center text-[rgb(var(--color-text-muted))] text-xs">
                <span>Generator</span>
                <ChevronRight size={12} className="mx-1 opacity-70" />
                <span className="text-[rgb(var(--color-accent-2))]">v1.2</span>
              </div>
            </div>
          </div>

          {/* Right Actions - Enhanced styling and hover effects */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Smart-select with improved glow and animation */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!projectPath || isSelecting}
                    onClick={onAutoSelect}
                    className="relative overflow-hidden bg-gradient-to-r from-[rgb(var(--color-secondary))] to-[rgba(var(--color-secondary),0.9)] hover:from-[rgb(var(--color-secondary))] hover:to-[rgb(var(--color-accent-2))] text-[rgb(var(--color-bg-primary))] font-medium shadow-[0_0_15px_rgba(var(--color-secondary),0.25)] hover:shadow-[0_0_20px_rgba(var(--color-secondary),0.4)] rounded-lg px-4 h-9 transition-all active:scale-95"
                  >
                    <div className="relative z-10 flex items-center">
                      {isSelecting ? (
                        <RefreshCw size={18} className="animate-spin mr-2" />
                      ) : (
                        <Zap size={18} className="mr-2" />
                      )}
                      <span>{isSelecting ? "Processing..." : "Smart-Select"}</span>
                    </div>
                    {/* Animated shimmer effect */}
                    <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_2s_infinite]"></div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass py-2 px-3 shadow-lg">
                  <p className="text-[rgb(var(--color-text-secondary))]">Smart-Select files with Gemma-3</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Actor Wizard */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!projectPath || isGeneratingActors}
                    onClick={onGenerateActors}
                    className="relative overflow-hidden bg-gradient-to-r from-[rgb(var(--color-accent-2))] to-[rgba(var(--color-accent-2),0.9)] hover:from-[rgb(var(--color-accent-2))] hover:to-[rgb(var(--color-secondary))] text-[rgb(var(--color-bg-primary))] font-medium shadow-[0_0_15px_rgba(var(--color-accent-2),0.25)] hover:shadow-[0_0_20px_rgba(var(--color-accent-2),0.4)] rounded-lg px-4 h-9 transition-all active:scale-95"
                  >
                    <div className="relative z-10 flex items-center">
                      {isGeneratingActors ? (
                        <RefreshCw size={18} className="animate-spin mr-2" />
                      ) : (
                        <Users size={18} className="mr-2" />
                      )}
                      <span>{isGeneratingActors ? "Processing..." : "Actor Wizard"}</span>
                    </div>
                    <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_2s_infinite]"></div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="glass py-2 px-3 shadow-lg">
                  <p className="text-[rgb(var(--color-text-secondary))]">Generate actors using Llama‑4</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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