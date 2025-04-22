// File: views/layout/RightPanelView.tsx
import React from "react";
import { BookOpen, Flame, BarChart2, Coffee, Sparkles, FileCode, Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  return (
    <div className="space-y-6">
      {/* Instructions Card with Glass Morphism */}
      <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(189,147,249)] to-[rgb(255,121,198)]">
            <Terminal size={18} className="text-[rgb(189,147,249)]" />
            Prompt Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-[rgba(22,23,46,0.5)]">
          <InstructionsInputView />
        </CardContent>
      </Card>

      {/* Generate & Copy Card */}
      <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(255,184,108)] to-[rgb(255,121,198)]">
            <Flame size={18} className="text-[rgb(255,184,108)]" />
            Generate & Copy
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-[rgba(22,23,46,0.5)]">
          {hasContent ? (
            <CopyButtonView />
          ) : (
            <div className="p-8 flex flex-col items-center rounded-lg border border-dashed border-[rgba(60,63,87,0.7)] bg-[rgba(15,16,36,0.3)]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[rgba(123,147,253,0.2)] to-[rgba(189,147,249,0.2)] flex items-center justify-center mb-4">
                <Sparkles size={28} className="text-[rgba(190,192,210,0.7)]" />
              </div>
              <p className="text-[rgb(140,143,170)] text-center">
                Select files or add instructions to generate a prompt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card with Modern Design */}
      <Card className="overflow-hidden border-[rgba(60,63,87,0.7)] bg-[rgba(30,31,61,0.7)] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <CardHeader className="py-3 px-4 border-b border-[rgba(60,63,87,0.7)] bg-gradient-to-r from-[rgba(22,23,46,0.9)] to-[rgba(30,31,61,0.9)]">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-[rgb(139,233,253)] to-[rgb(123,147,253)]">
            <BarChart2 size={18} className="text-[rgb(139,233,253)]" />
            Prompt Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 bg-[rgba(22,23,46,0.5)]">
          <div className="space-y-4">
            {/* Files Stat */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(190,192,210)] flex items-center">
                  <FileCode size={14} className="mr-1.5 text-[rgb(123,147,253)]" />
                  Files Selected
                </span>
                <span className="font-mono text-[rgb(224,226,240)]">{selectedFileCount}</span>
              </div>
              <div className="h-2 w-full bg-[rgba(15,16,36,0.5)] rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[rgb(123,147,253)] to-[rgb(139,233,253)] rounded-full"
                  style={{ width: `${Math.min(100, selectedFileCount * 2)}%` }}
                ></div>
              </div>
            </div>

            {/* Tokens Stat */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(190,192,210)] flex items-center">
                  <Terminal size={14} className="mr-1.5 text-[rgb(80,250,123)]" />
                  Total Tokens
                </span>
                <span className="font-mono text-[rgb(224,226,240)]">{totalTokens.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full bg-[rgba(15,16,36,0.5)] rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-[rgb(80,250,123)] to-[rgb(139,233,253)] rounded-full"
                  style={{ width: `${Math.min(100, totalTokens / 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RightPanelView;