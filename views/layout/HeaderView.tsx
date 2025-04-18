// views/layout/HeaderView.tsx
import React from "react";
import {
  Code,
  // Sun, // Removed
  // Moon, // Removed
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
  // Removed darkMode and toggleDark props
  // darkMode: boolean;
  // toggleDark: () => void;
  onShowSettings: () => void;
  onAutoSelect: () => void;
  isSelecting: boolean;
  projectPath: string;
}

const HeaderView: React.FC<HeaderViewProps> = ({
  // Removed darkMode, toggleDark from destructuring
  onShowSettings,
  onAutoSelect,
  isSelecting,
  projectPath,
}) => {
  return (
    // Use dark theme styles directly as it's now fixed
    <header className="sticky top-0 z-20 px-6 py-3 shadow-md border-b bg-gray-900/80 backdrop-blur-sm border-gray-800">
      <div className="container mx-auto flex justify-between items-center">
        {/* left */}
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
            <Code size={20} className="text-white" />
          </div>
          {/* Adjusted gradient for dark theme */}
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-400 text-transparent bg-clip-text">
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
                  // Dark theme styles for outline button
                  className="border-teal-800 text-teal-400 hover:bg-teal-900/50 hover:text-teal-300"
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

          {/* theme toggle - REMOVED */}

          {/* settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onShowSettings}
                  // Dark theme styles for ghost button
                  className="rounded-full h-9 w-9 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
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
                   // Dark theme styles for ghost button
                  className="rounded-full h-9 w-9 text-gray-400 hover:bg-gray-700 hover:text-gray-100"
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