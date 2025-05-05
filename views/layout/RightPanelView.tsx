// File: views/layout/RightPanelView.tsx
import React from "react";
import { BookOpen, Flame, BarChart2, Coffee, Sparkles, FileCode, Terminal, MessageSquare, HelpCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import InstructionsInputView from "@/views/InstructionsInputView";
import CopyButtonView from "@/views/CopyButtonView";

interface RightPanelViewProps {
  hasContent: boolean;
  selectedFileCount: number;
  totalTokens: number;
}

const RightPanelView: React.FC<RightPanelViewProps> = ({
  hasContent,
  selectedFileCount,
  totalTokens,
}) => {
  // Calculate token percentage for progress bar
  const tokenPercentage = Math.min(100, totalTokens / 100);
  
  return (
    <div className="space-y-8">
      {/* Instructions Card with enhanced glassmorphism */}
      <Card className="overflow-hidden border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-tertiary),0.65)] backdrop-blur-xl shadow-card glass relative">
        {/* Subtle glow effect for active card */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-[rgba(var(--color-tertiary),0.2)] to-transparent rounded-xl opacity-50 blur-xl"></div>
        
        <CardHeader className="py-3 px-4 border-b border-[rgba(var(--color-border),0.6)] bg-gradient-to-r from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-tertiary),0.9)] glass-header relative z-10">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-tertiary))] to-[rgb(var(--color-accent-1))]">
            <div className="p-1.5 rounded-md bg-[rgba(var(--color-tertiary),0.1)] border border-[rgba(var(--color-tertiary),0.2)]">
              <MessageSquare size={18} className="text-[rgb(var(--color-tertiary))]" />
            </div>
            Prompt Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-[rgba(var(--color-bg-secondary),0.3)] relative z-10">
          <InstructionsInputView />
        </CardContent>
      </Card>

      {/* Generate & Copy Card with enhanced effects */}
      <Card className="overflow-hidden border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-tertiary),0.65)] backdrop-blur-xl shadow-card glass relative">
        {/* Subtle glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-[rgba(var(--color-accent-4),0.2)] to-transparent rounded-xl opacity-50 blur-xl"></div>
        
        <CardHeader className="py-3 px-4 border-b border-[rgba(var(--color-border),0.6)] bg-gradient-to-r from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-tertiary),0.9)] glass-header relative z-10">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-accent-4))] to-[rgb(var(--color-accent-1))]">
            <div className="p-1.5 rounded-md bg-[rgba(var(--color-accent-4),0.1)] border border-[rgba(var(--color-accent-4),0.2)]">
              <Flame size={18} className="text-[rgb(var(--color-accent-4))]" />
            </div>
            Generate & Copy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-[rgba(var(--color-bg-secondary),0.3)] relative z-10">
          {hasContent ? (
            <CopyButtonView />
          ) : (
            <div className="p-8 flex flex-col items-center rounded-lg border border-dashed border-[rgba(var(--color-border),0.5)] bg-[rgba(var(--color-bg-primary),0.3)]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[rgba(var(--color-primary),0.15)] to-[rgba(var(--color-tertiary),0.15)] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(var(--color-primary),0.1)] border border-[rgba(var(--color-border),0.3)]">
                <Sparkles size={28} className="text-[rgba(var(--color-text-muted),0.7)]" />
              </div>
              <p className="text-[rgb(var(--color-text-muted))] text-center max-w-xs">
                Select files or add instructions to generate a prompt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card with enhanced design and interactive elements */}
      <Card className="overflow-hidden border-[rgba(var(--color-border),0.7)] bg-[rgba(var(--color-bg-tertiary),0.65)] backdrop-blur-xl shadow-card glass relative">
        {/* Subtle glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-[rgba(var(--color-accent-2),0.2)] to-transparent rounded-xl opacity-50 blur-xl"></div>
        
        <CardHeader className="py-3 px-4 border-b border-[rgba(var(--color-border),0.6)] bg-gradient-to-r from-[rgba(var(--color-bg-secondary),0.9)] to-[rgba(var(--color-bg-tertiary),0.9)] glass-header relative z-10">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-accent-2))] to-[rgb(var(--color-primary))]">
            <div className="p-1.5 rounded-md bg-[rgba(var(--color-accent-2),0.1)] border border-[rgba(var(--color-accent-2),0.2)]">
              <BarChart2 size={18} className="text-[rgb(var(--color-accent-2))]" />
            </div>
            Prompt Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 bg-[rgba(var(--color-bg-secondary),0.3)] relative z-10">
          <div className="space-y-6">
            {/* Files Stat with enhanced styling */}
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[rgb(var(--color-text-secondary))] flex items-center">
                  <div className="p-1 rounded-md bg-[rgba(var(--color-primary),0.1)] mr-2 border border-[rgba(var(--color-primary),0.15)]">
                    <FileCode size={14} className="text-[rgb(var(--color-primary))]" />
                  </div>
                  <span>Files Selected</span>
                </span>
                <span className="font-mono text-[rgb(var(--color-text-primary))] text-lg">
                  {selectedFileCount}
                </span>
              </div>
              <div className="relative h-2.5 w-full bg-[rgba(var(--color-bg-primary),0.5)] rounded-full overflow-hidden">
                {/* Fancy progress bar with animated gradient */}
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${Math.min(100, selectedFileCount * 5)}%`,
                    background: `linear-gradient(90deg, rgb(var(--color-primary)) 0%, rgb(var(--color-accent-2)) 100%)`,
                    boxShadow: "0 0 10px rgba(var(--color-primary), 0.4)"
                  }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-[shimmer_2s_infinite]" style={{transform: "translateX(-100%)"}}></div>
                </div>
              </div>
            </div>

            {/* Tokens Stat with enhanced styling */}
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[rgb(var(--color-text-secondary))] flex items-center">
                  <div className="p-1 rounded-md bg-[rgba(var(--color-secondary),0.1)] mr-2 border border-[rgba(var(--color-secondary),0.15)]">
                    <Terminal size={14} className="text-[rgb(var(--color-secondary))]" />
                  </div>
                  <span>Total Tokens</span>
                </span>
                <span className="font-mono text-[rgb(var(--color-text-primary))] text-lg">
                  {totalTokens.toLocaleString()}
                </span>
              </div>
              <div className="relative h-2.5 w-full bg-[rgba(var(--color-bg-primary),0.5)] rounded-full overflow-hidden">
                {/* Fancy progress bar with animated gradient */}
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${tokenPercentage}%`,
                    background: `linear-gradient(90deg, rgb(var(--color-secondary)) 0%, rgb(var(--color-accent-2)) 100%)`,
                    boxShadow: "0 0 10px rgba(var(--color-secondary), 0.4)"
                  }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-[shimmer_2s_infinite]" style={{transform: "translateX(-100%)"}}></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* Subtle help footer */}
        <CardFooter className="py-2.5 px-4 border-t border-[rgba(var(--color-border),0.3)] bg-[rgba(var(--color-bg-primary),0.3)] text-xs text-[rgb(var(--color-text-muted))] relative z-10">
          <div className="flex items-center space-x-1.5">
            <HelpCircle size={12} className="text-[rgb(var(--color-accent-2))]" />
            <span>Tokens are calculated based on GPT-3.5 tokenization</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RightPanelView;