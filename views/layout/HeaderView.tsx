// File: views/layout/HeaderView.tsx
// NEW FILE
import React from "react";
import {
  Code,
  Sun,
  Moon,
  Settings,
  Github,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderViewProps {
  darkMode: boolean;
  toggleDark: () => void;
  onShowSettings: () => void;
  onAutoSelect: () => void;
  isSelecting: boolean;
  projectPath: string;
}

const HeaderView: React.FC<HeaderViewProps> = ({
  darkMode,
  toggleDark,
  onShowSettings,
  onAutoSelect,
  isSelecting,
  projectPath,
}) => {
  return (
    <header className="sticky top-0 z-20 px-6 py-3 shadow-md border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border-gray-200 dark:border-gray-800">
      <div className="container mx-auto flex justify-between items-center">
        {/* left */}
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
            <Code size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 text-transparent bg-clip-text">
            Code to Prompt
          </h1>
        </div>

        {/* right */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Smart‑select */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!projectPath || isSelecting}
                  onClick={onAutoSelect}
                  className="border-teal-300 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400"
                >
                  {isSelecting ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Zap size={18} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Smart‑Select files with Gemma‑3
              </TooltipContent>
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
                  onClick={onShowSettings}
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
};

export default HeaderView;