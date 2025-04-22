// views/layout/HeaderView.tsx
import React from "react";
import {
  Code,
  Settings,
  Github,
  Zap,
  RefreshCw,
  Terminal,
  ChevronRight,
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
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[rgba(15,16,36,0.85)] border-b border-[rgba(60,63,87,0.6)] shadow-lg">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-[rgb(123,147,253)] to-[rgb(189,147,249)] rounded-xl shadow-[0_0_15px_rgba(123,147,253,0.4)] animate-float">
            <Terminal size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(189,147,249)]">
              Code to Prompt
            </h1>
            <div className="flex items-center text-[rgb(140,143,170)] text-xs">
              <span>Generator</span>
              <ChevronRight size={12} className="mx-1 opacity-70" />
              <span className="text-[rgb(139,233,253)]">v1.2</span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Smart-select */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={!projectPath || isSelecting}
                  onClick={onAutoSelect}
                  className="relative overflow-hidden bg-gradient-to-r from-[rgba(80,250,123,0.9)] to-[rgba(80,250,123,0.9)] hover:from-[rgba(80,250,123,1)] hover:to-[rgba(139,233,253,0.9)] text-[rgb(15,16,36)] font-medium shadow-[0_0_10px_rgba(80,250,123,0.2)] rounded-lg px-4 h-9"
                >
                  {isSelecting ? (
                    <RefreshCw size={18} className="animate-spin mr-2" />
                  ) : (
                    <Zap size={18} className="mr-2" />
                  )}
                  <span>{isSelecting ? "Processing..." : "Smart-Select"}</span>
                  <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_2s_infinite]"></div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass py-2 px-3">
                <p>Smart-Select files with Gemma-3</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onShowSettings}
                  className="rounded-full h-9 w-9 text-[rgb(190,192,210)] hover:bg-[rgba(123,147,253,0.2)] hover:text-[rgb(139,233,253)] transition-all duration-300"
                >
                  <Settings size={20} className="hover-rotate" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass py-2 px-3">
                <p>Settings</p>
              </TooltipContent>
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
                  className="rounded-full h-9 w-9 text-[rgb(190,192,210)] hover:bg-[rgba(189,147,249,0.2)] hover:text-[rgb(189,147,249)] transition-all duration-300"
                >
                  <Github size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="glass py-2 px-3">
                <p>View on GitHub</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};

export default HeaderView;