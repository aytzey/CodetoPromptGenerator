// File: components/home/Header.tsx
// -----------------------------------------------------------------------------
// Top navigation bar for the Home page. Encapsulates theme toggle, smart‑select
// trigger, settings modal opener and GitHub link.
// -----------------------------------------------------------------------------

import React from "react";
import {
  Settings,
  Code,
  Sun,
  Moon,
  Github,
  Zap,
  RefreshCw,
} from "lucide-react";

import { useAppStore } from "@/stores/useAppStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAutoSelectService } from "@/services/autoSelectServiceHooks";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderProps {
  /** Callback invoked when the user clicks the settings icon */
  onOpenSettings: () => void;
}

/**
 * <Header /> – application top bar. Single‑responsibility: controls navigation
 * actions while remaining agnostic of page‑level state beyond what it reads
 * from the zustand stores.
 */
export default function Header({ onOpenSettings }: HeaderProps) {
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDark = useAppStore((s) => s.toggleDarkMode);

  const projectPath = useProjectStore((s) => s.projectPath);

  const { autoSelect, isSelecting } = useAutoSelectService();

  return (
    <header
      /* glass morphism + slight radial tint */
      className="glass sticky top-0 z-20 px-6 py-3 shadow-md border-b backdrop-blur-md border-purple-500/20"
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* left – brand */}
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
            <Code size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Code to Prompt
          </h1>
        </div>

        {/* right – actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Smart‑select */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!projectPath || isSelecting}
                  onClick={autoSelect}
                  className="border-teal-300 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400"
                >
                  {isSelecting ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Zap size={18} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Smart‑Select files with Gemma‑3</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* theme toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleDark}
                  className="rounded-full h-9 w-9"
                >
                  {darkMode ? (
                    <Sun size={18} className="text-amber-400" />
                  ) : (
                    <Moon size={18} className="text-indigo-600" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {darkMode ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenSettings}
                  className="rounded-full h-9 w-9"
                >
                  <Settings size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* GitHub */}
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
                  className="rounded-full h-9 w-9"
                >
                  <Github size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">View on GitHub</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
